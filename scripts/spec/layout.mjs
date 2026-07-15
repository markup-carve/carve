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

import { parseAttrList } from './render.mjs'

export { TIER1 }

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
const LINK_DEF = /^\[([^\]^@][^\]]*)\]:\s+(\S+)(?:\s+"((?:\\"|[^"])*)")?(?:\s.*)?$/
const FOOTNOTE_DEF = /^\[\^([^\]]+)\]:\s*(.*)$/
const ABBR_DEF = /^\*\[([^\]]+)\]:\s+(.+)$/
const CAPTION = /^\^ (.*)$/
const BULLET = /^([ \t]*)([-*])(\{[^}]*\})? (?:\[([ xX_>?-])\] )?(.+)$/
const ORDERED = /^([ \t]*)([0-9]+|[a-z]+|[A-Z]+)([.)])(\{[^}]*\})? (.+)$/
const CONT_MARKER = /^\+[ \t]*$/
// marks a lazily-folded line (PART 9 SS10 I2): always paragraph text, never
// re-classified as structure when an item's content is re-parsed
export const LAZY = '\u0000L\u0000'

// Lines that put the whole document out of the executable subset.
const REFUSERS = [
  [/^\[@/, 'citation definition'],
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

// --- tables (PART 9 SS5) ----------------------------------------------------
// T1: split a row into raw cell segments; an unescaped `|` outside a code
// span separates cells. Returns null when the line is not a row.
function splitRow(line) {
  let s = line
  let rowAttrs = null
  const ra = /\|\{([^}]*)\}[ \t]*$/.exec(s)
  if (ra) {
    // T8: a `{...}` GLUED to the closing pipe is the row attribute block
    rowAttrs = `{${ra[1]}}`
    s = s.slice(0, ra.index + 1)
  }
  if (s[0] !== '|') return null
  const cells = []
  let cur = ''
  let i = 1
  let inCode = 0 // backtick run length of an open code span
  while (i < s.length) {
    const c = s[i]
    if (c === '\\' && s[i + 1] === '|' && !inCode) {
      cur += '\\|'
      i += 2
      continue
    }
    if (c === '`') {
      let run = 1
      while (s[i + run] === '`') run++
      if (!inCode) inCode = run
      else if (inCode === run) inCode = 0
      cur += '`'.repeat(run)
      i += run
      continue
    }
    if (c === '|' && !inCode) {
      cells.push(cur)
      cur = ''
      i++
      continue
    }
    cur += c
    i++
  }
  const trailing = cur.trim() === ''
  if (!trailing) cells.push(cur) // lenient open form: `| a | b`
  if (cells.length === 0) return null // T2: `||` has no cell
  if (cells.length === 1 && cells[0].trim() === '') return null // `||`
  return { cells, rowAttrs, trailing }
}

// T2: does this line interrupt a paragraph as a table row? (strict: both
// a leading AND a trailing pipe)
export function interruptingRow(line) {
  if (!/^\|.*\|[ \t]*$/.test(line)) return false
  return splitRow(line) !== null
}

const COLON_FENCE = /^(:{3,})(.*)$/
const COLON_CLOSER = /^(:{3,})[ \t]*$/
const TIER1 = new Set(['note', 'tip', 'warning', 'danger', 'info', 'success', 'example', 'quote'])

// parse a `:::` opener tail (STRICT, PART 9 SS12): type word, optional
// quoted title, optional [label]; a bare pipe / backslash selects the
// line-block / hard-break block; anything else (inline attrs, digit-first
// type, ...) makes the line an ordinary paragraph line. null = not a fence.
function parseColonOpener(tail) {
  let s = tail
  const out = { type: null, title: null, label: null, mode: 'div' }
  if (/^[ \t]*$/.test(s)) return out // bare generic div
  s = s.replace(/^[ \t]+/, '')
  if (/^\|[ \t]*$/.test(s)) return { ...out, mode: 'line-block' }
  if (/^\\[ \t]*$/.test(s)) return { ...out, mode: 'hardbreaks' }
  const ty = /^([A-Za-z_-][A-Za-z0-9_-]*)/.exec(s)
  if (ty) {
    out.type = ty[1]
    s = s.slice(ty[0].length)
  }
  const qt = /^[ \t]+"([^"]*)"/.exec(s)
  if (qt) {
    out.title = qt[1]
    s = s.slice(qt[0].length)
  }
  const lb = /^[ \t]*\[([^\]]*)\]/.exec(s)
  if (lb) {
    out.label = lb[1]
    s = s.slice(lb[0].length)
  }
  if (!/^[ \t]*$/.test(s)) return null // trailing junk -> paragraph
  if (!out.type && !out.title && out.label === null && tail.trim() !== '') return null
  return out
}

function findColonCloser(lines, openIdx, len) {
  for (let j = openIdx + 1; j < lines.length; j++) {
    const c = COLON_CLOSER.exec(lines[j])
    if (c && c[1].length >= len) return j
  }
  return -1
}

const COMMENT_LINE = /^[ \t]*%%(?!%)/
const COMMENT_FENCE = /^[ \t]*(%{3,})[ \t]*$/

const CONT_ROW = /^\+.*\|[ \t]*$/ // `+` replaces the leading pipe; must close with one
const DELIM_CELL = /^[ \t]*:?-+:?[ \t]*$/

// classify one raw cell segment
function parseCell(seg) {
  const cell = { header: false, align: null, attrs: null, content: '' }
  let s = seg
  if (s.startsWith('=')) {
    cell.header = true
    s = s.slice(1)
  } else if (s.startsWith('\\=')) {
    s = '\\=' + s.slice(2) // literal `=` data cell; unescaped by inline pass
  }
  // glued alignment marker (per-column on a header cell, per-cell on a body
  // cell); a DOUBLED marker aligns and keeps one literal char (corpus 25)
  const am = /^([<>~])/.exec(s)
  if (am) {
    cell.align = am[1] === '<' ? 'left' : am[1] === '>' ? 'right' : 'center'
    s = s.slice(1)
  }
  const at = /^\{([^}]*)\}(?= |$)/.exec(s)
  if (at) {
    cell.attrs = `{${at[1]}}`
    s = s.slice(at[0].length)
  }
  cell.content = s.trim()
  if (cell.attrs && (cell.content === '^' || cell.content === '<')) {
    // T4: there is no attributed span marker - the cell is ordinary content
    // whose literal text includes the braces
    cell.attrs = null
    cell.content = seg.trim()
  }
  return cell
}

// PART 9 SS15: try to read one-or-more attribute blocks starting at
// lines[i] (adjacent blocks on one line merge; one block may wrap lines; a
// blank line inside the braces invalidates). Returns { lists, next } or null.
function tryAttrLine(lines, i) {
  let text = lines[i]
  if (text === undefined || text[0] !== '{') return null
  const lists = []
  let pos = 0
  let li = i
  while (true) {
    // skip whitespace
    while (pos < text.length && (text[pos] === ' ' || text[pos] === '\t')) pos++
    if (pos >= text.length) break
    if (text[pos] !== '{') return null // trailing junk -> not an attr line
    // find the matching close brace, possibly across lines; a `}` inside a
    // quoted value is content, not the closer (corpus 64-6)
    let buf = ''
    let j = pos
    let line = text
    let found = false
    while (!found) {
      let inQuote = false
      let close = -1
      for (let k = j; k < line.length; k++) {
        const ch = line[k]
        if (ch === '\\' && inQuote) {
          k++
          continue
        }
        if (ch === '"') inQuote = !inQuote
        else if (ch === '}' && !inQuote) {
          close = k
          break
        }
      }
      if (close !== -1) {
        buf += line.slice(j, close + 1)
        pos = close + 1
        text = line
        found = true
        break
      }
      buf += line.slice(j) + '\n'
      li++
      if (li >= lines.length || isBlank(lines[li])) return null // A5
      line = lines[li]
      j = 0
    }
    const list = parseAttrList(buf)
    if (list === null) return null // A6: not an attribute list
    lists.push(list)
  }
  if (lists.length === 0) return null
  return { lists, next: li + 1 }
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
  // frontmatter (PART 1): consumed; renders nothing. The closer-lookahead
  // guard: with no closing --- the line is an ordinary thematic break.
  if (lines[0] !== undefined && /^---(\s|[A-Za-z0-9]+\s*$|$)/.test(lines[0])) {
    for (let j = 1; j < lines.length; j++) {
      if (/^---[ \t]*$/.test(lines[j])) {
        lines.splice(0, j + 1)
        break
      }
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
    if (interruptingRow(line)) return true
    {
      const cf = COLON_FENCE.exec(line)
      if (cf && parseColonOpener(cf[2]) && findColonCloser(lines, idx, cf[1].length) !== -1) return true
    }
    const fence = FENCE.exec(line)
    if (fence && hasCloser(lines, idx)) return true // I4
    if (LINK_DEF.test(line) || FOOTNOTE_DEF.test(line) || ABBR_DEF.test(line)) return true // I5
    return false
  }

  const pending = [] // PART 9 SS15: collected attribute lists, float forward
  const flushAttrs = (node) => {
    if (pending.length) {
      node.battrs = (node.battrs ?? []).concat(pending.splice(0))
    }
    return node
  }
  const push = (node) => blocks.push(flushAttrs(node))

  while (i < n) {
    const line = lines[i]
    if (isBlank(line)) {
      i++
      continue
    }
    if (line[0] === '{') {
      const al = tryAttrLine(lines, i)
      if (al) {
        pending.push(...al.lists) // A1/A2: collect, render nothing
        i = al.next
        continue
      }
      // not a valid attribute line: ordinary paragraph content (A6)
    }
    for (const [re, what] of REFUSERS) {
      if (re.test(line)) throw new Refuse(what)
    }

    // --- comments (SS21; invisible) ---
    {
      const cfm = COMMENT_FENCE.exec(line)
      if (cfm) {
        // %%% block: consumed to the EXACT-length closer (the `where`
        // guard: len(close) = len(open); corpus 91 nested fences)
        let j = i + 1
        for (; j < n; j++) {
          const c = COMMENT_FENCE.exec(lines[j])
          if (c && c[1].length === cfm[1].length) break
        }
        if (j >= n) throw new Refuse('unterminated comment block')
        i = j + 1
        continue
      }
      if (COMMENT_LINE.test(line)) {
        i++
        continue
      }
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
        } else if (CONT_MARKER.test(lines[i] ?? '')) {
          // A `+` pull-left block joins the note (SS17). The attached block is
          // a full block, outside the executable subset's footnote model here -
          // refuse rather than approximate (the corpus pins the real output).
          // Checked BEFORE lazy continuation, which would otherwise swallow the
          // bare `+` as paragraph text.
          throw new Refuse('`+` continuation in a footnote definition')
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
      const level = m[1].length
      const strip = (s) => s.replace(/(^|[ \t])%%(?!%).*$/, '').replace(/[ \t]+$/, '')
      const parts = [strip(m[2])]
      i++
      // MULTI-LINE HEADINGS (PART 2): a same-# marker line or a plain text
      // line folds into the heading; a blank line or any block opener ends it
      while (i < n && !isBlank(lines[i])) {
        const cm = HEADING.exec(lines[i])
        if (cm && cm[1].length === level) {
          parts.push(strip(cm[2]))
          i++
          continue
        }
        if (cm) break // different # count: a new heading
        const l = lines[i]
        if (HR.test(l) || FENCE.test(l) || QUOTE.test(l) || BULLET.test(l) || ORDERED.test(l) ||
            COLON_FENCE.test(l) || CAPTION.test(l) || l[0] === '|' || l[0] === '{' ||
            COMMENT_LINE.test(l) || COMMENT_FENCE.test(l)) break
        parts.push(strip(l))
        i++
      }
      push({ t: 'heading', level, text: parts.join('\n') })
      continue
    }

    // --- thematic break (before bullets: `- x` vs `---`) ---
    if (HR.test(line)) {
      push({ t: 'hr' })
      i++
      continue
    }

    // --- fenced code ---
    if ((m = FENCE.exec(line))) {
      const run = m[1]
      const info = parseFenceInfo(m[2])
      if (info && info.lang.startsWith('=')) {
        const close = findCloser(lines, i, run)
        if (close !== -1) {
          push({ t: 'raw', format: info.lang.slice(1), text: lines.slice(i + 1, close).join('\n') })
          i = close + 1
          continue
        }
      }
      const close = info ? findCloser(lines, i, run) : -1
      if (close !== -1) {
        const node = {
          t: 'code',
          lang: info.lang,
          title: info.title,
          text: lines.slice(i + 1, close).join('\n') + (close > i + 1 ? '\n' : ''),
        }
        i = close + 1
        let j = i
        if (j < n && isBlank(lines[j] ?? '') && CAPTION.test(lines[j + 1] ?? '')) j++
        const cap = j < n && lines[j] !== undefined ? CAPTION.exec(lines[j]) : null
        if (cap) {
          node.caption = cap[1] // a captioned code block is a LISTING (SS4)
          i = j + 1
        }
        push(node)
        continue
      }
      if (info) {
        // valid opener, no closer: at BLOCK START the code runs to the end
        // of the container (oracle-verified; corpus 80)
        push({
          t: 'code',
          lang: info.lang,
          title: info.title,
          text: lines.slice(i + 1).join('\n') + '\n',
        })
        i = n
        continue
      }
      // INVALID-FENCE FALLBACK: ordinary paragraph text (the backtick run
      // becomes an inline verbatim span)
    }

    // --- definition lists (:: term / :  def) ---
    if (/^::?[ ]/.test(line) && !/^:::/.test(line)) {
      const node = { t: 'deflist', items: [] }
      while (i < n) {
        let dm
        if ((dm = /^:: (.*)$/.exec(lines[i] ?? ''))) node.items.push({ dt: dm[1].trim() })
        else if ((dm = /^: {2}(.*)$/.exec(lines[i] ?? ''))) node.items.push({ dd: dm[1].trim() })
        // A definition body continues like a list item (SS17): an indented
        // block, or a `+` pull-left block, folds into the `<dd>`. That yields a
        // multi-block `<dd>`, which the inline-only executable subset cannot
        // represent - refuse rather than approximate (the corpus pins the real,
        // loose output for all three engines).
        else if (CONT_MARKER.test(lines[i] ?? ''))
          throw new Refuse('`+` continuation in a definition (multi-block dd)')
        else if (/^ {3,}\S/.test(lines[i] ?? ''))
          throw new Refuse('indented continuation in a definition (multi-block dd)')
        else if (isBlank(lines[i]) && /^ {3,}\S/.test(lines[i + 1] ?? ''))
          throw new Refuse('multi-paragraph definition body (multi-block dd)')
        else break
        i++
      }
      if (node.items.length === 0) throw new Refuse('malformed definition list')
      push(node)
      continue
    }

    // --- colon fences: admonitions / divs / line block / hard-break block
    // (PART 9 SS12, SS23) ---
    {
      const cf = COLON_FENCE.exec(line)
      if (cf) {
        const opener = parseColonOpener(cf[2])
        const close = opener ? findColonCloser(lines, i, cf[1].length) : -1
        if (opener && close !== -1) {
          const body = lines.slice(i + 1, close)
          i = close + 1
          if (opener.mode === 'line-block') {
            push({ t: 'line-block', lines: body })
          } else if (opener.mode === 'hardbreaks') {
            push({ t: 'hardbreaks', children: parseBlocks(body, state, false) })
          } else if (opener.type === 'footnotes') {
            // placement directive: relocates the endnotes section
            if (body.some((l) => !isBlank(l))) throw new Refuse('non-empty ::: footnotes body')
            push({ t: 'footnotes-placement' })
          } else if (opener.type === 'toc') {
            throw new Refuse('::: toc directive')
          } else {
            push({
              t: 'colon-div',
              type: opener.type,
              title: opener.title,
              label: opener.label,
              children: parseBlocks(body, state, false),
            })
          }
          continue
        }
        // invalid opener or no closer: ordinary paragraph text (falls
        // through to the paragraph collector)
      }
    }

    // --- tables (PART 9 SS5) ---
    if (line[0] === '|' && splitRow(line) !== null) {
      const node = { t: 'table', rows: [], caption: undefined }
      while (i < n) {
        const l = lines[i]
        if (l === undefined || isBlank(l)) break
        if (CONT_ROW.test(l)) {
          // T6: continuation row - joins per column onto the row above
          const sr = splitRow('|' + l.slice(1))
          if (!sr) break
          if (node.rows.length === 0) throw new Refuse('table begins with a continuation row')
          const prev = node.rows[node.rows.length - 1]
          if (prev.cells.every((c) => c.header)) break // needs a BODY row (corpus 113)
          sr.cells.forEach((seg, ci) => {
            const add = seg.trim()
            const cell = prev.cells[ci]
            if (add === '' || cell === undefined) return
            if (cell.content === '^' || cell.content === '<') {
              // the joined text belongs to the SPANNING cell (T6); applied
              // after the span walk resolves the marker's origin
              ;(cell.joins ??= []).push(add)
              return
            }
            cell.content += (cell.content ? ' ' : '') + add
          })
          i++
          continue
        }
        const sr = splitRow(l)
        if (!sr) break
        // T7: the GFM delimiter row (second line only; a delimiter-shaped
        // FIRST row disqualifies promotion - the second row is then data)
        if (
          node.rows.length === 1 && sr.cells.every((c) => DELIM_CELL.test(c)) &&
          !node.rows[0].rawCells.every((c) => DELIM_CELL.test(c))
        ) {
          node.rows[0].cells.forEach((c) => (c.header = true))
          node.rows[0].isHead = true
          sr.cells.forEach((seg, ci) => {
            const s = seg.trim()
            const left = s.startsWith(':')
            const right = s.endsWith(':')
            const col = node.rows[0].cells[ci]
            if (!col) return
            if (left && right) col.align = 'center'
            else if (left) col.align = 'left'
            else if (right) col.align = 'right'
          })
          i++
          continue
        }
        const row = { cells: sr.cells.map(parseCell), rawCells: sr.cells, rowAttrs: sr.rowAttrs }
        node.rows.push(row)
        i++
      }
      // native header section: the leading run of all-header rows
      if (node.rows.length && !node.rows[0].isHead) {
        for (const row of node.rows) {
          if (row.cells.every((c) => c.header)) row.isHead = true
          else break
        }
      }
      // caption (SS4; one blank line allowed)
      let j = i
      if (j < n && isBlank(lines[j] ?? '') && CAPTION.test(lines[j + 1] ?? '')) j++
      const cap = j < n && lines[j] !== undefined ? CAPTION.exec(lines[j]) : null
      if (cap) {
        node.caption = cap[1]
        i = j + 1
      }
      push(node)
      continue
    }
    // a stray `+ ... |` line is ordinary paragraph text (corpus 113)

    // --- block quote ---
    if (QUOTE.test(line)) {
      const inner = []
      let openFence = null // run string of a fence opened inside the quote
      let prevBlank = true // fences open only at BLOCK START (I4 otherwise)
      let qOpenPara = false // does the quote currently end in an open paragraph?
      const trackFence = (l) => {
        if (openFence) {
          const c = PURE_FENCE.exec(l)
          if (c && c[1][0] === openFence[0] && c[1].length >= openFence.length) openFence = null
          qOpenPara = false
          return
        }
        const f = FENCE.exec(l)
        const isOpener = !!(f && prevBlank && parseFenceInfo(f[2]))
        if (isOpener) openFence = f[1]
        prevBlank = isBlank(l)
        if (isBlank(l) || HEADING.test(l) || HR.test(l) || isOpener ||
            COLON_FENCE.test(l) || l[0] === '|' || l[0] === '{') qOpenPara = false
        else qOpenPara = true
      }
      while (i < n) {
        const qm = /^> ?(.*)$/.exec(lines[i])
        if (qm) {
          inner.push(qm[1])
          trackFence(qm[1])
          i++
          continue
        }
        if (openFence) break // the innermost open block is verbatim (S2)
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
        if (lines[i] !== undefined && qOpenPara && !isBlank(lines[i]) && !peekInterrupts(i) && !CAPTION.test(lines[i])) {
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
      push(node)
      continue
    }

    // --- lists ---
    if (matchMarker(line)) {
      const before = blocks.length
      i = parseListRun(lines, i, blocks, state, peekInterrupts)
      if (pending.length && blocks.length > before) flushAttrs(blocks[before])
      continue
    }

    if (CONT_MARKER.test(line)) {
      if (inItem) {
        // PART 9 SS17 L4: inside a list item the marker attaches the
        // following flush-left block; consuming the marker line suffices -
        // the next lines parse as their own block
        i++
        continue
      }
      throw new Refuse('stray continuation marker')
    }

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
      if (para.length > 0 && CAPTION.test(lines[i])) break // a caption ends the block (SS4); an orphan `^ ` line is literal text
      if (lines[i][0] === '{' && tryAttrLine(lines, i)) break // SS15 A1 / SS10 I5
      if (COMMENT_LINE.test(lines[i]) || COMMENT_FENCE.test(lines[i])) break // SS10 I5
      if (inItem && CONT_MARKER.test(lines[i])) break // SS17 L4
      if (inItem && para.length > 0 && matchMarker(lines[i])) break // SS24 C3
      if (para.length > 0) {
        // definitions interrupt and are consumed (SS10 I5)
        if (LINK_DEF.test(lines[i]) || FOOTNOTE_DEF.test(lines[i]) || ABBR_DEF.test(lines[i])) break
        if (startsVisibleBlock(lines[i])) break // I1
        if (interruptingRow(lines[i])) break // I1: valid table row
        {
          const cf = COLON_FENCE.exec(lines[i])
          if (cf && parseColonOpener(cf[2]) && findColonCloser(lines, i, cf[1].length) !== -1) break // I1/I4
        }
        const f = FENCE.exec(lines[i])
        if (f && parseFenceInfo(f[2]) && hasCloser(lines, i)) break // I4: interrupts
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
      if (para.length === 1 && (/^!\[[^\]]*\]\([^)]*\)(\{[^}]*\})?$/.test(para[0]) || /^\$\$`.*`$/.test(para[0]))) {
        pnode.caption = cap[1]
        i = j + 1
      }
      // a caption after a non-captionable block stays literal paragraph
      // text (handled by the paragraph collector on the next pass)
    }
    push(pnode)
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
    if (c[1].length < run.length) continue // shorter run: content (the `where` guard)
    return j
  }
  return -1
}

// CODE-FENCE INFO STRING (PART 2): language token, then an optional quoted
// "header", then an optional [label], in that fixed order. Returns
// { lang, title, label } or null on any other shape (INVALID-FENCE
// FALLBACK: the line is not a fence).
function parseFenceInfo(raw) {
  let s = raw.trim()
  const out = { lang: '', title: null, label: null }
  const lm = /^([A-Za-z0-9\-_+#.=/]+)/.exec(s)
  if (lm) {
    out.lang = lm[1]
    s = s.slice(lm[0].length)
  }
  const tm = /^[ \t]*"([^"]*)"/.exec(s)
  if (tm) {
    out.title = tm[1]
    s = s.slice(tm[0].length)
  }
  const lb = /^[ \t]*\[([^\]]*)\]/.exec(s)
  if (lb) {
    out.label = lb[1]
    s = s.slice(lb[0].length)
  }
  if (!/^[ \t]*$/.test(s)) return null
  return out
}

// Parse ONE following flush-left block (for the `+` continuation marker).
function takeOneBlock(lines, start, state) {
  let end = start
  while (end < lines.length && !isBlank(lines[end]) && !CONT_MARKER.test(lines[end]) && !QUOTE.test(lines[end])) end++
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
  if (m && m[3] && m[3].replace(/[{} ]/g, '') !== '' && parseAttrList(m[3]) === null) m = null
  if (m) {
    const { col } = indentCols(m[1])
    return {
      indent: col,
      bullet: m[2],
      attrs: m[3] ?? null, // marker-glued item attribute block (SS15 ext)
      task: m[4],
      text: m[5],
      // the task box is item CONTENT, not marker (PART 9 SS24 C3)
      markerWidth: m[2].length + 1,
    }
  }
  m = ORDERED.exec(line)
  if (m && m[4] && m[4].replace(/[{} ]/g, '') !== '' && parseAttrList(m[4]) === null) m = null
  if (m) {
    const { col } = indentCols(m[1])
    const dialects = classifyOrdered(m[2])
    if (dialects.length === 0) return null
    return {
      indent: col,
      ordered: m[2],
      delim: m[3],
      attrs: m[4] ?? null,
      dialects,
      text: m[5],
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
    if (head.attrs && head.attrs.replace(/[{} ]/g, '') !== '') item.attrs = head.attrs
    if (list.task) item.checked = /^[xX]$/.test(head.task)
    let openPara = true // the marker line's text opens the item paragraph
    i++
    // FIRST-BLOCK form (SS17 L4): a bare `+` as the sole marker-line content
    // opens an item whose body is the following flush-left block(s)
    let attachNext = false
    if (!list.task && head.text.trim() === '+') {
      itemLines.length = 0
      attachNext = true
      openPara = false
    }
    const attachFlushLeft = () => {
      itemLines.push('')
      while (
        i < n && !isBlank(lines[i]) && !CONT_MARKER.test(lines[i]) &&
        !(matchMarker(lines[i])?.indent === baseIndent)
      ) {
        itemLines.push(lines[i])
        i++
      }
      itemLines.push('')
      openPara = false
    }
    if (attachNext) attachFlushLeft()
    while (i < n) {
      const line = lines[i]
      // `+` at the item's MARKER column attaches ONE following flush-left
      // block to this item (SS17 L3/L4)
      if (CONT_MARKER.test(line) && indentCols(line).col === baseIndent) {
        i++
        attachFlushLeft()
        continue
      }
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
          // blank line between ITEMS of this list -> loose (SS17 L1); a
          // following DIFFERENT list is a sibling and loosens nothing
          if (sameAxes(list, nm)) list.tight = false
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
        if (FENCE.test(dedented) || HR.test(dedented) || COLON_FENCE.test(dedented)) openPara = false
        else if (dedented[0] === '|' || CONT_ROW.test(dedented)) openPara = false
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
      if (!nm && openPara && itemLines.length > 0 && !startsVisibleBlock(line) && !interruptingRow(line) && !COLON_FENCE.test(line)) {
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
