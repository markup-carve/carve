/*
 * Executable PART 0: the layout-layer line automaton (grammar.ebnf PART 0
 * S1-S5), plus the block classification it feeds (PART 9 SS10 interruption,
 * SS11 list partition, SS17 tight/loose + continuation marker, SS24 column
 * arithmetic).
 *
 * Contract: parse(src) returns { blocks, linkDefs, footnoteDefs, abbrDefs }
 * or throws Refuse. REFUSE-DON'T-APPROXIMATE: any construct outside the
 * executable subset aborts the whole document, so a successful parse is a
 * full-fidelity claim.
 */

export class Refuse extends Error {
  constructor(reason) {
    super(reason)
    this.refuse = true
  }
}

const HEADING = /^(#{1,6}) (.*)$/
const HR = /^(-{3,}|\*{3,}|_{3,})[ \t]*$/
const FENCE = /^(`{3,}|~{3,})(.*)$/
const PURE_FENCE = /^(`{3,}|~{3,})[ \t]*$/
const QUOTE = /^> ?(.*)$|^>$/
const LINK_DEF = /^\[([^\]^@][^\]]*)\]:\s+(\S+)(?:\s+"((?:\\"|[^"])*)")?\s*$/
const FOOTNOTE_DEF = /^\[\^([^\]]+)\]:\s*(.*)$/
const ABBR_DEF = /^\*\[([^\]]+)\]:\s+(.+)$/
const CAPTION = /^\^ (.*)$/
const BULLET = /^([ \t]*)([-*]) (?:\[([ xX_>?-])\] )?(.+)$/
const ORDERED = /^([ \t]*)([0-9]+|[a-z]+|[A-Z]+)([.)]) (.+)$/
const CONT_MARKER = /^\+[ \t]*$/
// marks a lazily-folded line (PART 9 SS10 I2): always paragraph text, never
// re-classified as structure when an item's content is re-parsed
export const LAZY = '\u0000L\u0000'

// Lines that put the whole document out of the executable subset.
const REFUSERS = [
  [/^[ \t]*\|/, 'table'],
  [/^[ \t]*:::/, 'colon fence'],
  [/^%{2,}/, 'comment'],
  [/^\{/, 'block attribute line'],
  [/^\[@/, 'citation definition'],
  [/^:[: ]/, 'definition list'],
]

// PART 9 SS24 C1: visual column of the first non-indent character.
function indentCols(line) {
  let col = 0
  let i = 0
  for (; i < line.length; i++) {
    const ch = line[i]
    if (ch === ' ') col += 1
    else if (ch === '\t') col = (Math.floor(col / 4) + 1) * 4
    else break
  }
  return { col, rest: line.slice(i) }
}

// Roman numeral helpers for the SS11 N2/N3 ordered dialects.
const ROMAN_CHARS = /^[ivxlcdm]+$/
const ROMAN_VALUES = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }
function romanToInt(s) {
  let total = 0
  const lower = s.toLowerCase()
  for (let i = 0; i < lower.length; i++) {
    const v = ROMAN_VALUES[lower[i]]
    const next = ROMAN_VALUES[lower[i + 1]] ?? 0
    total += v < next ? -v : v
  }
  return total
}
function alphaToInt(s) {
  // single letters only in the executable subset (a..z)
  return s.toLowerCase().charCodeAt(0) - 96
}

// Classify an ordered marker token into candidate dialects.
function classifyOrdered(token) {
  const out = []
  if (/^[0-9]+$/.test(token)) {
    out.push({ dialect: 'decimal', value: parseInt(token, 10) })
    return out
  }
  const lower = token === token.toLowerCase()
  const upper = token === token.toUpperCase()
  if (ROMAN_CHARS.test(token.toLowerCase()) && (lower || upper)) {
    out.push({ dialect: lower ? 'roman' : 'Roman', value: romanToInt(token) })
  }
  if (/^[a-z]$/i.test(token) && (lower || upper)) {
    out.push({ dialect: lower ? 'alpha' : 'Alpha', value: alphaToInt(token) })
  }
  if (token.length > 1 && /^[a-z]+$/i.test(token) && !ROMAN_CHARS.test(token.toLowerCase())) {
    throw new Refuse(`multi-letter non-roman ordered marker: ${token}`)
  }
  return out
}

function isBlank(line) {
  return /^[ \t]*$/.test(line)
}

// A line that begins a VISIBLE block (PART 9 SS10 I1) in the executable
// subset. Fence interruption needs the closer lookahead (I4) - handled by
// the caller which owns the remaining lines.
function startsVisibleBlock(line) {
  return HEADING.test(line) || HR.test(line) || QUOTE.test(line)
}

export function parse(src) {
  const lines = src.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  const state = {
    linkDefs: new Map(),
    footnoteDefs: new Map(),
    abbrDefs: new Map(),
  }
  // frontmatter is out of the executable subset
  if (lines[0] !== undefined && /^---/.test(lines[0])) {
    for (let i = 1; i < lines.length; i++) {
      if (/^---[ \t]*$/.test(lines[i])) throw new Refuse('frontmatter')
    }
  }
  const blocks = parseBlocks(lines, state, true)
  return { blocks, ...state }
}

function parseBlocks(lines, state, top, inItem = false) {
  const blocks = []
  let i = 0
  const n = lines.length

  const peekInterrupts = (idx) => {
    // PART 9 SS10: does lines[idx] interrupt an open paragraph?
    const line = lines[idx]
    if (line === undefined) return false
    if (startsVisibleBlock(line)) return true
    const fence = FENCE.exec(line)
    if (fence && hasCloser(lines, idx)) return true // I4
    if (LINK_DEF.test(line) || FOOTNOTE_DEF.test(line) || ABBR_DEF.test(line)) return true // I5
    return false
  }

  while (i < n) {
    const line = lines[i]
    if (isBlank(line)) {
      i++
      continue
    }
    for (const [re, what] of REFUSERS) {
      if (re.test(line)) throw new Refuse(what)
    }

    // --- definitions (invisible blocks; PART 9 SS10 I5, PART 9R pass 1) ---
    let m
    if ((m = FOOTNOTE_DEF.exec(line))) {
      const label = m[1]
      const bodyLines = [m[2]]
      i++
      // indented continuation (>= 2 spaces), single blank lines allowed
      while (i < n) {
        if (/^ {2,}\S/.test(lines[i])) {
          bodyLines.push(lines[i].replace(/^ {2}/, ''))
          i++
        } else if (isBlank(lines[i]) && /^ {2,}\S/.test(lines[i + 1] ?? '')) {
          bodyLines.push('')
          i++
        } else if (
          !isBlank(lines[i] ?? '') &&
          bodyLines[bodyLines.length - 1] !== '' &&
          !startsVisibleBlock(lines[i]) &&
          !LINK_DEF.test(lines[i]) && !FOOTNOTE_DEF.test(lines[i]) && !ABBR_DEF.test(lines[i]) &&
          !BULLET.test(lines[i]) && !ORDERED.test(lines[i]) && !FENCE.test(lines[i]) &&
          !CAPTION.test(lines[i])
        ) {
          // lazy continuation of the definition's open paragraph (SS16)
          bodyLines.push(lines[i].replace(/^[ \t]+/, ''))
          i++
        } else break
      }
      if (!state.footnoteDefs.has(label)) {
        // FIRST definition wins (PART 9R state)
        state.footnoteDefs.set(label, parseBlocks(bodyLines, state, false))
      }
      continue
    }
    if ((m = ABBR_DEF.exec(line))) {
      const term = m[1]
      if (term === '') throw new Refuse('empty abbreviation term')
      if (!state.abbrDefs.has(term)) state.abbrDefs.set(term, m[2])
      i++
      continue
    }
    if ((m = LINK_DEF.exec(line))) {
      // LAST definition wins (PART 9R state)
      state.linkDefs.set(m[1], { url: m[2], title: m[3]?.replaceAll('\\"', '"') })
      i++
      continue
    }

    // --- headings ---
    if ((m = HEADING.exec(line))) {
      if (!top) throw new Refuse('heading inside a container')
      const level = m[1].length
      const text = m[2].replace(/[ \t]+$/, '')
      const next = lines[i + 1]
      if (next !== undefined && !isBlank(next)) {
        const nm = HEADING.exec(next)
        if (nm && nm[1].length === level) throw new Refuse('multi-line heading folding')
        if (!nm && !HR.test(next) && !FENCE.test(next) && !QUOTE.test(next) && !BULLET.test(next) && !ORDERED.test(next)) {
          throw new Refuse('heading continuation line')
        }
      }
      blocks.push({ t: 'heading', level, text })
      i++
      continue
    }

    // --- thematic break (before bullets: `- x` vs `---`) ---
    if (HR.test(line)) {
      blocks.push({ t: 'hr' })
      i++
      continue
    }

    // --- fenced code ---
    if ((m = FENCE.exec(line))) {
      const run = m[1]
      const info = m[2].trim()
      if (info && !/^[A-Za-z0-9\-_+#./]+$/.test(info)) throw new Refuse('fence info beyond a language token')
      if (info.startsWith('=')) throw new Refuse('raw block')
      const close = findCloser(lines, i, run)
      if (close === -1) throw new Refuse('unterminated fence')
      blocks.push({ t: 'code', lang: info, text: lines.slice(i + 1, close).join('\n') + (close > i + 1 ? '\n' : '') })
      i = close + 1
      continue
    }

    // --- block quote ---
    if (QUOTE.test(line)) {
      const inner = []
      while (i < n) {
        const qm = /^> ?(.*)$/.exec(lines[i])
        if (qm) {
          inner.push(qm[1])
          i++
          continue
        }
        if (lines[i] !== undefined && CONT_MARKER.test(lines[i])) {
          // PART 9 SS17 L4: `+` at column 0 attaches ONE following block
          i++
          const attached = takeOneBlock(lines, i, state)
          // blank separators force the attached lines to parse as their own
          // block instead of lazily folding into the open paragraph
          inner.push('', ...attached.rawMarker, '')
          i = attached.next
          continue
        }
        if (lines[i] !== undefined && !isBlank(lines[i]) && !peekInterrupts(i) && !CAPTION.test(lines[i])) {
          // lazy continuation folds into the open quoted paragraph (SS10 I6)
          inner.push(lines[i])
          i++
          continue
        }
        break
      }
      const children = parseBlocks(inner.filter((l) => l !== ' CONT'), state, false)
      const node = { t: 'quote', children }
      // caption -> <figure><blockquote/><figcaption> (PART 9 SS4)
      let j = i
      if (j < n && isBlank(lines[j]) && CAPTION.test(lines[j + 1] ?? '')) j++
      const cap = j < n ? CAPTION.exec(lines[j]) : null
      if (cap) {
        node.caption = cap[1]
        i = j + 1
      }
      blocks.push(node)
      continue
    }

    // --- lists ---
    const bulletM = BULLET.exec(line)
    const orderedM = !bulletM && ORDERED.exec(line)
    if (bulletM || orderedM) {
      i = parseListRun(lines, i, blocks, state, peekInterrupts)
      continue
    }

    if (CONT_MARKER.test(line)) throw new Refuse('stray continuation marker')
    if (CAPTION.test(line)) throw new Refuse('caption with no attachable block')

    // --- paragraph ---
    const para = []
    while (i < n && !isBlank(lines[i])) {
      if (lines[i].startsWith(LAZY)) {
        para.push(lines[i].slice(LAZY.length).replace(/[ \t]+$/, ''))
        i++
        continue
      }
      for (const [re, what] of REFUSERS) {
        if (re.test(lines[i])) throw new Refuse(`${what} interrupting a paragraph`)
      }
      if (CAPTION.test(lines[i])) break // a caption ends the block (SS4)
      if (inItem && para.length > 0 && matchMarker(lines[i])) break // SS24 C3
      if (para.length > 0) {
        // definitions interrupt and are consumed (SS10 I5)
        if (LINK_DEF.test(lines[i]) || FOOTNOTE_DEF.test(lines[i]) || ABBR_DEF.test(lines[i])) break
        if (startsVisibleBlock(lines[i])) break // I1
        const f = FENCE.exec(lines[i])
        if (f) {
          if (hasCloser(lines, i)) break // I4: interrupts
          throw new Refuse('unterminated fence inside a paragraph')
        }
      }
      para.push(lines[i].replace(/^[ \t]+/, '').replace(/[ \t]+$/, ''))
      i++
    }
    const pnode = { t: 'para', lines: para }
    // image paragraph caption -> figure (PART 9 SS4; one blank line allowed)
    let j = i
    if (j < n && isBlank(lines[j] ?? '') && CAPTION.test(lines[j + 1] ?? '')) j++
    const cap = j < n && lines[j] !== undefined ? CAPTION.exec(lines[j]) : null
    if (cap) {
      if (para.length === 1 && /^!\[[^\]]*\]\([^)]*\)$/.test(para[0])) {
        pnode.caption = cap[1]
        i = j + 1
      } else {
        throw new Refuse('caption after a non-captionable block')
      }
    }
    blocks.push(pnode)
  }
  return blocks
}

function hasCloser(lines, idx) {
  const m = FENCE.exec(lines[idx])
  if (!m) return false
  return findCloser(lines, idx, m[1]) !== -1
}

function findCloser(lines, openIdx, run) {
  const ch = run[0]
  for (let j = openIdx + 1; j < lines.length; j++) {
    const c = PURE_FENCE.exec(lines[j])
    if (!c || c[1][0] !== ch) continue
    if (c[1].length < run.length) throw new Refuse('fence closer shorter than opener') // the `where` guard
    return j
  }
  return -1
}

// Parse ONE following flush-left block (for the `+` continuation marker).
function takeOneBlock(lines, start, state) {
  let end = start
  while (end < lines.length && !isBlank(lines[end]) && !CONT_MARKER.test(lines[end])) end++
  return { rawMarker: lines.slice(start, end), next: end }
}

// --- lists: PART 9 SS11 N1-N3, SS17 L1-L4, SS24 C3/C4 ----------------------
function parseListRun(lines, i, blocks, state, peekInterrupts) {
  const n = lines.length
  while (i < n) {
    const head = matchMarker(lines[i])
    if (!head) break
    const list = {
      t: 'list',
      task: head.task !== undefined,
      bullet: head.bullet,
      ord: null,
      tight: true,
      items: [],
    }
    if (head.ordered) {
      list.ord = { delim: head.delim, dialects: head.dialects }
    }
    i = collectItems(lines, i, list, state)
    finalizeOrdered(list)
    blocks.push(list)
    // a marker-mismatch sibling list continues the run (SS11 N1)
    if (i < n && matchMarker(lines[i])) continue
    break
  }
  return i
}

function matchMarker(line) {
  if (line === undefined) return null
  let m = BULLET.exec(line)
  if (m) {
    const { col } = indentCols(m[1])
    return {
      indent: col,
      bullet: m[2],
      task: m[3],
      text: m[4],
      // the task box is item CONTENT, not marker (PART 9 SS24 C3)
      markerWidth: m[2].length + 1,
    }
  }
  m = ORDERED.exec(line)
  if (m) {
    const { col } = indentCols(m[1])
    const dialects = classifyOrdered(m[2])
    if (dialects.length === 0) return null
    return {
      indent: col,
      ordered: m[2],
      delim: m[3],
      dialects,
      text: m[4],
      markerWidth: m[2].length + m[3].length + 1,
    }
  }
  return null
}

function sameAxes(list, head) {
  // PART 9 SS11 N1: bullet char, ordered dialect+delim, plain-vs-task
  if (list.ord) {
    if (!head.ordered || head.delim !== list.ord.delim) return false
    const heads = new Set(head.dialects.map((d) => d.dialect))
    return list.ord.dialects.some((d) => heads.has(d.dialect))
  }
  if (head.ordered) return false
  if (head.bullet !== list.bullet) return false
  return (head.task !== undefined) === list.task
}

function collectItems(lines, i, list, state) {
  const n = lines.length
  const baseIndent = matchMarker(lines[i]).indent
  while (i < n) {
    const head = matchMarker(lines[i])
    if (!head || head.indent !== baseIndent || !sameAxes(list, head)) break
    if (list.ord && list.items.length > 0) {
      // narrow the dialect set per item (SS11 N2)
      const heads = new Set(head.dialects.map((d) => d.dialect))
      list.ord.dialects = list.ord.dialects.filter((d) => heads.has(d.dialect))
    }
    const contentCol = head.indent + head.markerWidth
    const itemLines = [head.text]
    const item = { }
    if (list.task) item.checked = /^[xX]$/.test(head.task)
    let openPara = true // the marker line's text opens the item paragraph
    i++
    while (i < n) {
      const line = lines[i]
      if (line.startsWith(LAZY)) {
        // a lazy line from an OUTER context propagates to the deepest open
        // paragraph (PART 9 SS10 I2)
        if (!openPara) break
        itemLines.push(line)
        i++
        continue
      }
      if (isBlank(line)) {
        // decide with the NEXT content line
        let j = i + 1
        while (j < n && isBlank(lines[j])) j++
        if (j >= n) { i = j; break }
        const { col } = indentCols(lines[j])
        const nm = matchMarker(lines[j])
        if (nm && nm.indent === baseIndent) {
          // blank line between items -> loose (SS17 L1)
          list.tight = false
          i = j
          break
        }
        if (col >= contentCol && !(nm && nm.indent >= contentCol)) {
          const dedented = dedent(lines[j], contentCol)
          if (QUOTE.test(dedented) || FENCE.test(dedented) || HEADING.test(dedented) || HR.test(dedented)) {
            // sub-BLOCK after a blank: attaches, stays tight (SS17 L2)
            itemLines.push('')
            openPara = false
            i = j
            continue
          }
          // a second PARAGRAPH inside the item -> loose (SS17 L1)
          itemLines.push('')
          list.tight = false
          openPara = true
          i = j
          continue
        }
        if (nm && nm.indent >= contentCol) {
          // sub-list after a blank: attaches, stays tight (SS17 L2)
          itemLines.push('')
          openPara = false
          i = j
          continue
        }
        i = j
        break
      }
      const { col } = indentCols(line)
      const nm = matchMarker(line)
      if (col >= contentCol) {
        const dedented = dedent(line, contentCol)
        itemLines.push(dedented)
        // does the deepest structure now hold an OPEN paragraph that lazy
        // text may fold into? markers open a sub-item paragraph; quotes an
        // open quoted paragraph; fences/breaks close everything (SS10 I2/I6)
        if (FENCE.test(dedented) || HR.test(dedented)) openPara = false
        else if (matchMarker(dedented) || QUOTE.test(dedented)) openPara = true
        else if (!isBlank(dedented)) openPara = true
        i++
        continue
      }
      if (nm && nm.indent <= baseIndent) break // sibling or outer list
      if (nm && nm.indent < contentCol && nm.indent > baseIndent && openPara && itemLines.length > 0) {
        // a marker BELOW the content column folds as lazy item text
        // (PART 9 SS24 C3; list markers never interrupt, SS10 I2)
        itemLines.push(LAZY + line.replace(/^[ \t]+/, ''))
        i++
        continue
      }
      if (!nm && openPara && itemLines.length > 0) {
        // lazy fold into the open item paragraph (SS10 I2 / SS24 C3)
        itemLines.push(LAZY + line.replace(/^[ \t]+/, ''))
        i++
        continue
      }
      break
    }
    item.blocks = parseBlocks(itemLines, state, false, true)
    list.items.push(item)
  }
  return i
}

function dedent(line, cols) {
  // strip `cols` visual columns of indentation (PART 9 SS24 C5)
  let col = 0
  let i = 0
  while (i < line.length && col < cols) {
    if (line[i] === ' ') col += 1
    else if (line[i] === '\t') col = (Math.floor(col / 4) + 1) * 4
    else break
    i++
  }
  return line.slice(i)
}

function finalizeOrdered(list) {
  if (!list.ord) return
  // PART 9 SS11 N3 tie-break already applied by intersection; prefer roman
  // for lone i/I, alpha otherwise
  const ds = list.ord.dialects
  let chosen = ds[0]
  if (ds.length > 1) {
    const first = list.items.length > 0 ? null : null
    const roman = ds.find((d) => d.dialect.toLowerCase() === 'roman')
    const alpha = ds.find((d) => d.dialect.toLowerCase() === 'alpha')
    if (roman && alpha) {
      chosen = roman.value === 1 ? roman : alpha // lone i/I -> roman, else alpha
    }
  }
  const typeMap = { decimal: null, alpha: 'a', Alpha: 'A', roman: 'i', Roman: 'I' }
  list.ord = {
    type: typeMap[chosen.dialect],
    start: chosen.value !== 1 ? chosen.value : null,
  }
}
