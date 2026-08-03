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

// grammar.ebnf PART 26: block containers FLATTEN/refuse rather than crash.
// Bound the block-container recursion (blockquote/list/div/footnote body) so a
// pathologically nested document REFUSES instead of overflowing the JS stack.
const MAX_NESTING_DEPTH = 200

// Content after the marker+space must carry at least one non-ASCII-whitespace
// character: `#  ` / `#   ` (marker + whitespace only) is NOT a heading, exactly
// like a caption. A leading tab is content (`# \tx` is a heading with `\tx`).
const HEADING = /^(#{1,6}) ((?=.*[^ \t\n\r\f]).*)$/
const HR = /^(-{3,}|\*{3,}|_{3,})[ \t]*$/
const FENCE = /^(`{3,}|~{3,})(.*)$/
const PURE_FENCE = /^(`{3,}|~{3,})[ \t]*$/
const QUOTE = /^>(?: (.*)|)$/
const LINK_DEF = /^\[([^\]^@][^\]]*)\]: \s*(\S+)(?:\s+"((?:\\"|[^"])*)")?(?:\s.*)?$/
// The marker line must carry inline content (PART 9 SS16 production:
// `"]:", space, inline_content`); a bare `[^label]:` is an ordinary
// paragraph line (corpus 132).
const FOOTNOTE_DEF = /^\[\^([^\]]+)\]: [ \t]*(\S.*)$/
const ABBR_DEF = /^\*\[([^\]]+)\]: \s*(.+)$/
const CAPTION = /^\^ (.*)$/
// The run after the marker is SPACES ONLY: `-\titem` is a paragraph in every
// engine, so a tab here must not open a list (PART 9 SS11). Its width is the
// item's content column for a non-task bullet.
const BULLET = /^([ \t]*)([-*])(\{[^}]*\})?( +)(?:\[([ xX_>?-])\] )?(.+)$/
// The value is optional before a `.`: a bare `. ` is a decimal marker
// counting from 1 (PART 9 ordered_marker, BARE DOT). A bare `)` is not a
// marker, so the empty alternative is guarded by a lookahead at the dot.
const ORDERED = /^([ \t]*)([0-9]+|[a-z]+|[A-Z]+|(?=\.))([.)])(\{[^}]*\})? (.+)$/
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

// Does this line OPEN an ordered item? `ORDERED` alone answers on shape, and
// its optional attribute block is not validated there - so `.{+a+} text`, whose
// payload yields no attributes, matched as a marker at the boundary checks below
// while `matchMarker` rejected it and parsed the line as prose. The two now
// agree: an abutting block that yields nothing is not part of a marker (§15 A8),
// whatever the marker's value.
function isOrderedMarkerLine(line) {
  const m = ORDERED.exec(line)
  if (!m) return false
  return !(m[4] && m[4].replace(/[{} ]/g, '') !== '' && parseAttrList(m[4]) === null)
}

// Classify an ordered marker token into candidate dialects.
function classifyOrdered(token) {
  const out = []
  // The bare dot has no value to classify: decimal by definition, starting at 1.
  if (token === '') {
    out.push({ dialect: 'decimal', value: 1 })
    return out
  }
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
  // T2: a row CLOSES with a pipe (`standard_row` ends in `'|'`). A line-initial
  // `|` with content dangling after the last pipe is prose, at a block start as
  // much as mid-paragraph -- there is no lenient open form.
  if (cur.trim() !== '') return null
  if (cells.length === 0) return null // T2: `||` has no cell
  if (cells.length === 1 && cells[0].trim() === '') return null // `||`
  return { cells, rowAttrs }
}

// T2: is this line a table row? One test, used both for the §10 I1 paragraph
// interruption and for opening a table at a block start -- a line is a row or
// it is not, and the two answers may never differ (a line the block parser
// builds a table from but the §17 sub-block test calls prose would make an item
// loose AND fill it with a table).
export function isTableRow(line) {
  // splitRow owns the closing-pipe test, so a row whose closing pipe carries a
  // `{...}` attribute block (T8) still qualifies -- the line ends in `}`.
  return line[0] === '|' && splitRow(line) !== null
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
  if (/^[A-Za-z_-]/.test(s)) return null // type words must be separated
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
  const stack = [len]
  for (let j = openIdx + 1; j < lines.length; j++) {
    // A code fence, a raw block and a comment block are OPAQUE: their contents
    // are content, not markup, so a colon fence written inside one closes
    // nothing and opens nothing (carve#450). The span is skipped from the line
    // AFTER its opener, because an opener with no info string is closer-shaped
    // itself and would otherwise end the span where it began.
    const span = opaqueSpanEnd(lines, j)
    if (span !== -1) {
      j = span
      continue
    }
    const c = COLON_CLOSER.exec(lines[j])
    if (c) {
      const closeLen = c[1].length
      if (closeLen === stack[stack.length - 1]) {
        stack.pop()
        if (stack.length === 0) return j
      } else {
        stack.push(closeLen)
      }
      continue
    }
    const o = COLON_FENCE.exec(lines[j])
    if (o && parseColonOpener(o[2]) !== null) stack.push(o[1].length)
  }
  return -1
}

/** The last line of the opaque span opening at `idx`, or -1 if none opens
 *  there. A code fence needs a valid info string and a closer ahead to open at
 *  all (PART 9 SS10 I4); a comment block needs an EXACT-length closer ahead
 *  (SS28), and without one it opens nothing and is a line comment instead. An
 *  unterminated span is not a span, so the caller keeps scanning its lines. */
function opaqueSpanEnd(lines, idx) {
  const line = lines[idx] ?? ''
  const fence = FENCE.exec(line)
  if (fence && parseFenceInfo(fence[2]) !== null) {
    const close = findCloser(lines, idx, fence[1])
    if (close !== -1) return close
  }
  const comment = COMMENT_FENCE.exec(line)
  if (comment) {
    for (let j = idx + 1; j < lines.length; j++) {
      const c = COMMENT_FENCE.exec(lines[j])
      if (c && c[1].length === comment[1].length) return j
    }
  }
  return -1
}

function isColonBlockOpener(line) {
  const cf = COLON_FENCE.exec(line)
  return !!(cf && parseColonOpener(cf[2]) !== null)
}

function isColonParagraphInterrupt(line) {
  return isColonBlockOpener(line) && !COLON_CLOSER.test(line)
}

function bareColonHasFollowingBody(lines, idx) {
  if (!COLON_CLOSER.test(lines[idx] ?? '')) return false
  for (let j = idx + 1; j < lines.length; j++) {
    if (!isBlank(lines[j])) return true
  }
  return false
}

function paraHasInvalidColonOpener(para) {
  return para.some((l) => {
    const cf = COLON_FENCE.exec(l)
    return cf && parseColonOpener(cf[2]) === null
  })
}

function colonInterruptsParagraph(lines, idx, para) {
  if (isColonParagraphInterrupt(lines[idx])) return true
  return bareColonHasFollowingBody(lines, idx) && !paraHasInvalidColonOpener(para)
}

const COMMENT_LINE = /^[ \t]*%%/
// A fence line is DELIMITER + INSIGNIFICANT TAIL (SS28): only the leading run
// of `%` is structural, so `%%% TODO` opens and `%%% end` closes.
const COMMENT_FENCE = /^[ \t]*(%{3,})(.*)$/

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
// A definition-list TERM opener `:: ` (two colons + space; not the `:::` colon
// fence). A `:: term` is a first-class block opener under PART 9 SS24 C3
// (carve#295): it interrupts an open paragraph/item at column 0 and nests at
// the content column, exactly as a heading/quote/fence does. The two-line
// marker means only the TERM line opens the block; the `:  def` line is its
// body, handled by the def-list parser once opened.
// PART 9's MARKER REQUIRES CONTENT applies to `::` as it does to a bullet: a
// marker line carrying only whitespace after the separator is paragraph text,
// and the rule "ignores trailing whitespace" so `::` and `:: ` behave alike.
// Without the `\S`, `:: ` was a paragraph and `::··` a definition list -
// stripping one trailing space changed the structure (carve#512).
const DEFLIST_TERM = /^:: (?=[ \t]*\S)/
function startsVisibleBlock(line) {
  return HEADING.test(line) || HR.test(line) || QUOTE.test(line) || DEFLIST_TERM.test(line)
}

// A sub-BLOCK attached to an open list item after a blank line: it nests and
// leaves the list TIGHT (SS17 L2), unlike a second paragraph, which loosens it
// (SS17 L1). Colon fences and table rows count -- they are blocks, not prose.
function opensSubBlock(line) {
  if (QUOTE.test(line) || HEADING.test(line) || HR.test(line) ||
      isTableRow(line) || DEFLIST_TERM.test(line)) return true
  const f = FENCE.exec(line)
  // an INVALID info string is not a fence at all (PART 2 INVALID-FENCE
  // FALLBACK) -- the line is prose and loosens the item
  if (f) return parseFenceInfo(f[2]) !== null
  return isColonBlockOpener(line)
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
  // blockDepth is transient recursion bookkeeping (see parseBlocks); it must
  // not leak into the parse-result contract { blocks, linkDefs, footnoteDefs,
  // abbrDefs }. It is back to 0 here, so drop it before spreading state.
  delete state.blockDepth
  return { blocks, ...state }
}

// Depth-guarded entry: every block-container recursion re-enters here, so a
// single counter on `state` bounds the nesting uniformly (PART 26). The
// counter is incremented on entry and decremented on exit (try/finally) so
// sibling containers never accumulate depth.
function parseBlocks(lines, state, top, inItem = false) {
  state.blockDepth = (state.blockDepth ?? 0) + 1
  if (state.blockDepth > MAX_NESTING_DEPTH) {
    state.blockDepth--
    throw new Refuse('block nesting exceeds MAX_NESTING_DEPTH')
  }
  try {
    return parseBlocksImpl(lines, state, top, inItem)
  } finally {
    state.blockDepth--
  }
}

function parseBlocksImpl(lines, state, top, inItem = false) {
  const blocks = []
  let i = 0
  const n = lines.length

  const peekInterrupts = (idx) => {
    // PART 9 SS10: does lines[idx] interrupt an open paragraph?
    const line = lines[idx]
    if (line === undefined) return false
    if (startsVisibleBlock(line)) return true
    if (isTableRow(line)) return true
    if (isColonParagraphInterrupt(line) || bareColonHasFollowingBody(lines, idx)) return true
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
        if (j < n) {
          i = j + 1
          continue
        }
        // No matching closer ahead: the opener does NOT open a block (SS28).
        // It degrades to a line comment, so the FOLLOWING blocks still render
        // instead of being swallowed to EOF -- fall through to COMMENT_LINE.
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
      // `pullPending` is set by a `+` marker: the NEXT flush-left line begins a
      // pulled-in block (SS17 L4). It is a distinct signal from an empty body
      // line, so an empty note (`[^a]:`) never swallows the following block.
      let pullPending = false
      // indented continuation (>= 2 spaces), single blank lines allowed
      while (i < n) {
        if (/^ {2,}\S/.test(lines[i])) {
          bodyLines.push(lines[i].replace(/^ {2}/, ''))
          pullPending = false
          i++
        } else if (isBlank(lines[i]) && /^ {2,}\S/.test(lines[i + 1] ?? '')) {
          bodyLines.push('')
          i++
        } else if (CONT_MARKER.test(lines[i] ?? '')) {
          // A `+` pull-left block joins the note (SS17 L4): the following
          // flush-left block folds into the note's <li> as a new block. The
          // blank separator lets parseBlocks start it fresh. Checked BEFORE
          // lazy continuation, which would otherwise swallow the bare `+` as
          // paragraph text.
          bodyLines.push('')
          pullPending = true
          i++
        } else if (pullPending && !isBlank(lines[i] ?? '')) {
          // the whole flush-left block pulled in by the preceding `+` marker
          const end = takePulledBlockEnd(lines, i)
          for (let k = i; k < end; k++) bodyLines.push(lines[k])
          pullPending = false
          i = end
        } else if (
          !isBlank(lines[i] ?? '') &&
          bodyLines[bodyLines.length - 1] !== '' &&
          !startsVisibleBlock(lines[i]) &&
          !LINK_DEF.test(lines[i]) && !FOOTNOTE_DEF.test(lines[i]) && !ABBR_DEF.test(lines[i]) &&
          !BULLET.test(lines[i]) && !isOrderedMarkerLine(lines[i]) && !FENCE.test(lines[i]) &&
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
      i++
      // SINGLE-LINE HEADINGS (PART 2): a heading ends at the newline. Nothing
      // folds into it, so whatever follows simply begins its own block - which
      // is why this is a plain read rather than a loop with a boundary test.
      push({ t: 'heading', level, text: strip(m[2]) })
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
    if (/^::?[ ](?=[ \t]*\S)/.test(line) && !/^:::/.test(line)) {
      const node = { t: 'deflist', items: [] }
      // A plain line that folds (as a lazy continuation) into an open term or
      // the open paragraph of a definition (SS17): not blank, not a visible
      // block, not a definition/list/fence/caption opener.
      const foldablePlain = (cur) =>
        !isBlank(cur) &&
        !startsVisibleBlock(cur) &&
        !LINK_DEF.test(cur) &&
        !FOOTNOTE_DEF.test(cur) &&
        !ABBR_DEF.test(cur) &&
        !BULLET.test(cur) &&
        !isOrderedMarkerLine(cur) &&
        !FENCE.test(cur) &&
        !CAPTION.test(cur)
      const isEntry = (s) => /^::?[ ](?=[ \t]*\S)/.test(s) && !/^:::/.test(s)
      // A definition/term line folded into an open item BELOW its content column
      // arrives LAZY-framed (the item-fold pass at C3). A `:  def` marker is a
      // LENIENT def-list entry: it attaches as a fresh <dd> to its open term even
      // when it lands at or below column 0 (PART 9 §24 C3 def-list exception), so
      // the frame must be stripped before matching entries -- otherwise the framed
      // line is mistaken for a plain continuation and folds into the <dt>.
      const unlazy = (s) => (s.startsWith(LAZY) ? s.slice(LAZY.length) : s)
      while (i < n) {
        const cur0 = unlazy(lines[i] ?? '')
        let dm
        if ((dm = /^:: (?=[ \t]*\S)(.*)$/.exec(cur0))) {
          // term (dt): folds plain wrapped continuation lines so a wrapped term
          // line does not strand its definition. (This used to say "like a
          // heading". A heading ends at its newline and folds nothing; the term
          // is the key half of a key-value entry, and keeps its fold.)
          let dt = dm[1].trim()
          i++
          while (i < n) {
            const cur = lines[i] ?? ''
            if (isEntry(unlazy(cur)) || isBlank(cur) || CONT_MARKER.test(cur) || /^ {3,}\S/.test(cur)) break
            if (!foldablePlain(cur)) break
            // A line folded into an item BELOW its content column arrives here
            // LAZY-prefixed (the item-fold pass at C3). Strip that framing marker
            // AND its dedented residual indent before it joins the term text.
            // A line at or above the content column is NOT framed: its over-indent
            // is meaningful continuation whitespace (the engines preserve it), so
            // leave it intact -- only the LAZY (below-column) branch strips.
            const cc = cur.startsWith(LAZY)
              ? cur.slice(LAZY.length).replace(/^[ \t]+/, '')
              : cur
            dt += '\n' + cc
            i++
          }
          node.items.push({ dt })
          continue
        }
        if ((dm = /^: {2}(.*)$/.exec(cur0))) {
          // definition (dd): collect its full body, then parse it to blocks. A
          // definition body continues like a list item (SS17): lazy
          // continuations, a blank-separated indented paragraph, and a `+`
          // pull-left block (including the first-block `:  +` form) all fold
          // into the <dd>. Feeding the assembled lines to parseBlocks keeps a
          // single paragraph tight and yields a loose multi-block <dd> for the
          // rest -- matching the real output the corpus pins for all engines.
          // (`:  \+` stays a literal `+`, never a marker.)
          const bodyLines = []
          i++
          // `pullPending` marks that a `+` marker (bare or the first-block `:  +`
          // form) opened a pulled-in block: the NEXT flush-left line begins it.
          // This is a distinct signal from an empty definition body, so an empty
          // `:  ` never swallows the following flush-left block.
          let pullPending = CONT_MARKER.test(dm[1].trim())
          if (!pullPending) {
            bodyLines.push(dm[1].replace(/^[ \t]+/, '').replace(/[ \t]+$/, ''))
          }
          while (i < n) {
            const cur = lines[i] ?? ''
            if (isEntry(cur)) break
            if (isBlank(cur)) {
              // a blank before an indented line is an internal paragraph break;
              // otherwise the blank ends this definition body.
              if (/^ {3,}\S/.test(lines[i + 1] ?? '')) { bodyLines.push(''); i++; continue }
              break
            }
            if (CONT_MARKER.test(cur)) {
              // `+` pull-left marker: the following flush-left block joins the
              // <dd>; a blank separator lets parseBlocks start a fresh block.
              bodyLines.push('')
              pullPending = true
              i++
              continue
            }
            if (/^ {3,}\S/.test(cur)) {
              // indented continuation block (dedented by the content margin)
              bodyLines.push(cur.replace(/^ {1,3}/, ''))
              pullPending = false
              i++
              continue
            }
            // flush-left line: either the block pulled in by a preceding `+` /
            // first-block marker, or a lazy continuation of the open paragraph.
            if (pullPending) {
              const end = takePulledBlockEnd(lines, i)
              for (let k = i; k < end; k++) bodyLines.push(lines[k])
              pullPending = false
              i = end
              continue
            }
            if (foldablePlain(cur)) { bodyLines.push(cur.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '')); i++; continue }
            break
          }
          node.items.push({ ddBlocks: bodyLines.length ? parseBlocks(bodyLines, state, false) : [] })
          continue
        }
        if (isBlank(cur0)) {
          // A blank line between entries. A blank before another `:  `/`:: `
          // entry is a separator (djot parity) -- consume it; otherwise it ends
          // the list.
          let look = i + 1
          while (look < n && isBlank(lines[look])) look++
          if (look < n && isEntry(lines[look] ?? '')) {
            i = look
            continue
          }
          break
        }
        break
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
        if (opener) {
          const close = findColonCloser(lines, i, cf[1].length)
          const end = close === -1 ? n : close
          const body = lines.slice(i + 1, end)
          if (close === -1 && body.length > 0 && body.every((l) => isBlank(l) || l.startsWith(LAZY))) {
            // A marker-line opener whose only "body" came from below-content
            // lazy folding did not actually acquire container body lines.
          } else {
            i = close === -1 ? n : close + 1
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
        }
        // invalid opener: ordinary paragraph text (falls through to the
        // paragraph collector)
      }
    }

    // --- tables (PART 9 SS5) ---
    if (isTableRow(line)) {
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
        // PART 1 S4 makes the fold conditional on an OPEN PARAGRAPH, so every
        // block that leaves none clears this. A definition TERM is bounded like
        // a heading (it holds inline content, not a paragraph), and a
        // reference/footnote/abbreviation definition is invisible - it leaves
        // nothing on the page for a lazy line to continue. Both were missing
        // here, exactly as they were missing in carve-js and carve-php
        // (carve-js#554, carve-php#652).
        if (isBlank(l) || HEADING.test(l) || HR.test(l) || isOpener ||
            isColonParagraphInterrupt(l) || l[0] === '|' || l[0] === '{' ||
            DEFLIST_TERM.test(l) || LINK_DEF.test(l) || FOOTNOTE_DEF.test(l) ||
            ABBR_DEF.test(l)) qOpenPara = false
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
      const children = parseBlocks(inner, state, false)
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
        if (isTableRow(lines[i])) break // I1: valid table row
        {
          if (colonInterruptsParagraph(lines, i, para)) break // I1/I4
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

// Extent of the ONE flush-left block a `+` marker pulls into a footnote/<dd>
// (SS17 L4). A fenced code block runs through its matching closer (so its body,
// blanks and closing fence stay inside the container); any other block is the
// maximal contiguous non-blank run up to the next blank or marker. Returns the
// exclusive end index. The caller hands lines[start..end) to parseBlocks, which
// owns the actual block classification.
function takePulledBlockEnd(lines, start) {
  const fm = FENCE.exec(lines[start] ?? '')
  if (fm && parseFenceInfo(fm[2])) {
    const close = findCloser(lines, start, fm[1])
    if (close !== -1) return close + 1
  }
  let end = start
  while (end < lines.length && !isBlank(lines[end]) && !CONT_MARKER.test(lines[end])) end++
  return end
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
    if (head.isOrdered) {
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
    const whitespaceWidth = m[4].length
    return {
      indent: col,
      bullet: m[2],
      attrs: m[3] ?? null, // marker-glued item attribute block (SS15 ext)
      task: m[5],
      text: m[6],
      // The task box is item CONTENT, not marker (PART 9 SS24 C3), so extra
      // spaces before it do not move the item content column.
      markerWidth: m[5] !== undefined ? m[2].length + 1 : m[2].length + whitespaceWidth,
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
      // `ordered` carries the marker TOKEN, which is the empty string for a
      // bare dot - so orderedness is a flag of its own rather than the token's
      // truthiness, or `. a` would classify as a bullet list.
      isOrdered: true,
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
    if (!head.isOrdered || head.delim !== list.ord.delim) return false
    const heads = new Set(head.dialects.map((d) => d.dialect))
    return list.ord.dialects.some((d) => heads.has(d.dialect))
  }
  if (head.isOrdered) return false
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
    let contentCol = head.indent + head.markerWidth
    const itemLines = [head.text]
    const item = { }
    if (head.attrs && head.attrs.replace(/[{} ]/g, '') !== '') item.attrs = head.attrs
    if (list.task) item.checked = /^[xX]$/.test(head.task)
    let openPara = true // the marker line's text opens the item paragraph
    // Content column of the FIRST sub-list opened in this item (-1 = none). A
    // blank followed by content at or past this column belongs to the sub-list,
    // not this item, so a descendant's looseness must not propagate up to this
    // item (carve#322).
    let subCol = -1
    // Open fenced code block (its delimiter run) inside the item's own content,
    // so an interior blank line is verbatim content, not an item-loosening
    // separator (carve#326 C). Only a valid fence opener sets it; its matching
    // closer clears it.
    let fence = null
    {
      // A fence can open on the MARKER LINE (`- ``` `), where its opener is the
      // marker-line content, not a collected continuation line -- seed from it.
      const fo = FENCE.exec(head.text)
      if (fo && parseFenceInfo(fo[2]) !== null) fence = fo[1]
    }
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
        // A blank line INSIDE an open fenced code block is verbatim content:
        // keep it in the item body and stay tight (no looseness decision).
        if (fence) {
          itemLines.push('')
          i++
          continue
        }
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
          if (subCol >= 0 && col >= subCol) {
            // Content at or past the first sub-list's content column belongs to
            // the SUB-LIST, not this item -- a blank inside the sub-list must
            // not loosen this (ancestor) item (carve#322). Attach, stay tight;
            // the recursive parse of itemLines decides the sub-list's looseness.
            itemLines.push('')
            openPara = false
            i = j
            continue
          }
          const dedented = dedent(lines[j], contentCol)
          if (opensSubBlock(dedented)) {
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
        // A continuation BELOW the content column is outside the item body:
        // the list ends and the line parses at document level (PART 9 SS17,
        // content-column model). A block opener recognized only at the item's
        // content column - the item body's column 0 - exactly as a block
        // opener is recognized only at column 0 at the top level; there is no
        // relaxed `baseIndent + 2` channel. (Reaching the content column is
        // what the col >= contentCol branch above already handles; a line that
        // reaches it but carries residual indent is lazy paragraph text, again
        // mirroring the top level.) Falls through to detach below.
        if (nm && nm.indent >= contentCol) {
          // sub-list after a blank: attaches, stays tight (SS17 L2)
          if (subCol < 0) subCol = nm.indent + nm.markerWidth
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
        // Track an open fenced code block (its matching closer clears it) so the
        // blank-line branch above knows an interior blank is fence content.
        if (fence) {
          const c = PURE_FENCE.exec(dedented)
          if (c && c[1][0] === fence[0] && c[1].length >= fence.length) fence = null
        } else {
          const fo = FENCE.exec(dedented)
          if (fo && parseFenceInfo(fo[2]) !== null) fence = fo[1]
        }
        // record the first sub-list's content column (carve#322)
        if (subCol < 0 && nm && nm.indent >= contentCol) subCol = nm.indent + nm.markerWidth
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
      if (!nm && openPara && itemLines.length > 0 && !startsVisibleBlock(line) && !isTableRow(line) && !COLON_FENCE.test(line) && !(FENCE.test(line) && hasCloser(lines, i))) {
        // lazy fold into the open item paragraph (SS10 I2 / SS24 C3). A column-0
        // fence with a closer INTERRUPTS (I4), exactly as a column-0 quote/
        // heading does via startsVisibleBlock -- FENCE only matches at column 0,
        // so an indented (below-content) fence still folds as lazy text.
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
