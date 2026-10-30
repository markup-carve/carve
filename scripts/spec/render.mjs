/*
 * Executable PART 3 (inline, via the Ohm Core grammar), PART 9R (two-pass
 * resolution) and PART 10 (HTML serialization) for the executable subset.
 *
 * Sentinels: footnote references and crossrefs render as ...
 * tokens during the tree pass and are resolved in the PART 9R pass, which
 * owns numbering and the symbol tables.
 */

import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve as presolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ohm from 'ohm-js'
import { MAX_CODE_RUN, Refuse, trimWs } from './layout.mjs'
import { findDirectives, hasInvalidLineRange } from './include-directive.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const coreSource = readFileSync(presolve(here, '../../resources/carve-core.ohm'), 'utf8')
const base = ohm.grammar(coreSource)
// CARVE-P3-025 names general categories Mn, Mc and Me, which Ohm's grammar
// syntax cannot spell, so the placeholder rule is given them here.
base.rules.markChar.body = new ohm.pexprs.Alt(['Mn', 'Mc', 'Me'].map((c) => new ohm.pexprs.UnicodeChar(c)))
// `bareVal` reads to the next stop character from an index, so the blocks of a
// `*{k=x*{k=x...` run do not each rescan the line (PART 9 §9 LINEAR TIME,
// carve#4092). It matches exactly the run `(~(stop) any)+` in carve-core.ohm.
const TerminalNode = ohm.grammar('T { s = "a" }').match('a')._cst.children[0].constructor
let bareValStops = { source: null, next: null }
const bareRun = new ohm.pexprs.Terminal('')
bareRun.eval = function (state) {
  const { inputStream } = state
  const { source, pos } = inputStream
  if (bareValStops.source !== source) {
    const next = new Int32Array(source.length + 1)
    next[source.length] = source.length
    for (let i = source.length - 1; i >= 0; i--) {
      const c = source[i]
      const stop = c === ' ' || c === '\t' || c === '}' || c === '|' || c === '"' || c === "'" || c === '\\' || c === '\n' || (c === '\r' && source[i + 1] === '\n')
      next[i] = stop ? i : next[i + 1]
    }
    bareValStops = { source, next }
  }
  const end = bareValStops.next[pos]
  if (end === pos) {
    state.processFailure(pos, this)
    return false
  }
  inputStream.pos = end
  state.pushBinding(new TerminalNode(end - pos), pos)
  return true
}
base.rules.bareVal.body = bareRun
// A braced opener needs the closer `X}` of its mark, so one with no `X}` after
// it fails without scanning to the end of the block (PART 9 §9 LINEAR TIME).
// The gate only refuses what the production would refuse anyway.
const BRACED_RULES = ['forced<d>', 'fBody<d>', 'edIns', 'edDel', 'edSub', 'edCommentBody', 'edInsBody', 'edDelBody', 'bracedComment']
const core = ohm.grammar(`CarveGated <: ${base.name} {
  closerless = "\\u0000"
  overCap = "\\u0000"
  forcedSpan += overCap
  forcedBody += overCap
${BRACED_RULES.map((rule) => `  ${rule} := ~closerless ${coreSource.match(new RegExp(`^  ${rule.replace('<d>', '<d>')} *= (.*)$`, 'm'))[1]}`).join('\n')}
}`, { [base.name]: base })
// PART 9 §9 LINEAR TIME: a braced opener forms only at the first closer of
// its mark at its level, past the spans formed inside it. Each `X}` pairs with
// the nearest open `{X`; an opener left over is refused. A pair whose
// text could hide a delimiter hands its closer to the openers below.
const NESTING_MARKS = new Set(['/', '*', '_', '~', '^', ',', '='])
// Characters that can start a construct hiding a delimiter (code, math, an
// escape, a link, an autolink, a comment, a line break) or extend one.
const HIDING = /[`$\\[\]<%\n\r\p{M}\u200D\uFE00-\uFE0F]/u
// A code span or bracket run that closes and holds no brace cannot hide a
// closer, so its characters do not count as hiding. Read left to right as the
// atom table reads them; an unclosed code run ends the scan.
function opensExtension(source, at) {
  let j = at
  while (j > 0 && /[A-Za-z0-9_-]/.test(source[j - 1])) j--
  return j < at && source[j - 1] === ':' && /[A-Za-z_]/.test(source[j])
}
function softHiding(source) {
  const soft = new Uint8Array(source.length)
  const braces = [0]
  for (let i = 0; i < source.length; i++) braces.push(braces[i] + (source[i] === '{' || source[i] === '}' ? 1 : 0))
  // An inline extension ends at its first unescaped `]`, so no bracket in it
  // pairs.
  const nextClose = new Int32Array(source.length + 1).fill(-1)
  for (let i = source.length - 1; i >= 0; i--) {
    nextClose[i] = source[i] === ']' && source[i - 1] !== '\\' ? i : nextClose[i + 1]
  }
  const open = []
  for (let i = 0; i < source.length; ) {
    const c = source[i]
    if (c === '\\') {
      i += 2
    } else if (c === '[' && opensExtension(source, i) && nextClose[i] !== -1) {
      i = nextClose[i] + 1
    } else if (c === '`') {
      let n = 1
      while (source[i + n] === '`') n++
      let end = -1
      for (let j = i + n; j < source.length && end === -1; ) {
        let m = 0
        while (source[j + m] === '`') m++
        if (m === n) end = j
        j += m || 1
      }
      if (end === -1) break
      if (braces[end] === braces[i + n]) soft.fill(1, i, end + n)
      i = end + n
    } else if (c === '[') {
      open.push(i++)
    } else if (c === ']') {
      const at = open.pop()
      if (at !== undefined && braces[i] === braces[at] && !'([{'.includes(source[i + 1] ?? '.')) soft[at] = soft[i] = 1
      i++
    } else i++
  }
  return soft
}
// PART 9 §22 DEPTH LIMIT: a braced span past the depth budget left to this run
// is one literal atom, so neither the match nor its semantics recurse into it.
// A closer pairs with the nearest open mark here even where hiding text hands
// it down below, since the recursion to bound is the one the openers would
// start. A repeated editorial opener does not nest: its body ends at the first
// closer.
const OVER_CAP_MARKS = new Set([...NESTING_MARKS, '+', '-'])
function overCapSpans(source, budget) {
  const overCap = new Map()
  const stacks = new Map()
  const pairs = []
  let last = null
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\\') i++
    else if (source[i] === '`') {
      let n = 1
      while (source[i + n] === '`') n++
      const close = source.indexOf('`'.repeat(n), i + n)
      i = close === -1 ? i + n - 1 : close + n - 1
    } else if (source[i] === '{' && OVER_CAP_MARKS.has(source[i + 1])) {
      const mark = source[i + 1]
      if (!stacks.has(mark)) stacks.set(mark, [])
      if (NESTING_MARKS.has(mark) || last !== mark) stacks.get(mark).push(i)
      last = mark
      i++
    } else if (source[i + 1] === '}' && stacks.has(source[i])) {
      const at = stacks.get(source[i]).pop()
      if (at !== undefined) pairs.push([at, i + 2])
      i++
    }
  }
  if (pairs.length < budget) return overCap
  const open = []
  for (const [at, end] of pairs.sort((a, b) => a[0] - b[0])) {
    while (open.length && open.at(-1) <= at) open.pop()
    open.push(end)
    if (open.length >= budget) overCap.set(at, end)
  }
  return overCap
}
let closerIndex = { source: null, budget: 0, unpaired: null, overCap: null, deep: false }
const BRACE_PREWARM_DEPTH = 50
const bracePrewarmed = new WeakSet()
function prewarmBraces(state, from) {
  const { inputStream } = state
  const { source } = inputStream
  const bindings = state._bindings.length
  const rule = new ohm.pexprs.Apply('forcedSpan')
  const scan = new ohm.pexprs.Apply('forcedBody')
  const editorial = new ohm.pexprs.Apply('editorial')
  for (let j = source.lastIndexOf('{'); j > from; j = source.lastIndexOf('{', j - 1)) {
    for (const r of [rule, scan, editorial]) {
      inputStream.pos = j
      state.eval(r)
      state._bindings.length = bindings
      state._bindingOffsets.length = bindings
    }
  }
  inputStream.pos = from
}
const indexClosers = (source) => {
  const budget = MAX_NESTING_DEPTH + 1 - inlineDepth
  if (closerIndex.source !== source || closerIndex.budget !== budget) {
    const stacks = new Map()
    const unpaired = new Set()
    const openers = []
    const last = new Map()
    const soft = softHiding(source)
    const otherBefore = [0]
    for (let i = 0; i < source.length; i++) otherBefore.push(otherBefore[i] + (!soft[i] && HIDING.test(source[i]) ? 1 : 0))
    for (let i = 0; i < source.length; i++) {
      if (source[i] === '{' && source[i - 1] !== '\\') {
        const mark = source[i + 1]
        if (!stacks.has(mark)) stacks.set(mark, [])
        stacks.get(mark).push(i)
        openers.push(i)
      } else if (source[i + 1] === '}' && stacks.has(source[i])) {
        last.set(source[i], i)
        const stack = stacks.get(source[i])
        // An editorial or comment body ends at its first closer.
        if (!NESTING_MARKS.has(source[i])) stack.length = 0
        // An opener this closer overlaps or leaves empty cannot take it.
        while (stack.length && i < stack.at(-1) + 3) stack.pop()
        const at = stack.pop()
        if (at !== undefined && (otherBefore[i] !== otherBefore[at + 2] || (at > 0 && HIDING.test(source[at - 1])))) stack.length = 0
      }
    }
    for (const stack of stacks.values()) for (const at of stack) unpaired.add(at)
    for (const at of openers) if (!((last.get(source[at + 1]) ?? -1) >= at + 2)) unpaired.add(at)
    const overCap = overCapSpans(source, budget)
    for (const at of overCap.keys()) unpaired.add(at)
    closerIndex = { source, budget, unpaired, overCap, deep: overCap.size > 0 || overCapSpans(source, BRACE_PREWARM_DEPTH).size > 0 }
  }
  return closerIndex
}
const closerless = new ohm.pexprs.Terminal('')
closerless.eval = function (state) {
  const { source, pos } = state.inputStream
  if (source[pos] !== '{') {
    state.processFailure(pos, this)
    return false
  }
  const index = indexClosers(source)
  // A deep braced chain is read right to left first, as a deep bracket chain is
  // (`prewarm`), so the depth of the match does not follow the depth of the spans.
  if (index.deep && !bracePrewarmed.has(state)) {
    bracePrewarmed.add(state)
    prewarmBraces(state, pos)
  }
  if (index.unpaired.has(pos)) {
    return ohm.pexprs.Terminal.prototype.eval.call(this, state)
  }
  state.processFailure(pos, this)
  return false
}
core.rules.closerless.body = closerless
const overCap = new ohm.pexprs.Terminal('')
overCap.eval = function (state) {
  const { inputStream } = state
  const { source, pos } = inputStream
  const end = source[pos] === '{' ? indexClosers(source).overCap.get(pos) : undefined
  if (end === undefined) {
    state.processFailure(pos, this)
    return false
  }
  inputStream.pos = end
  state.pushBinding(new TerminalNode(end - pos), pos)
  return true
}
core.rules.overCap.body = overCap
// A combined opener is a stack entry (PART 9 §9 THE COMBINED TOKEN), so the
// `bold_italic` production never matches here: its `/` and `*` reach
// `pairDelims` as candidates.
// A `%%` comment stops before a `*/`, which ends it where it is the closer
// token of a `/*` ... `*/` shape (CARVE-P9-042, carve#4042); `buildToks` marks
// the rest of its line.
// A bracket opener with no `]` after it fails without recursing into the
// openers behind it, so a long run of them stays literal text instead of
// overflowing the stack (PART 9 §25, carve#4134).
const BRACKET_RULES = ['bracketed', 'nested', 'altNested', 'inlineNote']
// A `[` whose nested run fails ends the run around it: the outer scan would go
// on exactly as the inner one did and fail too, so stopping keeps a long chain
// linear (carve#4236). Every use of these rules is followed by `]`.
const CONTENT_RULES = ['brContent', 'altContent']
const g = ohm.grammar(`CarveStack <: ${core.name} {
  codeClosed += codeLong
  codeLong = "\\u0000" "\\u0000" "\\u0000"
  bracketless = "\\u0000"
${BRACKET_RULES.map((rule) => `  ${rule} := ~bracketless ${coreSource.match(new RegExp(`^  ${rule} *= (.*)$`, 'm'))[1]}`).join('\n')}
${CONTENT_RULES.map((rule) => `  ${rule} := ${coreSource.match(new RegExp(`^  ${rule} *= (.*)$`, 'm'))[1].replace('(~"]" any)', '(~"]" ~"[" any)')}`).join('\n')}
  span := ~any any
  spComment := sepRun "%%" (~newline ~"*/" any)*
  fSpComment<d> := sepRun "%%" (~newline ~(d "}") ~"*/" any)*
  escComment := nbspEsc "%%" (~newline ~"*/" any)*
  fEscComment<d> := nbspEsc "%%" (~newline ~(d "}") ~"*/" any)*
  initialComment := ~markupContent "%%" (~newline any)*
  markupContent = ""
}`, { [core.name]: core })
// Insert and delete content is markup INSIDE an inline run, not a run of its
// own, so a `%%` at its start is text (CARVE-P9-041, carve#4178).
let inMarkupContent = false
const markupContent = new ohm.pexprs.Terminal('')
markupContent.eval = function (state) {
  if (inMarkupContent) return ohm.pexprs.Terminal.prototype.eval.call(this, state)
  state.processFailure(state.inputStream.pos, this)
  return false
}
g.rules.markupContent.body = markupContent
let lastCloser = { source: null, at: -1, deep: false }
// A chain of openers that each recurse into the next before one closes
// (carve#4236) is read right to left first, so each opener finds the ones
// behind it memoized and the match stays shallow.
const PREWARM_CHAIN = 100
const PREWARM_RULES = [new ohm.pexprs.Apply('nested'), new ohm.pexprs.Apply('altNested')]
const prewarmed = new WeakSet()
function prewarm(state, from) {
  const { inputStream } = state
  const { source } = inputStream
  const bindings = state._bindings.length
  for (let j = lastCloser.at - 1; j > from; j--) {
    if (source[j] !== '[') continue
    for (const rule of PREWARM_RULES) {
      inputStream.pos = j
      state.eval(rule)
      state._bindings.length = bindings
      state._bindingOffsets.length = bindings
    }
  }
  inputStream.pos = from
}
const bracketless = new ohm.pexprs.Terminal('')
bracketless.eval = function (state) {
  const { source, pos } = state.inputStream
  if (lastCloser.source !== source) {
    lastCloser = { source, at: source.lastIndexOf(']'), deep: bracketNesting(source).chain > PREWARM_CHAIN }
  }
  if (lastCloser.at < pos) return ohm.pexprs.Terminal.prototype.eval.call(this, state)
  if (lastCloser.deep && !prewarmed.has(state)) {
    prewarmed.add(state)
    prewarm(state, pos)
  }
  state.processFailure(pos, this)
  return false
}
g.rules.bracketless.body = bracketless
// A code span whose run is longer than the last `codeRun` tier, closed by the
// next run of exactly its length (PART 3 code_span sets no bound, carve#4134).
// A PEG cannot compare run lengths, so the opener, body and closer read the
// lengths from an index of the source's maximal runs.
let longRuns = { source: null, byLength: null }
let longOpen = 0
const runsOf = (source) => {
  if (longRuns.source !== source) {
    const byLength = new Map()
    for (const m of source.matchAll(/`+/g)) {
      if (m[0].length <= MAX_CODE_RUN) continue
      if (!byLength.has(m[0].length)) byLength.set(m[0].length, [])
      byLength.get(m[0].length).push(m.index)
    }
    longRuns = { source, byLength }
  }
  return longRuns.byLength
}
const codeLongPart = (step) => {
  const part = new ohm.pexprs.Terminal('')
  part.eval = function (state) {
    const { inputStream } = state
    const { source, pos } = inputStream
    const end = step(source, pos)
    if (end === -1) {
      state.processFailure(pos, this)
      return false
    }
    inputStream.pos = end
    state.pushBinding(new TerminalNode(end - pos), pos)
    return true
  }
  // Every part consumes at least one character.
  part._isNullable = () => false
  return part
}
g.rules.codeLong.body = new ohm.pexprs.Seq([
  codeLongPart((source, pos) => {
    let end = pos
    while (source[end] === '`') end++
    if (end - pos <= MAX_CODE_RUN) return -1
    longOpen = end - pos
    return end
  }),
  codeLongPart((source, pos) => {
    const starts = runsOf(source).get(longOpen) ?? []
    let lo = 0
    let hi = starts.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (starts[mid] < pos) lo = mid + 1
      else hi = mid
    }
    return lo < starts.length && starts[lo] > pos ? starts[lo] : -1
  }),
  codeLongPart((_source, pos) => pos + longOpen),
])
// The close of a bracketed run, for the layout pass: the index just past the
// `]` that `brContent*` (or `altContent*` in an image alt) stops at, or -1.
const bracketScan = ohm.grammar(`CarveBracketScan <: ${g.name} {
  labelHead = "[" brContent* "]" any*
  altHead = "[" altContent* "]" any*
}`, { [g.name]: g })
const bracketScanSemantics = bracketScan.createSemantics().addOperation('closeEnd', {
  labelHead: (_open, _content, close, _rest) => close.source.endIdx,
  altHead: (_open, _content, close, _rest) => close.source.endIdx,
})
export function bracketScanEnd(text, slot) {
  const match = bracketScan.match(text, slot === 'alt' ? 'altHead' : 'labelHead')
  return match.succeeded() ? bracketScanSemantics(match).closeEnd() : -1
}
const GRAPHEME_EXTENDER = /^[\p{Mn}\p{Mc}\p{Me}\u{FE00}-\u{FE0F}\u{200D}]/u
// A delimiter followed by one of these is part of a larger character (CARVE-P3-025).
const extendsGrapheme = (src, at) => GRAPHEME_EXTENDER.test(src.slice(at, at + 2))

// Bidi override controls PLUS the pipeline's own PART 9R sentinels
// (U+E000 open, U+E001 close, U+0002 STX field separator). Literal document
// text must never carry these through into the resolution passes, or it would
// be reinterpreted as pipeline framing (spoofed refs/footnotes, JSON.parse).
const STRIP = /[‪-‮⁦-⁩]/g
const STRIP_FRAMES = /[]/g

const escapeMarkup = (s, preserveBidi = false) =>
  s
    .replace(preserveBidi ? STRIP_FRAMES : STRIP, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

// TEXT serializes a no-break space as the entity (PART 9 section 23).
export const escapeHtml = (s) => escapeMarkup(s).replaceAll(' ', '&nbsp;')

// An ATTRIBUTE does not. All three engines write the character itself in
// an attribute value, and both spellings parse to the same id - but the
// corpus compares bytes, so a heading whose text starts with a no-break
// space came out as id="&nbsp;Title" here and id=" Title" everywhere
// else.
export const escapeAttr = (s) => escapeMarkup(s).replaceAll('"', '&quot;').replaceAll("'", '&apos;')
export const escapeUrlAttr = (s) => escapeMarkup(checkUrl(s), true).replaceAll('"', '&quot;').replaceAll("'", '&apos;')
// An authored attribute value keeps a bidi control, as a destination does: the
// hardening probes read this value, so stripping after them could arm it (carve#4472).
const escapeAuthoredAttr = (s) => escapeMarkup(s, true).replaceAll('"', '&quot;').replaceAll("'", '&apos;')

// PART 9 SS25: URL sink scheme denylist -- a denylisted scheme renders an
// EMPTY value. Scheme detection first strips ASCII controls and ALL Unicode
// whitespace before matching, so an obfuscated scheme cannot slip past.
const DENY = new Set(['javascript', 'vbscript', 'data', 'file',
  'ms-msdt', 'ms-office', 'ms-word', 'ms-excel', 'ms-powerpoint', 'ms-access',
  'ms-visio', 'ms-project', 'ms-publisher', 'ms-infopath', 'ms-spd',
  'ms-search', 'search-ms', 'ms-cxh', 'ms-cxh-full', 'shell', 'vscode',
  'vscode-insiders', 'jar'])

/**
 * Resolve the three escapes a link destination has (grammar
 * `destination_escape`). Balanced parentheses are already part of the run and
 * need no unescaping; a backslash before anything else is an ordinary
 * character and is left alone.
 */
const unescapeDest = (text) => text.replace(/\\([()\\])/g, '$1')

export function destValue(dest) {
  return unescapeDest(dest.sourceString)
}

// The `dest` and `destTitle?` nodes of one `destSlot`. The slot is one
// production read from three places (a link tail, an image, the nested-run
// skip in `brContent`), so its two readers take its parts from here rather
// than each spelling the slot's children out again.
const destSlotParts = (slot) => {
  const body = slot.child(1).child(0)
  if (body.ctorName === 'destSlotBody_emptyTitle') {
    return [{ sourceString: '' }, { numChildren: 1, child: () => body.child(0) }]
  }
  if (body.ctorName === 'destSlotBody_empty') {
    return [{ sourceString: '' }, { numChildren: 0 }]
  }
  return [body.child(0), body.child(1)]
}

// A reference definition's destination is the same `link_destination`: its
// value, or null when the run is not one (an unbalanced parenthesis).
export function matchDestination(text) {
  return g.match(text, 'dest').succeeded() ? unescapeDest(text) : null
}

// Is `text` exactly one image, inline or reference form (PART 9 SS4 host)?
export function isImageSource(text) {
  return g.match(text, 'image').succeeded() || g.match(text, 'imageRef').succeeded()
}

export function checkUrl(url) {
  const probe = url.replace(STRIP_FRAMES, '').replace(/[\x00-\x20\x7f-\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/g, '')
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(probe)
  if (m && DENY.has(m[1].toLowerCase())) return ''
  return url
}

// ---------------------------------------------------------------------------
// Inline semantics
function codeText(content) {
  let text = content.sourceString
  if (/^ .* $/s.test(text) && trimWs(text) !== '') text = text.slice(1, -1)
  return text
}
function codeOp(_o, content, _c) {
  return `<code>${escapeHtml(codeText(content))}</code>`
}
// The matched span under a `code` node: a closed `codeRun`, or `codeU`.
const codeInner = (code) => {
  const n = code.child(0)
  return n.ctorName === 'codeClosed' ? n.child(0) : n
}

/*
 * The text of a `quoted_value` (PART 4), shared by both `parseAttrs`
 * operations so the two cannot answer differently.
 *
 * `escaped_char` is a backslash plus ASCII PUNCTUATION, and a backslash before
 * anything else is an ordinary character. Both readers spelled this as "strip a
 * leading backslash from every character node", which is two errors that cancel
 * only on the shapes the corpus happens to hold: `{k='a\b'}` lost the backslash
 * the production keeps, and `{k="a\}b"}` kept the one the production resolves.
 * The grammar carries the other half - `qEsc`/`sqEsc` take the whole escape as
 * one node - so this sees `\}` and not `\` (carve#2581).
 */
const quotedText = (chars) =>
  chars.children.map((c) => c.sourceString.replace(/^\\(?=[!-/:-@[-`{-~])/, '')).join('')

// attribute block -> ordered list of [kind, name, value]
function attrsOf(node) {
  if (node.numChildren === 0) return []
  return node.child(0).parseAttrs()
}

const attrSem = g.createSemantics().addOperation('parseAttrs', {
  attrs(_o, _s1, first, _s2, rest, _s3, _c) {
    return [first.parseAttrs(), ...rest.children.map((c) => c.parseAttrs())]
  },
  attrRun(blocks) {
    return blocks.children.flatMap((b) => b.parseAttrs())
  },
  // Same shape, different separator: `blockAttrs` admits a newline because a
  // standalone attribute LINE may span lines (`block_attributes` in
  // grammar.ebnf), and `attrs` above may not.
  blockAttrs(_o, _s1, first, _s2, rest, _s3, _c) {
    return [first.parseAttrs(), ...rest.children.map((c) => c.parseAttrs())]
  },
  attrItem(item) {
    return item.parseAttrs()
  },
  idAttr(_h, id) {
    return ['id', id.sourceString]
  },
  classAttr(_d, cls) {
    return ['class', cls.sourceString]
  },
  kvAttr(k, _eq, v) {
    return ['kv', k.sourceString, v.parseAttrs()]
  },
  boolAttr(name) {
    return ['bool', name.sourceString]
  },
  // `{:TAG}` DESUGARS HERE and nowhere else: it leaves this action as the
  // ordinary `['kv', 'lang', TAG]` tuple every other `lang=` attribute
  // produces, so the merge below cannot tell the two spellings apart. The
  // empty form `{:}` carries an empty tag and becomes `lang=""`, which is a
  // declaration that the language is unknown rather than an omission - the
  // content stops inheriting a surrounding language.
  langAttr(_c, tag) {
    return ['kv', 'lang', tag.sourceString]
  },
  attrVal(v) {
    return v.parseAttrs()
  },
  quoted(_o, chars, _c) {
    return quotedText(chars)
  },
  // The grammar has allowed `attrVal = quoted | squoted | bareVal` all along,
  // but no marker attribute ever reached here with a single-quoted value: the
  // list-marker regex stopped at the first `}`, so `{title='a}b'}` never
  // parsed. With that fixed the missing action turns into a thrown
  // missingSemanticAction rather than a wrong answer, which is the good
  // failure mode - but it still has to exist.
  squoted(_o, chars, _c) {
    return quotedText(chars)
  },
  bareVal(chars) {
    return chars.sourceString
  },
  _terminal() {
    return this.sourceString
  },
})

/*
 * PART 9 SS25: the four attributes whose value is a LIST of URLs a consumer
 * resolves or fetches. The probe runs on every token AS WELL AS on the whole
 * value, and any hit blanks the WHOLE value, so the same value cannot get one
 * answer in position one and another in position two (carve#1320).
 *
 * THE TOKEN PASS IS ADDITIVE. Dropping the value-wide probe for these four
 * would deny LESS than the leading-scheme rule already denied, because that
 * probe strips the ASCII whitespace the SPLIT breaks on: `java script:alert(1)`
 * is two harmless tokens and one denied value (carve#1329).
 *
 * THE SEPARATORS ARE THE ONES THE ATTRIBUTE'S OWN GRAMMAR USES. `ping` and
 * `attributionsrc` are space-separated sets and hold no commas at all, so
 * splitting them on commas would blank a lone URL that merely contains one.
 * `srcset`/`imagesrcset` are comma-separated candidates, and the comma must
 * count: without it `safe.png 1x,javascript:alert(1) 2x` reads as one token
 * per whitespace run and the second candidate is missed for want of a space.
 *
 * ASCII whitespace and not `\s`, because that is where the grammars put
 * their boundaries: `a<U+202F>javascript:x` is ONE token to the consumer and
 * resolves as a relative URL.
 */
const ASCII_WS = '\\t\\n\\f\\r '
const URL_LIST_SEPARATORS = {
  srcset: new RegExp(`[,${ASCII_WS}]+`),
  imagesrcset: new RegExp(`[,${ASCII_WS}]+`),
  ping: new RegExp(`[${ASCII_WS}]+`),
  attributionsrc: new RegExp(`[${ASCII_WS}]+`),
}
const urlListIsClean = (separator, value) =>
  value.split(separator).every((token) => token === '' || checkUrl(token) !== '')

// PART 9 SS25 ATTRIBUTE HARDENING: drop on*/srcdoc/formaction; drop an
// href/src override whose scheme is denylisted; blank any value whose own
// leading scheme is denylisted, and a URL-list value with a denylisted scheme
// in ANY candidate as well; blank a style value with a CSS execution vector.
const STYLE_VECTOR = /expression\(|url\(|@import|behavior:|-moz-binding/i
function hardenAttr(name, value) {
  const n = name.toLowerCase()
  if (n.startsWith('on') || n === 'srcdoc' || n === 'formaction') return null
  if ((n === 'href' || n === 'src') && checkUrl(value) === '') return null
  if (value !== '' && checkUrl(value) === '') return { name, value: '' }
  const separator = Object.hasOwn(URL_LIST_SEPARATORS, n) ? URL_LIST_SEPARATORS[n] : null
  if (separator && !urlListIsClean(separator, value)) return { name, value: '' }
  if (n === 'style' && STYLE_VECTOR.test(value.replace(STRIP_FRAMES, '').replace(/\s+/g, ''))) return { name, value: '' }
  return { name, value }
}

// Exported for PART 9R R1: a reference link with no definition attributes takes
// this inline path, where a repeated class inside ONE block deduplicates. Only
// the cross-list merge (renderBlockAttrs) accumulates (carve#604).
/*
 * The PART 9R reference frame: `U+E000 ref: <json> U+E001`.
 *
 * The payload must not carry the frame characters RAW. The resolution pass
 * ends a frame at the first `}` that a U+E001 follows, and link text can put
 * one inside the payload - a crossref whose id ends in `}`, an inline note, a
 * nested image reference. The scan then ended the frame early and the raw
 * JSON reached the reader (markup-carve/carve#1195). JSON's own \uXXXX escapes
 * survive JSON.parse unchanged, so spelling those two characters that way
 * costs the consumer nothing and makes the frame unambiguous.
 *
 * U+0002 needs no help here: JSON.stringify already escapes it as a control
 * character. That is exactly why the footnote pass could not see a noteref
 * sitting in a payload, and why PART 9R resolves references FIRST - see the
 * pass order in html.mjs.
 */
export const REF_FRAME = /\uE000ref:(\{[^\uE000\uE001]*?\})\uE001/g

export function refFrame(payload) {
  const json = JSON.stringify(payload).replace(
    /[\uE000\uE001]/g,
    (c) => '\\u' + c.charCodeAt(0).toString(16),
  )
  return `\uE000ref:${json}\uE001`
}

/*
 * Links never nest (PART 3): rendered LINK TEXT carries no inner link, at any
 * depth, so an inner link keeps only its own text content.
 *
 * The caller is what makes this correct. The clause binds a link's text, and
 * the bracket run that spells link text also spells a SPAN's label - a span is
 * not a link, so a link inside its label has nothing to nest into and keeps its
 * destination. Applying this from the bracket rule itself unwrapped the span
 * case too, which no engine does (carve#2578).
 */
export function flattenInnerLinks(text) {
  // A note's content renders in the endnotes, not in the link text, so links
  // inside a note frame keep their destinations (carve#3938).
  const parts = text.split(new RegExp(`(${NOTE_FRAME.source})`))
  if (parts.length > 1) {
    return parts.map((part, i) => i % 3 === 0 ? flattenInnerLinks(part) : i % 3 === 1 ? part : '').join('')
  }
  // An inner crossref flattens to its resolved TEXT; it reaches here as a
  // sentinel because PART 9R resolves it in a later pass.
  let out = text
    .replace(/<a [^>]*>([\s\S]*?)<\/a>/g, '$1')
    .replaceAll('\uE000xref:', '\uE000xreftext:')
  // A REFERENCE link is still a frame here, not an `<a>`, so the unwrap above
  // cannot see it: it has to be flattened by reading the payload's own text.
  // Without this the inner reference resolved after the outer one and nested an
  // `<a>` inside an `<a>`, which no engine emits (markup-carve/carve#1195). An
  // image reference is not a link, so it stays - `<a><img></a>` is what the
  // engines render for that one.
  out = out.replace(REF_FRAME, (m, json) => {
    let parsed
    try {
      parsed = JSON.parse(json)
    } catch {
      return m
    }
    return parsed.img ? m : refFrame({ ...parsed, flat: true })
  })
  return out
}

/*
 * The PART 9R note frame: `U+E000 note: <json> U+E001`.
 *
 * An inline note used to carry a RAW frame - the rendered content, then U+0002,
 * then the rendered attributes - so nothing that renders as a frame of its own
 * could sit inside one. The pass reading the note frame would have ended it at
 * the inner frame's terminator, so this file refused the whole class rather
 * than emit a mis-framed note (markup-carve/carve#1199).
 *
 * The payload is a JSON object for the same reason the reference frame's is,
 * and that is a CHOICE rather than a reuse: the reference frame already had a
 * JSON payload and needed only its escapes fixed, while a note frame has to be
 * given an encoding. Keeping it raw means a second, bespoke escape vocabulary
 * for U+E000, U+E001 and U+0002, with its own unescape at every consumer. JSON
 * escapes U+0002 as a control character on its own, spelling the other two as
 * `\uXXXX` costs the consumer nothing because `JSON.parse` decodes them, and
 * the separator field disappears rather than needing to be protected. One
 * encoding in the pipeline instead of two.
 */
export const NOTE_FRAME = /\uE000note:(\{[^\uE000\uE001]*?\})\uE001/g

export function noteFrame(payload) {
  const json = JSON.stringify(payload).replace(
    /[\uE000\uE001]/g,
    (c) => '\\u' + c.charCodeAt(0).toString(16),
  )
  return `\uE000note:${json}\uE001`
}

/*
 * BOTH PART 9R R2 FRAMES, IN ONE PATTERN.
 *
 * The note frame above, or a labeled reference: `fn:` then the label, the
 * U+0002 separator, then the rendered attributes.
 *
 * R2 numbers both forms from ONE shared document-order counter, so the pass
 * that numbers them has to meet them in the order the document writes them.
 * A single left-to-right `replace` does that; two consecutive ones number by
 * FORM instead, which is what gave an inline note a number ahead of an
 * earlier labeled use (markup-carve/carve#1562).
 *
 * The NOTE branch leads, so a frame-shaped run inside a note's JSON payload is
 * consumed together with the note that carries it - the one property the old
 * note-pass-first ordering was really providing. `json === undefined` tells
 * the consumer which branch matched.
 *
 * Each branch is the pattern its own consumer already used, unchanged. The
 * reference branch is spelled here rather than at the use site so the two
 * frames are declared together, beside the functions that write them, and
 * the note branch is BUILT from `NOTE_FRAME` rather than respelled - two
 * copies of that pattern would be free to drift, and the one nothing reads
 * directly would be the copy that rots.
 */
export const FOOTNOTE_FRAMES = new RegExp(
  `${NOTE_FRAME.source}|\\uE000fn:([\\s\\S]*?)\\u0002(.*?)\\uE001`,
  'g',
)

// CARVE-P4-007: `class=V` is a spelling of the class slot, so it merges with
// `.V` instead of emitting a second `class` attribute. A bare `class` is
// `class=""` under PART 4's boolean rule, so it takes the slot too. The value
// still passes `hardenAttr`, which every key/value does and which blanks a
// class the URL sink check refuses; a blanked or empty value contributes no
// class but still claims the slot.
// A `class=V` value splits on ASCII whitespace into one class per token before
// it joins the list, so the dedup sees tokens (carve#4205); a value with no
// token stays one entry. Each token passes `hardenAttr` on its own.
// A carrier that builds its own class attribute tests the slot with these two,
// or it writes the second attribute the clause exists to remove.
export const classTokens = (a) => {
  if (a[0] === 'class') return [a[1]]
  const raw = a[0] === 'kv' ? a[2] : ''
  const tokens = raw.split(/[\t\n\f\r ]+/).filter((t) => t !== '')
  return (tokens.length ? tokens : [raw]).map((v) => hardenAttr('class', v)?.value ?? '')
}
export const isClass = (a) => a[0] === 'class' || (a[0] !== 'id' && a[1] === 'class')

export function renderAttrs(list, structuralUrl = null) {
  // serialization: SOURCE order; all classes merge (deduplicated, corpus
  // 121) into one class attribute at the position of the FIRST class;
  // a repeated id/key keeps the LAST value at its first position
  const parts = []
  const classes = []
  let classAt = -1
  const seen = new Map() // name -> index in parts
  for (const a of list) {
    if (structuralUrl && (a[0] === 'kv' || a[0] === 'bool') && a[1].toLowerCase() === structuralUrl) continue
    if (isClass(a)) {
      if (classAt === -1) {
        classAt = parts.length
        parts.push(null) // placeholder
      }
      for (const value of classTokens(a)) if (value !== '' && !classes.includes(value)) classes.push(value)
    } else if (a[0] === 'id') {
      if (seen.has('#id')) parts[seen.get('#id')] = ` id="${escapeAuthoredAttr(a[1])}"`
      else {
        seen.set('#id', parts.length)
        parts.push(` id="${escapeAuthoredAttr(a[1])}"`)
      }
    } else if (a[0] === 'kv') {
      const h = hardenAttr(a[1], a[2])
      if (!h) continue
      const value = escapeAuthoredAttr(h.value)
      if (seen.has(a[1])) parts[seen.get(a[1])] = ` ${a[1]}="${value}"`
      else {
        seen.set(a[1], parts.length)
        parts.push(` ${a[1]}="${value}"`)
      }
    } else {
      // A BOOLEAN IS A KEY/VALUE WHOSE VALUE IS EMPTY, so it takes the same
      // slot as `kv` of the same name rather than emitting a second attribute.
      // PART 4 defines `{disabled}` as `disabled=""`, and RENDER ORDER says a
      // repeated key keeps the LAST value at its FIRST position - pushing here
      // unconditionally produced `a="1" a=""`, which is not valid HTML and is
      // not what any engine writes (carve#1123).
      if (!hardenAttr(a[1], '')) continue
      if (seen.has(a[1])) parts[seen.get(a[1])] = ` ${a[1]}=""`
      else {
        seen.set(a[1], parts.length)
        parts.push(` ${a[1]}=""`)
      }
    }
  }
  if (classAt !== -1) parts[classAt] = ` class="${escapeAuthoredAttr(classes.join(' '))}"`
  return parts.join('')
}

// PART 10 §10: compact semantic-span attributes are an HTML rendering sugar
// over the ordinary `span` node.  Keep PHP's established relative order and
// outer span for non-semantic attributes; the authored attribute list remains
// untouched in the AST and source targets.
// PART 9 §9: three names are core - the two that carry data plus `kbd`. The
// other four are the Tier-2 SemanticSpan extension's (§10), and the oracle
// renders the CORE, so they stay ordinary attributes here.
const SEMANTIC_SPAN_ORDER = ['abbr', 'time', 'kbd']
function renderSemanticSpan(text, list) {
  const semantic = new Map()
  const rest = []
  for (const attr of list) {
    const name = attr[0] === 'bool' || attr[0] === 'kv' ? attr[1] : null
    if (name && SEMANTIC_SPAN_ORDER.includes(name)) semantic.set(name, attr[0] === 'kv' ? attr[2] : '')
    else rest.push(attr)
  }
  if (semantic.size === 0) return `<span${renderAttrs(list)}>${text}</span>`

  let html = text
  const outermost = [...SEMANTIC_SPAN_ORDER].reverse().find((name) => semantic.has(name))
  const MAPS_TO = { abbr: 'title', time: 'datetime' }
  for (const name of SEMANTIC_SPAN_ORDER) {
    if (!semantic.has(name)) continue
    const value = semantic.get(name)
    // The mapped attribute is an ordinary key/value in the SAME SLOT an author
    // could have written, so it goes through renderAttrs with the rest rather
    // than being concatenated beside it. Emitting both produced
    // `<abbr title="x" title="y">` for `[x]{abbr="x" title="y"}`; as one list
    // the repeated-key rule decides it - last value, first position - which is
    // what a repeated key does everywhere else in the language.
    const mapped = value !== '' && MAPS_TO[name] ? [['kv', MAPS_TO[name], value]] : []
    // PART 9 §9: leftovers RIDE the outermost semantic element. The span is
    // renamed rather than wrapped, so an authored id or class lands on the
    // element the author wrote it on.
    const own = name === outermost ? [...mapped, ...rest] : mapped
    html = `<${name}${renderAttrs(own)}>${html}</${name}>`
  }
  return html
}

// unclosed run: verbatim to where the run ends, trailing whitespace stripped,
// NO single-space strip
// The strip is PART 2's `whitespace` - a space or a tab - plus the newlines
// the run crossed on its way to the end of the block. `\s` is wider than
// the rule: it holds the no-break space, which every other clause calls
// CONTENT, so a run ending in one silently lost it. The same narrowing
// applies at the math and literal bodies, which share this extraction.
// A line block keeps the run's newlines: they are content, not breaks.
const unclosedBody = (content) => content.sourceString.replace(hardBreaks ? /[ \t]+$/ : /[ \t\n]+$/, '')
function unclosedCode(content) {
  return `<code>${escapeHtml(unclosedBody(content))}</code>`
}

// carve#1442: doubled runs are canonical in both families; the single
// forms are deprecated but still render; `=>` is removed.
const ARROWS = {
  '<-->': '\u2194', '-->': '\u2192', '<--': '\u2190',
  '<=>': '\u21d4', '==>': '\u21d2', '<==': '\u21d0',
  '<->': '\u2194', '->': '\u2192', '<-': '\u2190',
  '!=': '\u2260', '<=': '\u2264', '>=': '\u2265', '+-': '\u00b1',
}
const COMPARISONS = new Set(['!=', '<=', '>='])

const sem = g.createSemantics().addOperation('h', {
  inlines(_initial, items) {
    // The bare single-char emphasis delimiters are NOT resolved by the PEG.
    // Build a flat token stream (leaf HTML fragments + bare-delimiter
    // candidates) and run the PART 9 SS9 delimiter-stack pass over it.
    return resolveEmphasis(
      () => buildToks(items.children, ''),
      this.source.sourceString,
      '',
      this.source.startIdx,
    )
  },
  codeClosed(run) {
    return run.h()
  },
  codeRun: codeOp,
  codeLong: codeOp,
  codeU(_o, _r, content) {
    return unclosedCode(content)
  },
  nl(_n) {
    // A SOFT BREAK, and the only place one is visible AS a break. A newline
    // inside a code span, a math run, a literal or a raw passthrough never
    // reaches here - it is part of that node's own source - which is exactly
    // the distinction a line block needs (markup-carve/carve#1282).
    return hardBreaks ? '<br>\n' : '\n'
  },
  codeA(alt) {
    return alt.h()
  },
  codeAttrd(code, attrs) {
    const a = renderAttrs(attrsOf(attrs))
    if (a === '') return code.h()
    return code.h().replace('<code>', `<code${a}>`)
  },
  mathI(_d, code, attrs) {
    // `code` is the alternation node; its sole child is codeN(_o,content,_c)
    return mathSpan('inline', code, attrs)
  },
  mathD(_d, code, attrs) {
    return mathSpan('display', code, attrs)
  },
  crossref(_o, id, _c) {
    return `xref:${id.sourceString}`
  },
  footnoteRef(_o, label, _c, attrs) {
    const a = renderAttrs(attrsOf(attrs))
    return `fn:${label.sourceString}\u0002${a}`
  },
  inlineNote(_o, content, _c, attrs) {
    // anonymous note: content renders now; numbering happens in PART 9R.
    // SS16 DISABLES footnote recognition inside the content, in both
    // directions, so a nested `^[...]` or `[^ref]` renders as its own literal
    // spelling rather than a note - the flag carries that down the whole
    // subtree, since re-enabling it one level in would make `^[a ^[b ^[c] d] e]`
    // find a note at depth two (markup-carve/carve#1188).
    const saved = noFootnotes
    noFootnotes = true
    let inner
    try {
      inner = renderInline(content.sourceString, '', true)
    } finally {
      noFootnotes = saved
    }
    // A crossref, a reference link or a reference image renders as a frame of
    // its own and reaches here unresolved, because PART 9R resolves them in a
    // later pass. `noteFrame` spells the frame characters as JSON escapes, so
    // an inner frame cannot end this one early, and the content survives to
    // the pass that resolves it (markup-carve/carve#1199).
    const a = renderAttrs(attrsOf(attrs))
    return noteFrame({ content: inner, attrs: a })
  },
  bracketed(_o, content, _c, tail) {
    // link text is FULL inline content; parse the raw source recursively
    const raw = content.sourceString
    let inner = raw === '' ? '' : renderInline(raw, '[')
    if (tail.numChildren === 0) {
      // bare bracketed run: literal (PART 9 SS14), content still parsed
      return `[${inner}]`
    }
    // The never-nest flattening belongs to the tails that PRODUCE a link, not
    // to this rule: the same bracket run is also a span's label, and a span is
    // not a link (PART 3, carve#2578).
    return tail.child(0).applyTail(inner, raw)
  },
  image(_b, _o, alt, _c, slot, attrs) {
    const [dest, title] = destSlotParts(slot)
    const t = title.numChildren ? ` title="${escapeAttr(title.child(0).titleText())}"` : ''
    const a = renderAttrs(attrsOf(attrs), 'src')
    return `<img src="${escapeUrlAttr(destValue(dest))}" alt="${escapeAttr(alt.sourceString.replace(/\\([!-/:-@\[-`{-~])/g, '$1'))}"${t}${a}>`
  },
  imageRef(_b, _o, alt, _c, _ro, label, _rc, attrs) {
    // Same sentinel as a reference LINK, flagged so resolution emits an
    // <img>. The label resolves against the same linkDefs entry and takes
    // url, title and attrs from it (PART 9R R1).
    const lbl = label.numChildren ? label.child(0).sourceString : null
    return refFrame({ label: lbl, alt: alt.sourceString, img: true, attrList: attrsOf(attrs), attrSrc: attrs.sourceString })
  },
  autolink(body, attrs) {
    const raw = body.child(1).sourceString
    const href = /@/.test(raw) && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? `mailto:${raw}` : raw
    const a = renderAttrs(attrsOf(attrs), 'href')
    return `<a href="${escapeUrlAttr(href)}"${a}>${escapeHtml(raw)}</a>`
  },
  escape(_bs, ch) {
    return escapeHtml(ch.sourceString)
  },
  escapedCrossref(_bs, _lt, _prefix, id, _close) {
    return escapeHtml(`</#${id.sourceString}>`)
  },
  nbspEsc(_bs, _sp) {
    return '&nbsp;'
  },
  hardBreak(_bs, _tail) {
    // The rule CONSUMES the newline (PART 3), so this emits it: one line
    // boundary, one break, whether the boundary was spelled with a backslash
    // or not. In a line block that is the whole of PART 9 SS23's A '\\'
    // BREAK IS NOT ADDITIVE - there is no soft break left for the container
    // to harden, so nothing synthesizes a second `<br>`.
    //
    // The newline is emitted even where the rule matched `&end` and there was
    // no newline to consume. PART 10 SS3 states the serialization without a
    // condition on it - "a hard break serializes as `<br>` + newline" - and all
    // three engines write it that way, on a document-final `a\` as much as on
    // one inside a stanza. Making it conditional on the SOURCE made the only
    // shape where the two readings differ - a hard break with nothing after it
    // - the one shape the oracle got wrong, which is where the last body line
    // of a line block lives (PART 11 SS7c).
    return '<br>\n'
  },
  shortcode(_c1, name, _c2) {
    // No symbol map in Core: the literal `:name:` fallback. Consuming it as one
    // token is what keeps smart typography out of the name (`:+-:` stays the
    // symbol `+-`, it does not become `:±:`).
    if (omitSymbols) return ''
    return `:${escapeHtml(name.sourceString)}:`
  },
  symbolAttr(_c1, name, _c2, attrs) {
    // `:name:{...}`: an UNMAPPED symbol renders as its literal `:name:` text,
    // wrapped in a <span> that carries the attribute block (PART 9 §7).
    if (omitSymbols) return ''
    return `<span${renderAttrs(attrs.parseAttrs())}>:${escapeHtml(name.sourceString)}:</span>`
  },
  mention(_a, name, glued) {
    if (!name.sourceString) return escapeHtml(`@${glued.sourceString}`)
    return (
      `<span class="mention"><strong>@${escapeHtml(name.sourceString)}</strong></span>` +
      escapeHtml(glued.sourceString)
    )
  },
  tag(_h, name, glued) {
    if (!name.sourceString) return escapeHtml(`#${glued.sourceString}`)
    return (
      `<span class="tag"><strong>#${escapeHtml(name.sourceString)}</strong></span>` +
      escapeHtml(glued.sourceString)
    )
  },
  forcedSpan(f) {
    return f.h()
  },
  overCap(_range) {
    return escapeHtml(this.sourceString)
  },
  forced(_ob, d, inner, _d2, _cb, attrs) {
    if (inlineDepth >= MAX_NESTING_DEPTH) return escapeHtml(this.sourceString)
    const dch = d.sourceString
    const tag = { '/': 'em', '*': 'strong', _: 'u', '~': 's', '^': 'sup', ',': 'sub', '=': 'mark' }[dch]
    const a = renderAttrs(attrsOf(attrs))
    // A forced `{X ... X}` span emphasizes intraword; nested spans of OTHER
    // delimiters resolve normally, but the forced delimiter X itself stays
    // literal inside (PART 9 SS22). Run the same SS9 stack, holding X literal.
    inlineDepth++
    const body = resolveEmphasis(
      () => buildToks(inner.children, dch),
      this.source.sourceString,
      dch,
      inner.source.startIdx,
      true,
      inner.source.endIdx,
    )
    inlineDepth--
    return `<${tag}${a}>${body}</${tag}>`
  },
  edIns(_o, content, _c, attrs) {
    return `<ins${renderAttrs(attrsOf(attrs))}>${renderInline(content.sourceString, '{', false, true)}</ins>`
  },
  edDel(_o, content, _c, attrs) {
    return `<del${renderAttrs(attrsOf(attrs))}>${renderInline(content.sourceString, '{', false, true)}</del>`
  },
  edSub(_o, oldC, _ar, newC, _c) {
    return `<del>${renderInline(oldC.sourceString, '{', false, true)}</del><ins>${renderInline(newC.sourceString, '{', false, true)}</ins>`
  },
  edComment(body) {
    // CARVE-P2-004: a comment is about the text, not part of it (carve#3899).
    if (omitComments) return ''
    // comment content is verbatim (spaces preserved)
    return `<span class="critic-comment">${escapeHtml(body.child(1).sourceString)}</span>`
  },
  rawInline(code, _ob, fmt, _cb) {
    if (omitRawInline) return ''
    // PART 9 SS20: emitted UNESCAPED for the html format, dropped otherwise
    const text = codeText(codeInner(code).child(1))
    return fmt.sourceString === 'html' ? quoteOpaque(text) : ''
  },
  litInline(span, attrs) {
    const code = span.child(1)
    // PART 9 §27: "!" prefix on a verbatim code span. Content is HTML-ESCAPED,
    // emitted by every renderer and never dropped, with the <code> wrapper
    // removed. Bare text when no attribute block is present; a <span> carrying
    // the attributes when one is. Body extraction mirrors mathSpan (codeU
    // carries its content in a different child slot).
    const inner = codeInner(code)
    const body = escapeHtml(
      inner.ctorName === 'codeU'
        ? unclosedBody(inner.child(2))
        : codeText(inner.child(1)),
    )
    const a = renderAttrs(attrsOf(attrs))
    return a === '' ? body : `<span${a}>${body}</span>`
  },
  extension(_c, name, _o, content, _cl, attrs) {
    const n = name.sourceString
    const inner = renderInline(content.sourceString, '[')
    // PART 10 §9: the fixed semantic registry renders its own element (attrs
    // apply to it); everything else is the generic ext-<name> span.
    // PART 9 §10: the `:name[…]` spelling has NO core handler at all. It is a
    // soft-deprecated compatibility form the SemanticSpan extension accepts,
    // so the core - which is what this oracle renders - gives every name the
    // generic fallback.
    const semantic = new Set()
    if (semantic.has(n)) {
      return `<${n}${renderAttrs(attrsOf(attrs))}>${inner}</${n}>`
    }
    // The base class is a CLASS, not a prefix: it joins the author's class
    // slot rather than being written ahead of everything. Splitting it out and
    // emitting `class="..."` first reordered the author's attributes, so
    // `:widget[x]{#i .c}` lost the id-before-class order PART 10 §1 requires
    // (carve#1164). renderAttrs already merges every class into the FIRST
    // class position, so inserting the base beside the author's first class
    // puts it exactly there; with no class of their own it leads.
    const list = attrsOf(attrs)
    // CARVE-P4-007: `class=V` and a bare `class` are the same slot, so the base
    // class lands beside them too; the tuple test saw only `.V` (carve#2460).
    const firstClass = list.findIndex(isClass)
    const merged = firstClass === -1
      ? [['class', `ext-${n}`], ...list]
      : [...list.slice(0, firstClass), ['class', `ext-${n}`], ...list.slice(firstClass)]
    return `<span${renderAttrs(merged)}>${inner}</span>`
  },
  spComment(_sp, _pp, _rest) {
    return ''
  },
  initialComment(_pp, _rest) {
    return ''
  },
  // `inlineSpace` is a RUN now (see the grammar note), so it emits its own
  // source rather than the one space the rule used to be.
  inlineSpace(run) {
    return run.sourceString
  },
  // Bounded twins (PART 9 SS21a): same emission, a narrower run.
  fSpComment(_sp, _pp, _rest) {
    return ''
  },
  biSpComment(_sp, _pp, _run, _closer) {
    return ''
  },
  escComment(esc, _pp, _rest) {
    return esc.h()
  },
  fEscComment(esc, _pp, _rest) {
    return esc.h()
  },
  biEscComment(esc, _pp, _run, _closer) {
    return esc.h()
  },
  bracedComment(_open, _content, _close) {
    if (readComments.src !== this.source.sourceString) readComments = { src: this.source.sourceString, opens: new Map() }
    readComments.opens.set(this.source.endIdx, this.source.startIdx)
    return ''
  },
  arrow(tok) {
    return ARROWS[tok.sourceString]
  },
  eqArrow(tok, loose) {
    return ARROWS[tok.sourceString] + loose.sourceString
  },
  eqCloseCut(_t, _d, _c, _e) {
    return { '<=': '\u2264', '<': '&lt;', '>': '&gt;', '!': '!' }[this.sourceString]
  },
  symbol(tok) {
    return { '(c)': '\u00a9', '(r)': '\u00ae', '(tm)': '\u2122' }[tok.sourceString]
  },
  ellipsis(_e) {
    return '\u2026'
  },
  bracedDash(_d) {
    // A BRACED HYPHEN PAIR IS AN EN DASH, NOT AN EMPTY DELETION (carve#1447).
    // The bare run carries a flanking guard, so `x --verbose y` is literal and
    // an author who MEANT a dash in that position had no way to say so. `{--}`
    // is that way, and it costs nothing: the string it took was an empty
    // `<del></del>`, which deletes nothing and no author writes.
    return '\u2013'
  },
  dashRun(_a, _b) {
    // PART 9 SS8, carve#1443: a run PRECEDED by whitespace (or nothing) and
    // FOLLOWED by a non-whitespace character is a flag, not a dash, and stays
    // literal. `git log --oneline` rendered `git log –oneline` before this.
    //
    // Only that one shape is excluded, and the narrowness is load-bearing:
    // `a---- b` is word-then-space and DOES convert (corpus
    // 19-smart-typography-dashes-and-quotes-7 pins it), as does a trailing
    // dash on an interrupted clause. Requiring matching sides would have
    // broken both.
    //
    // The space class is PART 7's, NOT the host language's `\s`: a VERTICAL TAB
    // and a FORM FEED are CONTENT in Carve, so `---<VT>` has to answer the way
    // `---!` answers. A NO-BREAK SPACE is included because the question here is
    // "does a space stand before this run", which is the same question quote
    // flanking asks, and a nbsp is a space to the reader.
    {
      const src = this.source.sourceString
      const at = this.source.startIdx
      const end = this.source.endIdx
      const prev = at > 0 ? src[at - 1] : ''
      const next = src[end] ?? ''
      const prevIsSpace = prev === '' || isTypographyFlank(prev)
      const nextIsSpace = next === '' || isTypographyFlank(next)
      if (prevIsSpace && !nextIsSpace) return escapeHtml(this.sourceString)
    }
    // PART 9 SS8: a run of n hyphens -> em/en dash mix (djot allocateDashes):
    // n%3==0 all em; n%2==0 all en; else maximize em-dashes with the remainder
    // as en, where a remainder of 1 trades one em-dash for two en-dashes. Must
    // match carve-js / carve-php exactly (e.g. n=11 -> 3 em + 1 en, not 1 em).
    return dashGlyphs(this.sourceString.length)
  },
  dquote(_q) {
    return smartQuote(this, '\u201c', '\u201d', false)
  },
  squote(_q) {
    return smartQuote(this, '\u2018', '\u2019', true)
  },
  hash(_h) {
    return '#'
  },
  looseAttrs(blocks) {
    // The BRACES are literal, their CONTENTS are inline content. A brace run
    // that attaches to nothing is text (SS15 A7, PART 2 headings), and the
    // text inside it goes on being text - so a `#word` in there is a tag
    // (SS19), which is what all three engines emit. Escaping the whole run
    // rendered `{#id .cls}` verbatim and lost the tag. Block by block, because
    // one interior spanning a run would read the `}{` between two blocks as
    // content (carve#2136).
    return blocks.children
      .map((b) => '{' + renderInline(b.sourceString.slice(1, -1)) + '}')
      .join('')
  },
  word(first, rest) {
    return escapeHtml(this.sourceString)
  },
  _terminal() {
    return escapeHtml(this.sourceString)
  },
  _nonterminal(...ch) {
    return ch.map((c) => c.h()).join('')
  },
  _iter(...ch) {
    return ch.map((c) => c.h()).join('')
  },
})

// tails need the already-rendered link text
sem.addOperation('applyTail(text, source)', {
  linkTail(slot, attrs) {
    const [dest, title] = destSlotParts(slot)
    const text = flattenInnerLinks(this.args.text)
    // A footnote in link text is a §16 LIMITATION, not an unrenderable
    // document: the clause states the outcome ("nests an <a> in an <a>") and
    // advises against writing it. The noteref sentinel travels inside the link
    // text and PART 9R resolves it in place, which is what the reference
    // engines do - and what this pipeline already did for the INLINE note form,
    // whose sentinel this check never named (markup-carve/carve#1188).
    const t = title.numChildren ? ` title="${escapeAttr(title.child(0).titleText())}"` : ''
    const a = renderAttrs(attrsOf(attrs), 'href')
    return `<a href="${escapeUrlAttr(destValue(dest))}"${t}${a}>${text}</a>`
  },
  refTail(_o, label, _c, attrs) {
    const { source } = this.args
    const text = flattenInnerLinks(this.args.text)
    // A footnote in reference link text is the SAME §16 limitation linkTail
    // renders: it nests an `<a>` in an `<a>`, which is what every engine
    // emits for it. It used to be refused here because the frame hid the
    // noteref from the footnote pass; the frame now carries it through
    // (markup-carve/carve#1195).
    const lbl = label.numChildren ? label.child(0).sourceString : null
    // The RAW list travels, not the rendered string: a definition may carry
    // attributes too, and PART 9R R1 merges the two per SS15 A3 - which needs
    // both lists, not two finished strings (carve#604).
    // `source` is the bracket text AS WRITTEN. A collapsed reference is
    // matched by that, not by the rendered text: a decorated label defines a
    // decorated key, and keying on the rendered form both missed that
    // definition and matched a plain one the author never referenced.
    // carve-js and carve-rs key on the written label (carve#648).
    return refFrame({ label: lbl, text, source, attrList: attrsOf(attrs), attrSrc: attrs.sourceString })
  },
  attrs(_o, _s1, _first, _s2, _rest, _s3, _c) {
    const { text } = this.args
    return renderSemanticSpan(text, this.parseAttrs())
  },
  spanRun(_parts) {
    const { text } = this.args
    return renderSemanticSpan(text, this.parseAttrs())
  },
})

// `titleQuoted`/`titleSquoted` rather than the `quoted`/`squoted` an attribute
// value reads: a title crosses a soft wrap and an attribute value does not
// (carve#2566). The two rules take the same action, and having two names for
// them is what keeps the newline on one side of the fork.
sem.addOperation('titleText', {
  destTitle(_sp, q) {
    return q.titleText()
  },
  titleQuoted(_o, chars, _c) {
    return quotedText(chars)
  },
  titleSquoted(_o, chars, _c) {
    return quotedText(chars)
  },
})
sem.addOperation('parseAttrs', {
  attrs(_o, _s1, first, _s2, rest, _s3, _c) {
    return [first.parseAttrs(), ...rest.children.map((c) => c.parseAttrs())]
  },
  // A GLUED RUN IS ONE LIST (CARVE-P4-002, carve#2136). Concatenating in source
  // order is enough: renderAttrs over the flat list is SS15 A3 - classes
  // accumulate and deduplicate at the first class's position, an id or key
  // keeps its last value at its first position - so no second merge is needed.
  attrRun(blocks) {
    return blocks.children.flatMap((b) => b.parseAttrs())
  },
  spanRun(parts) {
    return parts.children.flatMap((p) => p.parseAttrs())
  },
  emptyAttrs(_o, _sp, _c) {
    return []
  },
  looseAttrs(blocks) {
    return blocks.children.flatMap((b) => b.parseAttrs())
  },
  attrItem(item) {
    return item.parseAttrs()
  },
  idAttr(_h, id) {
    return ['id', id.sourceString]
  },
  classAttr(_d, cls) {
    return ['class', cls.sourceString]
  },
  kvAttr(k, _eq, v) {
    return ['kv', k.sourceString, v.parseAttrs()]
  },
  boolAttr(name) {
    return ['bool', name.sourceString]
  },
  // The same desugaring as the `attrSem` copy above. Both operations walk the
  // same `attrItem` rule, so a shorthand handled in one and missing from the
  // other throws `missingSemanticAction` on whichever path reaches it second.
  langAttr(_c, tag) {
    return ['kv', 'lang', tag.sourceString]
  },
  attrVal(v) {
    return v.parseAttrs()
  },
  quoted(_o, chars, _c) {
    return quotedText(chars)
  },
  squoted(_o, chars, _c) {
    return quotedText(chars)
  },
  bareVal(chars) {
    return chars.sourceString
  },
  _terminal() {
    return this.sourceString
  },
  _iter(...ch) {
    return ch.map((c) => c.parseAttrs()).join('')
  },
  _nonterminal(...ch) {
    if (ch.length === 1) return ch[0].parseAttrs()
    return ch.map((c) => c.parseAttrs()).join('')
  },
})

// --- PART 9 SS9 E1-E5 delimiter-stack resolver -----------------------------
// grammar.ebnf PART 9 SS9 specifies emphasis resolution as ONE left-to-right
// pass over the inline stream with a delimiter stack -- O(n), NO backtracking.
// This REPLACES the former backtracking PEG span rules (which re-searched the
// tail for a closer at every opener -> O(n^2) on a run of unclosed openers).
// The Ohm grammar now tokenizes bare `/ * _ ~ =` into `litDelim` candidate
// tokens; this resolver pairs them into spans.
const STACK_DELIMS = new Set(['/', '*', '_', '~', '='])
const TAG = { '/': 'em', '*': 'strong', _: 'u', '~': 's', '=': 'mark' }
// `alnum` in the guard templates below is the grammar header's `letter |
// digit` over PART 7's enumerated ASCII alphabet, so `é` is punctuation to
// these guards: `café*bold*` opens a strong span and `y *x*é` closes one, as
// all three engines read them (carve#2126).
const isAlnum = (c) => c !== undefined && /[A-Za-z0-9]/.test(c)
const isWs = (c) => c === undefined || c === ' ' || c === '\t' || c === '\n' || c === '\r'

// The formal word-boundary guard templates (grammar.ebnf PART 3):
//   bare_opener(d) = <!(alnum | '_' | d | slash_if(d)), d, !(ws | d)
//   bare_closer(d) = <&(non_ws), d, !(alnum)
// END counts as whitespace (a run may not open at end of block); a following
// same delimiter is allowed for a closer (`/x//` -> the first `/` after x
// closes; the trailing `/` stays literal).
// The `'_'` term is the template's own, so it blocks EVERY delimiter, while
// slash_if(d) = '/' for d in { '/', '_' } blocks only italic and underline --
// `* ~ =` do open after `/` (`a/~y~` -> `a/<s>y</s>`).
function bareOpener(d, prev, next) {
  if (prev !== undefined && (isAlnum(prev) || prev === d)) return false
  return !isWs(next) && next !== d
}
// A `_` (or a `/` before `/` or `_`) blocks the opener after it unless that
// guard is an open entry on the stack where the opener stands (`pairDelims`).
function guardedBy(d, prev) {
  return prev === '_' || ((d === '/' || d === '_') && prev === '/')
}
function bareCloser(d, prev, next) {
  return prev !== undefined && !isWs(prev) && (next === undefined || !isAlnum(next))
}

// The `forced` node under an `inline` / `fInner` child, through the wrapper
// rules that carry no other meaning, or null where the child is not one.
function forcedUnder(alt) {
  let n = alt
  while (n.ctorName === 'rich' || n.ctorName === 'forcedSpan') n = n.child(0)
  return n.ctorName === 'forced' ? n : null
}

// E1 CLASSIFY for one candidate.
function classify(t, src) {
  if (t.k !== 'd') return
  const prev = t.at > 0 ? src[t.at - 1] : undefined
  const next = src[t.at + 1]
  if (extendsGrapheme(src, t.at + 1)) {
    t.canOpen = t.canClose = false
    return
  }
  t.canOpen = !t.closeOnly && !(t.ch === '=' && next === '>') && bareOpener(t.ch, prev, next)
  t.canClose = bareCloser(t.ch, prev, next)
}

// Build the flat token stream from a list of CST child nodes (inline* or
// fInner*). A bare `/ * _ ~ =` becomes a delimiter candidate; every other
// alternative renders to an HTML fragment now. `literalDelims` (the enclosing
// span's own delimiters, if any) are held literal rather than made candidates:
// one character for a forced span, both of `/*` for the combined token.
function buildToks(children, literalDelims = '') {
  const toks = []
  // Each token knows its child, so a split combined token can drop the
  // siblings its leading block swallowed.
  let cur = 0
  // The block glued to a held `/`, while its children are being read.
  let held = null
  const push = (...ts) => {
    for (const t of ts) t.ci = cur
    toks.push(...ts)
    if (held) held.blockTo = toks.length
  }
  // A comment cut at a `*/`, and where the line it would run to ends.
  let comment = null
  for (let ci = 0; ci < children.length; ci++) {
    cur = ci
    const c = children[ci]
    if (held && c.source.startIdx >= held.blockEnd) held = null
    if (comment && c.source.startIdx >= comment.lineEnd) {
      comment.tok.tailEnd = toks.length
      comment = null
    }
    const alt = c.child(0)
    const name = alt.ctorName
    if ((name === 'spComment' || name === 'fSpComment' || name === 'escComment' || name === 'fEscComment') && !comment) {
      const src = alt.source.sourceString
      const end = alt.source.endIdx
      if (src.startsWith('*/', end)) {
        const nl = src.indexOf('\n', end)
        const tok = { k: 't', h: name.endsWith('EscComment') || name === 'escComment' ? '&nbsp;' : '', commentAt: end }
        push(tok)
        comment = { tok, lineEnd: nl === -1 ? src.length : nl }
        continue
      }
    }
    const forcedNode = forcedUnder(alt)
    if (forcedNode && STACK_DELIMS.has(forcedNode.child(1).sourceString)) {
      push({
        k: 'f',
        ch: forcedNode.child(1).sourceString,
        node: forcedNode,
        at: alt.source.startIdx,
      })
      continue
    }
    if (name === 'wordSlash') {
      // The word, mention or tag goes through this same loop on its own.
      const head = alt.child(0)
      push(...buildToks([{ child: () => head, h: () => head.h() }], literalDelims))
      const slash = alt.child(1)
      push(literalDelims.includes('/')
        ? { k: 't', h: '/' }
        : { k: 'd', ch: '/', at: slash.source.startIdx })
      continue
    }
    if (name === 'litDelim') {
      const ch = alt.child(0).sourceString
      // Only / * _ ~ = are stack candidates; ^ and , have no bare span.
      if (STACK_DELIMS.has(ch) && !literalDelims.includes(ch)) {
        push({ k: 'd', ch, at: alt.source.startIdx })
      } else {
        push(ownCombined(ch, alt.source.startIdx, literalDelims))
      }
      const loose = alt.child(1).children[0]
      if (loose) {
        // Attaches to the span this delimiter closes; otherwise its literal fallback.
        push({ k: 'attrs', node: loose, at: loose.source.startIdx, h: loose.h(), heldMarker: literalDelims.includes(ch), markerAt: alt.source.startIdx, markerChar: ch })
      }
      continue
    }
    // A construct carrying PART 9 §7's left-boundary condition keeps its
    // offset and its source: the condition is only decidable after the
    // delimiter stack has run (`applyMarkerBoundary`). Inside a span the
    // alternative arrives wrapped in `rich`, as `forcedUnder` also unwraps.
    let marker = alt
    while (marker.ctorName === 'rich') marker = marker.child(0)
    if (marker.ctorName === 'delimRun') {
      for (let offset = 0; offset < marker.sourceString.length; offset++) {
        const ch = marker.sourceString[offset]
        push(STACK_DELIMS.has(ch) && !literalDelims.includes(ch)
          ? { k: 'd', ch, at: marker.source.startIdx + offset }
          : ownCombined(ch, marker.source.startIdx + offset, literalDelims))
      }
      continue
    }
    if (QUOTE_RULES.has(marker.ctorName)) {
      const h = c.h()
      push({ k: 't', h, quote: { at: marker.source.startIdx, record: quoteRun.records.at(-1) } })
      continue
    }
    // An escaped quote renders straight and is what the next quote reads.
    if (marker.ctorName === 'escape' && QUOTE_CHARS.has(marker.child(1).sourceString)) {
      push({ k: 't', h: c.h(), straight: marker.child(1).sourceString })
      continue
    }
    // The `=` ending a typographic arrow may close a bare highlight instead
    // (PART 8: emphasis ranks above smart typography); `resolveArrowCuts`
    // gives it back to the arrow when it closes nothing.
    if (marker.ctorName === 'eqArrow') {
      const tok = marker.child(0)
      const raw = tok.sourceString
      const t = { k: 't', h: ARROWS[raw], raw, arrowCuts: [], end: tok.source.endIdx }
      push(t)
      const loose = marker.child(1).children[0]
      const held = literalDelims.includes('=')
      const attrs = loose && { k: 'attrs', node: loose, at: loose.source.startIdx, h: loose.h(), heldMarker: held, markerAt: tok.source.endIdx - 1, markerChar: '=' }
      // Each `=` may close; the first that does splits the arrow. The `=` of a
      // comparison is part of the symbol and never closes (PART 9 §9).
      const cuttable = !held && !COMPARISONS.has(raw)
      for (let k = 0; cuttable && k < raw.length; k++) {
        if (raw[k] !== '=') continue
        const cut = { k: 'd', ch: '=', at: tok.source.startIdx + k, closeOnly: true, ofArrow: t, idx: k, seg: { k: 't', h: '' } }
        t.arrowCuts.push(cut)
        push(cut)
        // The block rides on the closer only when the closer ends the arrow.
        if (attrs && k === raw.length - 1) push(attrs)
        push(cut.seg)
      }
      if (attrs && (!cuttable || raw.at(-1) !== '=')) push(attrs)
      continue
    }
    if (MARKER_RULES.has(marker.ctorName)) {
      const at = marker.source.startIdx
      const t = { k: 't', h: c.h(), at, raw: marker.sourceString, full: marker.sourceString }
      push(t)
      if (NAME_RULES.has(marker.ctorName)) {
        // The name's own `_` characters, plus the one `tagChar` gave up so a
        // forced underline could close (`{_@ex_}`), reach the stack as
        // candidates; `resolveNameRun` decides which of them the name keeps.
        const next = children[ci + 1]?.child(0)
        // Inside a forced underline a `_` before a block is no delimiter
        // (E3), so it stays in the name.
        const tail =
          (next?.ctorName === 'litDelim' && next.child(0).sourceString === '_' ||
            literalDelims.includes('_') && next?.sourceString === '_') &&
          !(freedTails?.src === next.source.sourceString && freedTails.at.has(next.source.startIdx)) ? next : undefined
        if (tail) ci++
        t.cuts = nameCuts(t, tail)
        for (const cut of t.cuts) {
          push(cut)
          // The borrowed delimiter keeps its trailing attribute block, which
          // attaches to whatever it closes.
          const loose = cut.loose
          if (loose) push({ k: 'attrs', node: loose, at: loose.source.startIdx, h: loose.h() })
          push(cut.seg)
        }
      }
      continue
    }
    // A held `/` with a block glued to it is no `litDelim` (carve#3939), but it
    // can end a combined closer, and R3 attaches the block to that span.
    if (marker.ctorName === 'anyChar' && alt.sourceString === '/' && literalDelims.includes('/')) {
      const at = alt.source.startIdx
      push(ownCombined('/', at, literalDelims))
      const blockEnd = heldAttrsEnd(alt.source.sourceString, at + 1, children.at(-1).source.endIdx)
      if (blockEnd !== -1) {
        const block = { k: 'attrs', at: at + 1, h: '', heldBlock: true, blockEnd }
        block.node = {
          source: { endIdx: blockEnd },
          parseAttrs: () => attrSem(g.match(alt.source.sourceString.slice(at + 1, blockEnd), 'attrRun')).parseAttrs(),
        }
        push(block)
        block.blockFrom = block.blockTo = toks.length
        held = block
      }
      continue
    }
    const boundary = ['rawInline', 'litInline', 'shortcode'].includes(marker.ctorName)
      ? `\uE000quote-boundary:${quoteRun.key}\uE001` : ''
    const t = { k: 't', h: c.h() + boundary }
    if (alt.sourceString === '{') t.braceAt = alt.source.startIdx
    if (marker.ctorName === 'dashRun') t.dash = { at: marker.source.startIdx, raw: marker.sourceString }
    push(t)
  }
  if (comment) comment.tok.tailEnd = toks.length
  return toks
}

// The end of the glued `looseAttrs` run at `at` within `limit`, or -1. A lexical pass bounds
// each block before Ohm confirms it, so the scan never reaches past a block
// that cannot be one; a bare value is skipped through `bareStops` in one step.
let bareStops = { source: null, next: null }
function heldAttrsEnd(src, at, limit) {
  if (bareStops.source !== src) {
    const next = new Int32Array(src.length + 1).fill(src.length)
    for (let i = src.length - 1; i >= 0; i--) next[i] = ' \t}|"\'\\\n\r'.includes(src[i]) ? i : next[i + 1]
    bareStops = { source: src, next }
  }
  const ident = (i) => {
    while (/[A-Za-z0-9_-]/.test(src[i] ?? '')) i++
    return i
  }
  const block = (i) => {
    i++
    while (src[i] === ' ') i++
    for (let first = true; ; first = false) {
      if (src[i] === '}' && !first) return i + 1
      if (!first) {
        if (src[i] !== ' ') return -1
        while (src[i] === ' ') i++
        if (src[i] === '}') return i + 1
      }
      const c = src[i]
      if (c === '#' || c === '.' || c === ':') {
        i = ident(i + 1)
        continue
      }
      if (!/[A-Za-z_]/.test(c ?? '')) return -1
      i = ident(i)
      if (src[i] !== '=') continue
      const q = src[++i]
      if (q === '"' || q === "'") {
        for (i++; src[i] !== q; i++) {
          if (src[i] === undefined || src[i] === '\n' || src[i] === '\r') return -1
          if (src[i] === '\\') i++
        }
        i++
      } else i = bareStops.next[i]
    }
  }
  let end = -1
  for (let i = at; src[i] === '{'; ) {
    const e = block(i)
    if (e === -1 || e > limit || g.match(src.slice(i, e), 'attrs').failed()) break
    end = i = e
  }
  return end
}

// An own-kind `/` or `*` is text, but it can still be half of a combined
// opener or closer: a combined token nests in a braced span of either kind.
function ownCombined(ch, at, literalDelims) {
  const t = { k: 't', h: escapeHtml(ch) }
  if ((ch === '/' || ch === '*') && literalDelims.includes(ch)) {
    t.own = ch
    t.at = at
  }
  return t
}

// A name `_` is a CLOSER candidate and nothing else: the engines keep
// `@x-_y_` whole, where an opener there would split it.
function nameCuts(t, tail) {
  const cuts = []
  const push = (at, loose) => {
    const cut = { k: 'd', ch: '_', at, closeOnly: true, ofName: t, loose }
    cut.seg = { k: 't', h: '', ofName: t }
    cuts.push(cut)
  }
  for (let i = 1; i < t.raw.length; i++) {
    if (t.raw[i] === '_') push(t.at + i)
  }
  // `tagChar` gave this one up so a forced underline could close.
  if (tail) {
    t.full = t.raw + '_'
    t.tailAt = tail.source.startIdx
    push(tail.source.startIdx, tail.ctorName === 'litDelim' ? tail.child(1).children[0] : undefined)
  }
  for (let n = 0; n < cuts.length; n++) {
    const from = cuts[n].at - t.at + 1
    const to = n + 1 < cuts.length ? cuts[n + 1].at - t.at : t.full.length
    cuts[n].seg.text = t.full.slice(from, Math.max(from, to))
  }
  return cuts
}

// PART 9 §7's name run and §9's stack read the same character: `name_word`
// admits `_`, and `_` is the underline delimiter. The name ends at the first
// of its underscores that pairs; the rest of its source is ordinary content.
// A name that keeps every one of them renders as the grammar matched it.
function resolveArrowCuts(toks, openMap) {
  const closed = new Set(openMap.values())
  const hits = new Set()
  const loneEq = new Map()
  toks.forEach((cut, j) => {
    if (cut.ofArrow && closed.has(j)) hits.add(cut)
    if (cut.k === 'd' && cut.ch === '=' && !cut.ofArrow && !openMap.has(j) && !closed.has(j)) loneEq.set(cut.at, cut)
  })
  for (const t of toks) {
    if (!t.arrowCuts?.length) continue
    const hit = t.arrowCuts.find((cut) => hits.has(cut))
    for (const cut of t.arrowCuts) {
      if (cut !== hit) {
        cut.k = 't'
        cut.h = ''
      }
    }
    if (!hit) continue
    t.h = escapeHtml(t.raw.slice(0, hit.idx))
    let rest = t.raw.slice(hit.idx + 1)
    // The rest is read again, so it can take an `=` after the arrow (`<=>=`).
    const next = loneEq.get(t.end)
    if (next && ARROWS[rest.at(-1) + '=']) {
      next.k = 't'
      next.h = ''
      hit.seg.h = escapeHtml(rest.slice(0, -1)) + ARROWS[rest.at(-1) + '=']
    } else hit.seg.h = escapeHtml(rest)
  }
}

// Text left of a name's end is read fresh with what follows it, so a last `-`
// and the next `>` are one arrow again (`a_#->`, carve#4329). Takes the `>`
// from the token after the name and returns the text to read.
function arrowTail(toks, i, src, text) {
  const t = toks[i]
  let n = i + 1
  while (toks[n]?.ofName === t) n++
  const next = toks[n]
  if (!text.endsWith('-') || src[t.at + t.full.length] !== '>' || next?.k !== 't' || next.at !== undefined) return text
  if (next.raw?.startsWith('>')) {
    next.h = ''
    return text + next.raw
  }
  if (!next.h.startsWith('&gt;')) return text
  next.h = next.h.slice(4)
  return text + '>'
}

function resolveNameRun(toks, openMap, src) {
  const closed = new Set(openMap.values())
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (!t.cuts) continue
    let cut
    for (let j = i + 1; j < toks.length && toks[j].ofName === t; j++) {
      if (toks[j].k === 'd' && (openMap.has(j) || closed.has(j))) {
        cut = toks[j]
        break
      }
    }
    for (const c of t.cuts) {
      const kept = !cut || c.at < cut.at
      if (kept) {
        c.k = 't'
        c.h = ''
      }
      const text = kept || c !== t.cuts.at(-1) ? c.seg.text : arrowTail(toks, i, src, c.seg.text)
      c.seg.h = kept ? '' : text === c.seg.text ? escapeHtml(text) : renderInline(text, '_')
    }
    const name = cut ? t.full.slice(0, cut.at - t.at) : t.full
    if (name === t.raw) continue
    t.raw = name
    t.h = name.length > 1 ? renderInline(name) : escapeHtml(name)
  }
}

// PART 9 §7: a mention, tag or symbol opens at the start of the content or
// after a character that is NOT a word character. Its word character is
// `[A-Za-z0-9_]`, which is `alnum` plus the one delimiter that is also a word
// character, so this is the only guard the `_` reaches.
const MARKER_RULES = new Set(['mention', 'tag', 'shortcode', 'symbolAttr'])
// The two whose name run is `name_word`, so the only two that can reach a `_`.
const NAME_RULES = new Set(['mention', 'tag'])
const isWordCh = (c) => c !== undefined && /[A-Za-z0-9_]/.test(c)

// A marker that fails §7 whatever pairs is no mention or tag, so its name's
// `_` characters are ordinary delimiters and may open. Only a word character
// that no opener can turn into markup decides that before the stack runs.
function releaseFailedNames(toks, src, contentAt) {
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (!t.cuts || t.at <= contentAt || !isWordCh(src[t.at - 1])) continue
    const left = toks[i - 1]
    if (left?.k === 'd' && left.at === t.at - 1 && left.canOpen) continue
    for (const cut of t.cuts) {
      cut.closeOnly = false
      classify(cut, src)
    }
  }
}

/*
 * A bare delimiter that PAIRED as an opener is markup, not content, so it is
 * not the character standing before the marker: `_@ex_` is an underlined
 * mention in all three engines while `a_@ex` and `_@ex` are literal text. Only
 * `pairDelims` knows which, so this cannot be a lookahead in the grammar.
 *
 * A suppressed construct is a NON-PARSE, not a literal token: the marker is
 * text and the rest goes back through the inline pass, so `a_:+-:` renders the
 * typographic `a_:±:` rather than the symbol name.
 */
// Borrowed name `_` offsets handed back by `resolveEmphasis`, for one source.
let freedTails = null

function applyMarkerBoundary(toks, openMap, src, contentAt, literalDelims) {
  const failed = []
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (t.raw === undefined) continue
    let at = t.at
    for (let j = i - 1; j >= 0; j--) {
      const left = toks[j]
      if (left.k !== 'd' || left.at !== at - 1 || !openMap.has(j)) break
      at = left.at
    }
    // `contentAt` is where this span's content begins; §7's other opening
    // position. The delimiter that opened the span is markup, not a character
    // the marker stands behind.
    if (!isWordCh(at > contentAt ? src[at - 1] : undefined)) continue
    // An enclosing span's held `_` stays literal in the rest it leaves.
    const rest = t.raw === t.full ? arrowTail(toks, i, src, t.raw.slice(1)) : t.raw.slice(1)
    // Read behind the escaped marker, so the rest's first run sees it (`_b_#--_`).
    t.h = renderInline('\\' + t.raw[0] + (literalDelims.includes('_') ? rest.replaceAll('_', '\\_') : rest), src[at - 1] ?? '')
    failed.push(t)
  }
  return failed
}

// Resolve a flat token stream (leaf HTML fragments interleaved with bare
// delimiter candidates) into rendered HTML. `toks` items are one of:
//   { k: 'd', ch, at }      a bare delimiter candidate (source index `at`)
//   { k: 'attrs', node, at, h }  a trailing `{...}` block (may attach to a span)
//   { k: 't', h }           an already-rendered leaf fragment
// Source offsets of attribute blocks that reached the render with nothing to
// attach to. renderInlineInner reads this after a pass and re-runs the text.
let unattachedAttrs = []
// Source offsets of the delimiters that paired in the same pass, while one runs.
let pairedDelims = null
// Every span's opener and closer offset in the top-level inline text, while
// `renderInline` probes a literal directive.
let spanPairs = null
// Blocks that attached to a closer, with the raw `{` offsets inside the span.
let attachedAttrs = null

// E1-E5 over a token stream: which candidates pair, as `open index -> close
// index`. Split out because the caption `#` placeholder asks the same question
// the renderer does -- which offsets sit inside a span -- over a stream that
// carries positions instead of HTML.
function pairDelims(toks, src, literalDelims = '', contentAt = 0) {
  // E1 CLASSIFY: evaluate bare_opener(d) / bare_closer(d) at each candidate.
  for (const t of toks) classify(t, src)
  if (!literalDelims.includes('_')) releaseFailedNames(toks, src, contentAt)
  // One pass with a delimiter stack. `openers` holds indices (into toks) of
  // still-open candidates, in source order. `openMap` records paired spans.
  let openers = []
  const openMap = new Map() // open index -> close index
  // A `_` or `/` guard is markup only while it is an open entry where the
  // opener after it stands, whether or not it closes later (carve#3973 X1).
  const guarded = (j, ch, at) => at > contentAt && guardedBy(ch, src[at - 1]) &&
    !(toks[j - 1]?.k === 'd' && toks[j - 1].at === at - 1 && openers.includes(j - 1))
  const delimAt = (k, ch) => toks[k] !== undefined && (toks[k].k === 'd' ? toks[k].ch === ch : toks[k].own === ch)
  // A combined closer token: a `*` not after whitespace, then a `/` that is
  // not followed by alnum.
  const closerToken = (k) => delimAt(k, '*') && delimAt(k + 1, '/') && toks[k + 1].at === toks[k].at + 1 &&
    !isWs(src[toks[k].at - 1]) && !isAlnum(src[toks[k].at + 2]) && !extendsGrapheme(src, toks[k].at + 2)
  // The first closer token at or after each index, built right to left once,
  // so each combined opener's lookahead is constant time.
  const nextCloser = new Array(toks.length + 1).fill(-1)
  for (let k = toks.length - 1; k >= 0; k--) nextCloser[k] = closerToken(k) ? k : nextCloser[k + 1]
  // The closer token of each `/*` ... `*/` shape, read before the stack decides
  // whether the opener forms: a comment inside the shape ends there (carve#4042).
  const shapeCloses = new Set()
  for (let k = 0; k + 1 < toks.length; k++) {
    if (delimAt(k, '/') && delimAt(k + 1, '*') && toks[k + 1].at === toks[k].at + 1 && !isAlnum(src[toks[k].at - 1]) &&
      !isWs(src[toks[k].at + 2]) && !extendsGrapheme(src, toks[k].at + 2) && nextCloser[k + 2] !== -1) shapeCloses.add(nextCloser[k + 2])
  }
  const hideBlock = (block, hidden) => {
    for (let b = block.blockFrom; b < block.blockTo; b++) toks[b].hidden = hidden
  }
  // A combined entry counts as both `/` and `*`.
  const holds = (oi, d) => toks[oi].ch === d || (toks[oi].combined !== undefined && (d === '/' || d === '*'))
  for (let j = 0; j < toks.length; j++) {
    const t = toks[j]
    if (t.k === 'f') {
      // Rendered in `renderRange`, where the bare spans around it have counted
      // toward the depth budget.
      t.k = 't'
      t.h = ''
      t.deferred = t.node
      continue
    }
    if (t.tailEnd !== undefined) {
      // The comment ends at the closer token of the shape it stands in, which
      // may stand past the `*/` it was cut at, whether or not that shape forms,
      // and otherwise runs to the end of its line (§21a).
      const close = nextCloser[j + 1]
      const end = close !== -1 && close < t.tailEnd && shapeCloses.has(close) ? close : t.tailEnd
      for (let k = j + 1; k < end; k++) toks[k].dead = true
      continue
    }
    if (t.dead || t.hidden || (t.k !== 'd' && t.own === undefined)) continue
    const d = t.k === 'd' ? t.ch : t.own
    // THE COMBINED TOKEN: an opener with a closer token ahead in its region
    // pushes one entry; without one its `/` and `*` are two bare candidates.
    if (d === '/' && !t.bare && delimAt(j + 1, '*') && toks[j + 1].at === t.at + 1 &&
      (t.k === 'd' ? t.canOpen : bareOpener('/', t.at > contentAt ? src[t.at - 1] : undefined, src[t.at + 1])) &&
      !guarded(j, '/', t.at) && !isWs(src[t.at + 2]) && !extendsGrapheme(src, t.at + 2) &&
      !openers.some((oi) => holds(oi, '/') || holds(oi, '*'))) {
      let close = nextCloser[j + 2]
      if (close !== -1 && toks[close].at === t.at + 2) close = nextCloser[close + 1]
      if (close !== -1) {
        t.combined = { close, below: openers.slice() }
        openers.push(j)
        j++
        continue
      }
    }
    if (t.k !== 'd' && !openers.some((oi) => toks[oi].combined?.close === j)) continue
    // E2 CLOSE FIRST: a valid closer closes the NEAREST matching open entry;
    // entries pushed above it are popped and demoted to literal (spans nest,
    // never overlap).
    if (t.canClose || t.k !== 'd') {
      let k = -1
      for (let s = openers.length - 1; s >= 0; s--) {
        if (holds(openers[s], d)) {
          k = s
          break
        }
      }
      const entry = k === -1 ? undefined : toks[openers[k]]
      // While a combined entry is open, a bare `/` or `*` that does not start
      // its closer token is text.
      if (entry?.combined !== undefined && j !== entry.combined.close) continue
      if (k !== -1) {
        // A closer that would remove a combined entry from below: that opener
        // did not form, and the region is read again from it with its `/` and
        // `*` as two bare candidates.
        const dropped = openers.slice(k + 1).find((oi) => toks[oi].combined !== undefined)
        if (dropped !== undefined) {
          const opener = toks[dropped]
          openers = opener.combined.below
          opener.combined = undefined
          opener.bare = true
          for (const key of [...openMap.keys()]) if (key >= dropped) openMap.delete(key)
          for (let b = dropped; b < j + 3 && b < toks.length; b++) if (toks[b].heldBlock) hideBlock(toks[b], false)
          j = dropped - 1
          continue
        }
        if (entry.combined !== undefined) {
          for (const at of [openers[k], openers[k] + 1, j, j + 1]) {
            if (toks[at].own === undefined) continue
            toks[at].k = 'd'
            toks[at].ch = toks[at].own
          }
          openMap.set(openers[k], j + 1)
          openMap.set(openers[k] + 1, j)
          entry.combinedSpan = true
          // The block glued to the closer belongs to the span, not the stack.
          if (toks[j + 2]?.heldBlock && toks[j + 2].at === toks[j + 1].at + 1) hideBlock(toks[j + 2], true)
          openers.length = k
          j++
          continue
        }
        openMap.set(openers[k], j)
        openers.length = k // demote the entries above the matched opener
        // The cut leaves the rest of the arrow to read with what follows (PART 9 §9).
        if (t.ofArrow && COMPARISONS.has(t.ofArrow.raw.at(-1) + '=')) {
          const next = toks.slice(j + 1, j + 2 * t.ofArrow.raw.length + 2).find((n) => n.k === 'd' && n.ch === '=' && n.at === t.ofArrow.end)
          if (next) next.canOpen = next.canClose = false
        }
        continue
      }
    }
    // E4 OPEN, subject to E3 (no same-type nesting): while a d-span is open,
    // a further d does not push -- it is literal content.
    if (t.canOpen && !guarded(j, d, t.at) && !openers.some((oi) => holds(oi, d))) {
      openers.push(j)
      continue
    }
    // E1 / E5 literal: candidate left unpaired (rendered as its literal char).
  }
  return openMap
}

// Pairing supplies the opening context of an emphasis span; quote state follows rendered order.
function applyQuotes(toks, openMap, src, contentAt, spanContent, contentEnd) {
  const opens = new Set([...openMap.keys()].map((i) => toks[i].at))
  const candidates = new Set(toks.filter((t) => t.k === 'd').map((t) => t.at))
  const closes = new Set([...openMap.values()].map((i) => toks[i].at))
  for (const t of toks) {
    if (!t.quote) continue
    // A span's closer is no next character: the quote reads as at the end of
    // the paragraph (CARVE-P3-023 R1, carve#4318).
    if (closes.has(t.quote.at + 1) || (spanContent && t.quote.at + 1 === contentEnd)) t.quote.record.spanEnd = true
    const pi = quotePrevIdx(src, t.quote.at)
    const prev = pi > 0 ? src[pi - 1] : quotePrevCtx
    // CARVE-P3-023: an opener of any kind starts content (carve#3898).
    if (opens.has(pi - 1) || (spanContent && pi === contentAt)) t.quote.record.spanStart = true
    else if (EMPHASIS_DELIMS.has(prev)) {
      t.quote.record.spanStart = candidates.has(pi - 1) ? false : pi === contentAt
    }
  }
}

function dashGlyphs(n) {
  if (n % 3 === 0) return '\u2014'.repeat(n / 3)
  if (n % 2 === 0) return '\u2013'.repeat(n / 2)
  let em = Math.floor(n / 3)
  let rem = n - em * 3
  if (rem === 1) {
    em -= 1
    rem = 4
  }
  return '\u2014'.repeat(em) + '\u2013'.repeat(rem / 2)
}

// CARVE-P3-021 with CARVE-P3-023: a run at the start of a span's content follows
// start-of-content (carve#4170), and a span's closer is no following character,
// so a run at the end of its content converts as at the end of a paragraph (carve#4260).
function applyDashFlanks(toks, openMap, src, contentAt, spanContent, contentEnd) {
  const opens = new Set([...openMap.keys()].map((i) => toks[i].at))
  const closes = new Set([...openMap.values()].map((i) => toks[i].at))
  for (const t of toks) {
    if (!t.dash) continue
    const { at, raw } = t.dash
    const atStart = opens.has(at - 1) || (spanContent && at === contentAt)
    const atEnd = closes.has(at + raw.length) || (spanContent && at + raw.length === contentEnd)
    if (!atStart && !atEnd) continue
    const prev = at > 0 ? src[at - 1] : ''
    const next = src[at + raw.length] ?? ''
    const prevIsSpace = atStart || prev === '' || isTypographyFlank(prev)
    const nextIsSpace = atEnd || next === '' || isTypographyFlank(next)
    t.h = prevIsSpace && !nextIsSpace ? escapeHtml(raw) : dashGlyphs(raw.length)
  }
}

// `spanContent`: `contentAt` starts and `contentEnd` ends a braced span's content.
function resolveEmphasis(build, src, literalDelims = '', contentAt = 0, spanContent = false, contentEnd = -1) {
  const toks = build()
  const openMap = pairDelims(toks, src, literalDelims, contentAt)
  const tentative = new Set([...openMap.values()].map((i) => toks[i].at))
  applyQuotes(toks, openMap, src, contentAt, spanContent, contentEnd)
  applyDashFlanks(toks, openMap, src, contentAt, spanContent, contentEnd)
  resolveNameRun(toks, openMap, src)
  resolveArrowCuts(toks, openMap)
  // A bare marker that is no mention or tag leaves the `_` it borrowed an
  // ordinary delimiter, so the run is read again without that borrowing.
  const freed = applyMarkerBoundary(toks, openMap, src, contentAt, literalDelims)
    .filter((t) => t.tailAt !== undefined && t.full.length === 2 && !freedTails?.at.has(t.tailAt)).map((t) => t.tailAt)
  if (freed.length) {
    const saved = freedTails
    freedTails = { src, at: new Set([...(saved?.at ?? []), ...freed]) }
    try {
      return resolveEmphasis(build, src, literalDelims, contentAt, spanContent, contentEnd)
    } finally {
      freedTails = saved
    }
  }
  // Build the span tree by walking the paired ranges (properly nested).
  const consumed = new Set() // attrs tokens attached to a span
  const closers = new Set(openMap.values())
  const renderRange = (lo, hi) => {
    let out = ''
    let i = lo
    while (i < hi) {
      const t = toks[i]
      if (t.dead || t.hidden) {
        i++
        continue
      }
      if (t.k === 'd' && openMap.has(i)) {
        const closeIdx = openMap.get(i)
        pairedDelims?.push(t.at, toks[closeIdx].at)
        spanPairs?.push([t.at, toks[closeIdx].at])
        // A `/*` ... `*/` pair split back out of a token is still the
        // `bold_italic` spelling, which renders strong around em, where its
        // content is one `biInner` takes (carve#3941).
        const head = toks[i + 1]
        const bi = t.combinedSpan || t.ch === '/' && head?.k === 'd' && head.ch === '*' && head.at === t.at + 1 &&
          openMap.get(i + 1) === closeIdx - 1 && toks[closeIdx - 1].at === toks[closeIdx].at - 1 &&
          !/[ \t]\*\//.test(src.slice(head.at + 1, toks[closeIdx].at + 1))
        if (bi) pairedDelims?.push(head.at, toks[closeIdx - 1].at)
        const levels = bi ? 2 : 1
        if (inlineDepth + levels > MAX_NESTING_DEPTH - 1) {
          out += escapeHtml(src.slice(t.at, toks[closeIdx].at + 1))
          i = closeIdx + 1
          continue
        }
        inlineDepth += levels
        const inner = bi ? renderRange(i + 2, closeIdx - 1) : renderRange(i + 1, closeIdx)
        inlineDepth -= levels
        // A `{...}` block immediately after the closer attaches as attributes.
        let attrsStr = ''
        const after = closeIdx + 1
        if (
          after < toks.length &&
          toks[after].k === 'attrs' &&
          toks[after].at === toks[closeIdx].at + 1
        ) {
          attrsStr = renderAttrs(toks[after].node.parseAttrs())
          consumed.add(after)
          const braces = []
          for (let b = i + 1; b < closeIdx; b++) if (toks[b].braceAt !== undefined) braces.push(toks[b].braceAt)
          if (braces.length) attachedAttrs?.push({ at: toks[after].at, end: toks[after].node.source.endIdx, braces })
        }
        out += bi
          ? `<strong${attrsStr}><em>${inner}</em></strong>`
          : `<${TAG[t.ch]}${attrsStr}>${inner}</${TAG[t.ch]}>`
        i = closeIdx + 1
        continue
      }
      if (t.k === 'd') out += escapeHtml(t.ch)
      else if (t.k === 'attrs') {
        // UNATTACHED, so its braces are ordinary content and must not fence off
        // what is inside them (carve#2084). renderInlineInner re-reads the text
        // with this brace escaped, which is the same document and puts the
        // block's characters back into the surrounding inline stream.
        if (!consumed.has(i) && !t.heldBlock) {
          const marker = toks[i - 1]
          const literalMarker = t.heldMarker || (marker?.k === 'd' && !openMap.has(i - 1) && !closers.has(i - 1))
          unattachedAttrs.push({ at: t.at, end: t.node.source.endIdx, literalMarker: literalMarker && t.markerAt + 1 === t.at, markerChar: t.markerChar, provisional: marker?.k === 'd' && tentative.has(marker.at) })
        }
      } else out += t.deferred ? t.deferred.h() : t.h
      i++
    }
    return out
  }
  return renderRange(0, toks.length)
}

// grammar.ebnf PART 26: every container FLATTENS/refuses rather than crashing;
// MAX_NESTING_DEPTH bounds recursion so the pipeline stays linear-time and
// never overflows the stack.
const MAX_NESTING_DEPTH = 200
// The inline runs and spans open around the one being rendered; the top run is
// level 1. Bare and braced spans share this budget (PART 9 §22).
let inlineDepth = 0

// The Ohm `bracketed`/`nested` rules recurse once per open bracket. `chain` is
// how deep that recursion runs before a `]` ends it (openers with no `]` after
// them do not recurse, `bracketless`); `prewarm` keeps it shallow. `matched`
// is the nesting of the pairs that close, which the CST and its semantics
// recurse through, so the model REFUSES past the bound (escapes and verbatim
// spans skipped) -- a legitimate refusal, not a crash.
function bracketNesting(text) {
  const lastClose = text.lastIndexOf(']')
  const open = []
  const pairs = []
  let chain = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '\\') {
      i++
      continue
    }
    if (c === '`') {
      let run = 1
      while (text[i + run] === '`') run++
      const close = text.indexOf('`'.repeat(run), i + run)
      i = close === -1 ? text.length : close + run - 1
      continue
    }
    if (c === '[' && i < lastClose) {
      open.push(i)
      chain = Math.max(chain, open.length)
    } else if (c === ']' && open.length) {
      pairs.push([open.pop(), i])
    }
  }
  const edges = pairs.flatMap(([a, b]) => [[a, 1], [b, -1]]).sort((x, y) => x[0] - y[0])
  let depth = 0
  let matched = 0
  for (const [, step] of edges) matched = Math.max(matched, (depth += step))
  return { chain, matched }
}
const bracketDepthExceeds = (text, limit) => bracketNesting(text).matched > limit

// math attrs merge into the base `math inline|display` class (PART 9 SS18);
// key/value and boolean attributes go through the SAME hardening path as
// every other carrier (PART 9 SS25)
function mathSpan(kind, code, attrs) {
  const wrap = kind === 'inline' ? ['\\(', '\\)'] : ['\\[', '\\]']
  const list = attrsOf(attrs)
  // PART 10 SS1: the base classes are prepended INSIDE the class slot, which
  // stays at the FIRST-APPEARANCE position of a class in the author's order
  // (carve#1164). Same insertion as the `ext-NAME` fallback, so the generic
  // merge supplies the slot test, deduplication, hardening and escaping; the
  // hand-rolled loop here tested `a[0] === 'class'` and so wrote a second
  // `class` attribute for the `class=V` and bare-`class` spellings of the same
  // slot, which CARVE-P4-007 forbids (carve#2460).
  const firstClass = list.findIndex(isClass)
  const base = [['class', 'math'], ['class', kind]]
  const merged = firstClass === -1
    ? [...base, ...list]
    : [...list.slice(0, firstClass), ...base, ...list.slice(firstClass)]
  const rest = renderAttrs(merged)
  const inner = codeInner(code)
  // codeU (unclosed run) carries its content in a different child slot
  const body = escapeHtml(
    inner.ctorName === 'codeU'
      ? unclosedBody(inner.child(2))
      : codeText(inner.child(1))
  )
  // PART 9 SS18 A MATH SPAN CARRIES ROLE MATH (carve#1468). The span carries
  // `role="math"`. The delimiters exist for a
  // typesetter to find, and until one runs - or if none ever does - a reader
  // announces the backslashes and the caret as prose. The role says the run is
  // MATHEMATICS whether or not the script arrives. The NAME stays the author's:
  // `{aria-label="E equals m c squared"}` is an ordinary key/value on the same
  // carrier, so the seam already exists and no engine-written English is added.
  // An author who spelled their own `role` keeps it.
  // ASCII-case-insensitive: an author's attribute NAME is emitted verbatim and
  // HTML attribute names are case-insensitive, so `ROLE` and `role` are one
  // attribute and a case-sensitive match writes a duplicate of it.
  const authoredRole = list.some((a) => a[0] === 'kv' && a[1].toLowerCase() === 'role')
  const roleStr = authoredRole ? '' : ' role="math"'
  return `<span${rest}${roleStr}>${wrap[0]}${body}${wrap[1]}</span>`
}

// A heading's comment is cut before inline reading, on the core grammar, whose
// `bold_italic` keeps a combined token's comment inside it.
const headingSem = core.createSemantics().addOperation('headingText', {
  headingInlines(_initial, parts) {
    return parts.children.map((part) => part.headingText()).join('')
  },
  headingInline(part) { return part.headingText() },
  initialComment(_marker, _body) { return '' },
  spComment(_space, _marker, _body) { return '' },
  escComment(esc, _marker, _body) { return esc.sourceString },
  inline(_content) { return this.sourceString },
})

export function headingText(text) {
  text = text.replace(/[ \t]+$/, '')
  if (!text.includes('%%')) return text
  // Match before the renderer's limit checks: discarded comments can contain
  // arbitrary brackets and backticks. Deep live input must still refuse safely.
  let match
  try {
    match = core.match(text, 'headingInlines')
  } catch (error) {
    if (error instanceof RangeError) throw new Refuse('heading inline exceeds parser stack capacity')
    throw error
  }
  if (match.failed()) throw new Refuse(`heading inline: ${match.shortMessage}`)
  return headingSem(match).headingText()
}

// parse a standalone `{...}` attribute block (table row/cell attrs);
// returns the serialized attribute string or null when invalid
export function parseAttrBlock(text) {
  const m = g.match(text, 'attrs')
  if (m.failed()) return null
  return renderAttrs(attrSem(m).parseAttrs())
}

// raw parsed attr list ([kind, name, value?] tuples) or null when invalid
export function parseAttrList(text) {
  const m = g.match(text, 'attrs')
  if (m.failed()) return null
  return attrSem(m).parseAttrs()
}

// The same, for a standalone attribute LINE, which may span lines: PART 9's
// `block_attributes` separates with `attr_separator = (space | continuation),
// attr_pad`, where an inline block's `attr_pad` admits no line break. One rule
// served both for a while, so the oracle read
// `*x*{.a<NEWLINE>.b}` as an attribute block where all three engines leave it
// literal text (carve#878).
export function parseBlockAttrList(text) {
  // CARVE-P7-001 item 5: a line-final run is dropped before the line is read.
  const m = g.match(text.replace(/[ \t]+(?=\n)/g, ''), 'blockAttrs')
  if (m.failed()) return null
  return attrSem(m).parseAttrs()
}

// PART 9 SS15 A3 merge for BLOCK attribute lines: first-appearance position,
// last value wins for id/key, classes ACCUMULATE in source order and
// DEDUPLICATE - a later list adds its classes rather than replacing the
// earlier one's, and a class already present is not added twice. This used to
// keep the duplicate, following a clause sentence no engine implemented
// (carve#615).
export function renderBlockAttrs(lists, structuralUrl = null) {
  const parts = []
  const classes = []
  let classAt = -1
  const seen = new Map()
  for (const list of lists) {
    for (const a of list) {
      if (structuralUrl && (a[0] === 'kv' || a[0] === 'bool') && a[1].toLowerCase() === structuralUrl) continue
      if (isClass(a)) {
        if (classAt === -1) {
          classAt = parts.length
          parts.push(null)
        }
        for (const value of classTokens(a)) if (value !== '' && !classes.includes(value)) classes.push(value)
      } else if (a[0] === 'id') {
        if (seen.has('#id')) parts[seen.get('#id')] = ` id="${escapeAuthoredAttr(a[1])}"`
        else {
          seen.set('#id', parts.length)
          parts.push(` id="${escapeAuthoredAttr(a[1])}"`)
        }
      } else if (a[0] === 'kv') {
        const h = hardenAttr(a[1], a[2])
        if (!h) continue
        const value = escapeAuthoredAttr(h.value)
        if (seen.has(a[1])) parts[seen.get(a[1])] = ` ${a[1]}="${value}"`
        else {
          seen.set(a[1], parts.length)
          parts.push(` ${a[1]}="${value}"`)
        }
      } else {
        // Same rule as the inline merge above: a boolean is a key/value with an
        // empty value and shares that name's slot (carve#1123).
        if (!hardenAttr(a[1], '')) continue
        if (seen.has(a[1])) parts[seen.get(a[1])] = ` ${a[1]}=""`
        else {
          seen.set(a[1], parts.length)
          parts.push(` ${a[1]}=""`)
        }
      }
    }
  }
  if (classAt !== -1) parts[classAt] = ` class="${escapeAuthoredAttr(classes.join(' '))}"`
  return parts.join('')
}

// quote-context decision (PART 9 SS8): OPENING after whitespace (a soft or
// hard line break included, carve#2822) or an opening context character;
// CLOSING otherwise. A single quote directly before a digit is always an
// apostrophe ('70s, '24).
// Comments emit nothing; step back over them when checking an emphasis boundary.
let readComments = { src: '', opens: new Map() }
function quotePrevIdx(src, at) {
  let i = at
  while (i >= 4 && src[i - 1] === '}' && src[i - 2] === '%') {
    // The comment the grammar read opens at the leftmost `{%`, not the nearest.
    const read = readComments.src === src ? readComments.opens.get(i) : undefined
    const open = read ?? src.lastIndexOf('{%', i - 3)
    if (read === undefined && (open < 0 || src[open - 1] === '\\' || extendsGrapheme(src, open + 2) || src.slice(open + 2, i - 2).includes('%}'))) break
    i = open
  }
  return i
}

// CARVE-P3-021 and CARVE-P3-023: typography flanks include soft and hard breaks, represented here by \n.
export const TYPOGRAPHY_FLANK = new Set([' ', '\t', '\n', '\r', '\u00a0'])
export const isTypographyFlank = (ch) => TYPOGRAPHY_FLANK.has(ch)
const QUOTE_OPEN_PREV = new Set(['=', ':', '-', '–', '—', '/', '(', '[', '{', '“', '‘'])
const QUOTE_CHARS = new Set(['"', "'"])
// A quote directly after a delimiter that OPENS a span stands at the START of
// that span's content, an opening context for every kind (carve#348,
// carve#3898). After one of these three that opens nothing the delimiter IS
// the preceding character and the quote closes. Pairing decides which, so
// `applyQuotes` settles it after the stack has run.
const EMPHASIS_DELIMS = new Set(['*', '_', '~'])
// The last character of a bare closer or a forced span's `X}`.
const SPAN_CLOSER_ENDS = new Set(['/', '*', '_', '~', '=', '}'])
const QUOTE_RULES = new Set(['dquote', 'squote'])
const ELISION_WORDS = new Set(['tis', 'tisn', 'twas', 'twasn', 'twere', 'twill', 'twould', 'em', 'cause', 'til', 'n', 'bout'])
const quoteAlnum = (c) => c !== '' && /[\p{L}\p{N}]/u.test(c)
const QUOTE_LETTER_RUN = /\p{L}+/uy
let quoteRun = null
function quoteOpaque(value) {
  const id = quoteRun.opaque.push(value) - 1
  return `\uE000quote-opaque:${quoteRun.key}:${id}\uE001`
}

function smartQuote(node, open, close, single) {
  const src = node.source.sourceString
  const at = node.source.startIdx
  const next = String.fromCodePoint(src.codePointAt(at + 1) ?? 0).replace('\0', '')
  QUOTE_LETTER_RUN.lastIndex = at + 1
  const word = single ? (QUOTE_LETTER_RUN.exec(src)?.[0] ?? '') : ''
  const end = at + 1 + word.length
  const record = {
    single, open, close, next,
    contentStart: at === 0 && quoteRun.depth === 1,
    initialContext: at === 0 ? quotePrevCtx : undefined,
    elision: ELISION_WORDS.has(word.toLowerCase()) && !(src[end] === "'" && !quoteAlnum(String.fromCodePoint(src.codePointAt(end + 1) ?? 0).replace('\0', ''))),
  }
  const id = quoteRun.records.push(record) - 1
  return `\uE000quote:${quoteRun.key}:${id}\uE001`
}

function* quotePieces(text) {
  for (let i = 0; i < text.length;) {
    const start = i
    if (text[i] === '\uE000') {
      const end = text.indexOf('\uE001', i + 1)
      i = end < 0 ? text.length : end + 1
    } else if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4)
      i = end < 0 ? text.length : end + 3
    } else if (text[i] === '<') {
      let quoted = ''
      for (i++; i < text.length && text[i] !== '\uE000'; i++) {
        const ch = text[i]
        if (quoted) { if (ch === quoted) quoted = '' }
        else if (ch === '"' || ch === "'") quoted = ch
        else if (ch === '>') { i++; break }
      }
    } else if (text[i] === '&') {
      for (i++; i < text.length && /[A-Za-z0-9#]/.test(text[i]); i++) {}
      if (text[i] === ';') i++
    } else i++
    yield text.slice(start, i)
  }
}

function settleQuotes(html, run, prevCtx) {
  let prev = prevCtx, span = null
  const scan = (text) => {
    for (const piece of quotePieces(text)) {
      const quote = /^\uE000quote:([0-9a-f-]+):(\d+)\uE001$/.exec(piece)
      if (quote?.[1] === run.key) {
        const r = run.records[Number(quote[2])]
        if (r.initialContext !== undefined) prev = r.initialContext
        if (r.spanStart) prev = ''
        const next = r.spanEnd ? '' : r.next
        const dashClose = '-–—/'.includes(prev) && prev !== '' && (next === '' || isTypographyFlank(next) || '"\'.,;:!?)]'.includes(next))
        const opening = (r.spanStart ?? (prev === '' || isTypographyFlank(prev) || QUOTE_OPEN_PREV.has(prev))) && !dashClose
        let apostrophe = r.single && (/[0-9]/.test(r.next) || (!opening && quoteAlnum(r.next)))
        if (r.single && !apostrophe && !opening && !isTypographyFlank(prev)) span = null
        if (r.single && opening && !apostrophe) {
          if (quoteAlnum(r.next)) apostrophe = r.elision || span !== null
          if (!apostrophe && span === null) span = { record: r, demote: quoteAlnum(r.next) && !r.contentStart && prev !== '“' }
        }
        r.glyph = apostrophe ? '’' : opening ? r.open : r.close
        prev = r.glyph
      } else if (piece.startsWith('\uE000ref:')) {
        const payload = JSON.parse(piece.slice(5, -1))
        if (payload.text !== undefined) scan(payload.text)
        prev = 'x'
      } else if (piece.startsWith('\uE000')) {
        prev = 'x'
      } else if (piece.startsWith('<')) {
        if (/^<br\b/i.test(piece)) prev = '\n'
        else if (/^<\//.test(piece) || /^<img\b/i.test(piece)) prev = 'x'
      } else {
        const entities = { '&nbsp;': '\u00a0', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }
        const numeric = /^&#(?:x([0-9a-f]+)|([0-9]+));$/i.exec(piece)
        const value = numeric ? parseInt(numeric[1] ?? numeric[2], numeric[1] ? 16 : 10) : null
        prev = entities[piece] ?? (value !== null ? String.fromCodePoint(value > 0x10ffff ? 0xfffd : value) : piece.at(-1))
      }
    }
  }
  scan(html)
  if (span?.demote) span.record.glyph = '’'
  // A frame JSON-escapes its sentinels, and a frame nested in a frame doubles the
  // backslashes, so a sentinel reads at any depth.
  return html.replace(/(?:\uE000|\\+u[eE]000)quote-boundary:([0-9a-f-]+)(?:\uE001|\\+u[eE]001)/g,
    (marker, key) => key === run.key ? '' : marker).replace(/(?:\uE000|\\+u[eE]000)quote:([0-9a-f-]+):(\d+)(?:\uE001|\\+u[eE]001)/g,
    (marker, key, id) => key === run.key ? run.records[Number(id)].glyph : marker)
    .replace(/(\uE000|\\+u[eE]000)quote-opaque:([0-9a-f-]+):(\d+)(?:\uE001|\\+u[eE]001)/g,
      (marker, prefix, key, id) => {
        if (key !== run.key) return marker
        let value = run.opaque[Number(id)]
        for (let n = prefix.indexOf('u'); n >= 1; n /= 2) value = JSON.stringify(value).slice(1, -1)
        return value
      })
}

// Replaces in a frame's decoded strings too: the replacement holds sentinels,
// which a frame's payload may carry only in its own escaped spelling.
function replaceThroughFrames(html, pattern, to) {
  const inValue = (value) => typeof value === 'string' ? replaceThroughFrames(value, pattern, to)
    : Array.isArray(value) ? value.map(inValue)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, inValue(v)]))
    : value
  return html
    .replace(REF_FRAME, (_, json) => refFrame(inValue(JSON.parse(json))))
    .replace(NOTE_FRAME, (_, json) => noteFrame(inValue(JSON.parse(json))))
    .replace(pattern, to)
}

let quotePrevCtx = '' // preceding character for recursive inline parses

/*
 * A SYMBOL CONTRIBUTES NOTHING TO A HEADING ID. syntax.md section 4.1 step 1
 * takes the heading's rendered plain text "(inline markup removed; symbols
 * `:name:` and footnote references excluded)", and the exclusion is by
 * CONSTRUCT rather than by what the symbol renders as - it has to be, because a
 * symbol resolves through processor configuration (a handler, else the
 * `symbols` map, else the literal `:name:`) while an id is assigned before any
 * of that is consulted. An id keyed on the shortcode name would name a spelling
 * the document stops rendering the moment a host configures a map.
 *
 * The flag rather than a sentinel: a sentinel that leaked would corrupt output,
 * and the id derivation is the only caller that wants the symbol gone, so it
 * renders its own copy of the heading (markup-carve/carve#1011).
 */
let omitSymbols = false
let omitRawInline = false
let omitComments = false

/*
 * HARD BREAKS: a soft break renders as `<br>` (PART 9 SS23).
 *
 * A line block and a local hard-break block promise it of every soft break
 * they hold. The promise is about BREAKS, and a newline swallowed by an
 * unclosed inline run is not one: the run reaches the end of the block and
 * everything it spans is its CONTENT, so writing a `<br>` into it would put
 * markup inside text that is by definition not markup.
 *
 * The flag rather than a post-pass over the rendered HTML: which newlines sit
 * inside a verbatim span is KNOWN here, at the node that matched them, and is
 * only guessable from the output. Guessing it put a `<br>` inside an
 * attributed math span (`class` is not the first attribute when the author
 * wrote an id first) and inside a literal, which has no wrapper element at
 * all, and it went blind after any raw `{=html}` payload holding a tag
 * (markup-carve/carve#1282).
 */
let hardBreaks = false

export function renderInlineHardBreaks(text, prevCtx = '') {
  hardBreaks = true
  try {
    return renderInline(text, prevCtx)
  } finally {
    hardBreaks = false
  }
}

/*
 * FOOTNOTE RECOGNITION IS OFF INSIDE A NOTE (grammar.ebnf §16).
 *
 * "Content is INLINE-only, parsed recursively with footnote recognition
 * DISABLED inside it (no `^[…]` or `[^ref]` nested in a note, either
 * direction)." Disabled recognition makes the inner spelling ordinary text -
 * `^` plus a bracketed run, or a bracketed run over `^label` - not an
 * unrenderable document, which is how the executable spec used to read it
 * (markup-carve/carve#1188).
 *
 * A flag rather than a second grammar: the two rules that must stop matching
 * are reached from every inline position, and the state has to survive the
 * recursive renderInline calls the note's own content makes, at any depth.
 */
let noFootnotes = false
// Inside a note `[^label]` and `^[...]` are ordinary text, so the grammar must
// not match either: rebuilding them in the action kept the token ending at the
// note's `]`, which cut a bracketed run off from its link tail (carve#3925,
// carve#3938).
const gNoNotes = ohm.grammar(`CarveNoNotes <: ${g.name} {
  footnoteRef := ~any "[^" fnLabel "]" attrRun?
  noteRefBody := ~any "[^" fnLabel "]"
  inlineNote := ~any "^[" brContent* "]" attrRun?
}`, { [g.name]: g })
let noNotesSem = null
const inlineMatch = (source) => noFootnotes
  ? [gNoNotes.match(source, 'inlines'), noNotesSem ??= gNoNotes.extendSemantics(sem)]
  : [g.match(source, 'inlines'), sem]

export function renderInlineWithoutSymbols(text, prevCtx = '') {
  omitSymbols = true
  omitRawInline = true
  omitComments = true
  try {
    return renderInline(text, prevCtx)
  } finally {
    omitSymbols = false
    omitRawInline = false
    omitComments = false
  }
}

export function renderInlineWithoutComments(text, prevCtx = '') {
  omitComments = true
  try {
    return renderInline(text, prevCtx)
  } finally {
    omitComments = false
  }
}

export function renderInlineWithoutRaw(text, prevCtx = '') {
  omitRawInline = true
  try {
    return renderInline(text, prevCtx)
  } finally {
    omitRawInline = false
  }
}

/*
 * PART 2 HEADING IDENTIFIERS step 1: smart typography is reversed to ASCII
 * before slugging, so `# Don't repeat yourself` gives `Don-t-repeat-yourself`
 * and not a curly apostrophe inside the id. The id side is the only consumer -
 * the implicit-reference index compares two RENDERED strings, which already
 * carry the same glyphs on both sides.
 */
const SMART_TO_ASCII = {
  '\u2194': '<->', '\u2122': '(tm)', '\u2026': '...', '\u2192': '->', '\u2190': '<-',
  '\u21d2': '==>', '\u21d0': '<==', '\u21d4': '<=>', '\u2264': '<=', '\u2265': '>=', '\u2260': '!=', '\u00b1': '+-',
  '\u00a9': '(c)', '\u00ae': '(r)', '\u2013': '-', '\u2014': '-',
  '\u2018': "'", '\u2019': "'", '\u201a': "'", '\u201b': "'",
  '\u201c': '"', '\u201d': '"', '\u201e': '"', '\u201f': '"',
  '\u00ab': '"', '\u00bb': '"',
}

export function deTypography(s) {
  let out = ''
  for (const ch of s) out += SMART_TO_ASCII[ch] ?? ch
  return out
}

export function renderInline(text, prevCtx = '', separateQuoteScope = false, markup = false) {
  if (inlineDepth >= MAX_NESTING_DEPTH) return escapeHtml(text)
  const outerDepth = inlineDepth++
  const saved = quotePrevCtx
  const outerMarkup = inMarkupContent
  inMarkupContent = markup
  const outerPairs = spanPairs
  spanPairs = null
  const outerRun = quoteRun
  const root = outerRun === null || separateQuoteScope
  if (root) quoteRun = { records: [], opaque: [], depth: 0, key: randomUUID() }
  quoteRun.depth++
  quotePrevCtx = prevCtx
  try {
    let html
    if (text.includes('{{')) {
      let literals = findDirectives(text).filter((directive) =>
        hasInvalidLineRange(directive) || !directive.quoted && directive.options.some(([key, value]) => key === 'code' && value === null))
      if (literals.length) {
        // A literal directive is no atom (CARVE-P9-043): an opener before it
        // that closes inside it breaks it, and its text is read as content.
        const savedPairs = spanPairs
        spanPairs = []
        let pairs
        try {
          html = renderInlineInner(text)
          pairs = spanPairs
        } finally {
          spanPairs = savedPairs
        }
        literals = literals.filter((d) => !pairs.some(([o, c]) => o < d.start && c >= d.start && c < d.end))
        if (!literals.length) return root ? settleQuotes(html, quoteRun, prevCtx) : html
        html = undefined
      }
      if (literals.length) {
        let key = randomUUID().replaceAll('-', '')
        while (text.includes(key)) key = randomUUID().replaceAll('-', '')
        let at = 0
        let masked = ''
        const sentinels = []
        for (const directive of literals) {
          if (directive.start < at) continue
          // The mask keeps the literal's `{` and `}` edges and opens nothing, so
          // a neighbor (`#`, `@`, an escaping backslash) reads it as it reads the literal.
          masked += text.slice(at, directive.start) + `{!CARVEINVALIDINCLUDE${key}X${sentinels.length}X}`
          sentinels.push(quoteOpaque(escapeHtml(text.slice(directive.start, directive.end))))
          at = directive.end
        }
        html = renderInlineInner(masked + text.slice(at))
        html = replaceThroughFrames(html, new RegExp(`\\{!CARVEINVALIDINCLUDE${key}X(\\d+)X\\}`, 'g'), (_, id) => sentinels[Number(id)])
      }
    }
    html ??= renderInlineInner(text)
    return root ? settleQuotes(html, quoteRun, prevCtx) : html
  } finally {
    inlineDepth = outerDepth
    spanPairs = outerPairs
    quotePrevCtx = saved
    quoteRun.depth--
    quoteRun = outerRun
    inMarkupContent = outerMarkup
  }
}

// A `{%` with no `%}` after it is text, but the `{%%}` an escape inserts would
// close it. Write it `{\\%`, unless that shows (a `{%` inside code, say).
function quietOpenComments(text, read) {
  const open = []
  const last = text.lastIndexOf('%}')
  for (let i = text.indexOf('{%'); i >= 0; i = text.indexOf('{%', i + 1)) {
    if (i + 2 > last && (i === 0 || text[i - 1] !== '\\')) open.push(i)
  }
  if (!open.length || !text.includes('{', open[0] + 2)) return text
  // Quote and opaque placeholders number per read, so compare what they stand for.
  const plain = (source) => {
    try {
      return read(source).out.replace(/\uE000quote(-opaque)?:[^:]*:(\d+)\uE001/g, (_, opaque, id) =>
        JSON.stringify(opaque ? quoteRun.opaque[id] : quoteRun.records[id]))
    } catch { return null }
  }
  const quieted = (list) => {
    let source = text
    for (const i of list.toReversed()) source = source.slice(0, i + 1) + '\\' + source.slice(i + 1)
    return source
  }
  const now = plain(text)
  if (now === null) return text
  if (plain(quieted(open)) === now) return quieted(open)
  return quieted(open.filter((i) => plain(quieted([i])) === now))
}

function renderInlineInner(text) {
  // Emphasis is resolved by the PART 9 SS9 delimiter stack in the `inlines`
  // semantic (resolveEmphasis) -- no pre-scan / refusal needed here.
  if (bracketDepthExceeds(text, MAX_NESTING_DEPTH)) throw new Refuse('inline nesting exceeds MAX_NESTING_DEPTH')
  const saved = unattachedAttrs
  const savedPaired = pairedDelims
  const savedAttached = attachedAttrs
  const read = (source) => {
    unattachedAttrs = []
    pairedDelims = []
    attachedAttrs = []
    const [m, semantics] = inlineMatch(source)
    if (m.failed()) throw new Refuse(`inline: ${m.shortMessage}`)
    const out = semantics(m).h()
    const contested = attachedAttrs.filter((a) => contestedBlock(source, a))
    return { out, offsets: [...unattachedAttrs, ...contested], paired: pairedDelims }
  }
  let source = quietOpenComments(text, read)
  // Brace escapes this loop wrote, as offsets into `source`.
  const escapes = []
  try {
    // One pass escapes every block of the class the old one-at-a-time loop
    // would pick next (carve#3936): the sure blocks, or when none is sure the
    // provisional ones. That is the same document unless an escape lets a later
    // member attach. A member that could is one glued to a closer that pairs
    // once the batch is text and holding a delimiter of its own: those members
    // are taken back and the rest read again. A block left unattached by that
    // takes the whole batch back, and only its leftmost block is escaped.
    let batch = null
    const limit = 4 * (text.split('{').length + 1)
    for (let pass = 0; ; pass++) {
      const result = read(source)
      const { out, offsets } = result
      if (batch) {
        // `paired` lists opener, closer pairs; a block glued to an opener attaches to nothing.
        const closers = new Set(result.paired.filter((_, k) => k % 2))
        const active = batch.members.filter((m) => m.active)
        const last = Math.max(...active.map((m) => m.at))
        if (offsets.some((o) => o.provisional ? batch.provisional && o.at < last : batch.provisional || o.at < last)) {
          source = batch.source
          escapes.splice(0, escapes.length, ...batch.escapes)
          escape([batch.first])
          batch = null
          continue
        }
        const glued = active.filter((m) => closers.has(m.at - 1))
        if (glued.length) {
          for (const m of glued.toReversed()) takeBack(m, batch.members)
          batch.members = batch.members.filter((m) => !glued.includes(m))
          continue
        }
        batch = null
      }
      if (offsets.length === 0 || pass > limit) {
        if (offsets.length === 0 && escapes.length) return restoreAttached(source, escapes, result)
        return out
      }
      // A block that attaches in no reading is text first (carve#3933): only
      // then may a block whose span a guard blocked hand its closer out.
      const definite = offsets.filter((o) => !o.provisional)
      const pool = (definite.length ? definite : offsets).toSorted((x, y) => x.at - y.at)
      const picked = [pool[0]]
      for (const o of pool) {
        if (TOKEN_CHARS.test(source.slice(o.at + 1, o.end - 1))) break
        if (o !== pool[0]) {
          if (commentAfter(o)) break
          picked.push(o)
        }
      }
      if (picked.length > 1) batch = { source, escapes: escapes.map((e) => ({ ...e })), first: pool[0], provisional: !definite.length }
      const placed = escape(picked)
      if (batch) batch.members = placed.slice(1)
    }
  } finally {
    unattachedAttrs = saved
    pairedDelims = savedPaired
    attachedAttrs = savedAttached
  }

  // Undoes one batch member's escape.
  function takeBack(member, members) {
    const k = escapes.findIndex((e) => e.at === member.at)
    const { at, len } = escapes[k]
    source = source.slice(0, at) + source.slice(at + len)
    escapes.splice(k, 1)
    for (const e of escapes) if (e.at > at) { e.at -= len; e.end -= len }
    for (const m of members) if (m.at > at) m.at -= len
  }

  // A literal delimiter cannot carry attributes. Preserve a following
  // editorial comment by escaping that delimiter instead of its brace.
  function commentAfter(block) {
    return block.literalMarker && source[block.at - 1] === block.markerChar && source.startsWith('{#', block.at) && !extendsGrapheme(source, block.at + 2) && source.indexOf('#}', block.at + 2) >= 0
  }

  // Escapes `blocks` (in source order) and returns where each escape landed,
  // with whether the block holds a delimiter besides a `key=`.
  // One splice for the whole batch, so a long run of blocks stays linear (carve#4059).
  function escape(blocks) {
    const cuts = blocks.map((block) => {
      const comment = commentAfter(block)
      // A brace that opens a braced inline stays one: an empty comment parts
      // it from the delimiter instead (carve#3940).
      const cut = !comment && BRACED_MARKS.has(source[block.at + 1]) ? '{%%}' : '\\'
      const body = source.slice(block.at + 1, block.end - 1).replace(/[A-Za-z0-9_-]+=/g, '')
      return { block, comment, cut, at: comment ? block.at - 1 : block.at, active: [...body].some((c) => BRACED_MARKS.has(c)) }
    })
    // Width of the cuts at or left of `at`, in the source before this batch.
    const widthUpTo = (at) => {
      let lo = 0
      let hi = cuts.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (cuts[mid].at <= at) lo = mid + 1
        else hi = mid
      }
      return lo === 0 ? 0 : cuts[lo - 1].before + cuts[lo - 1].cut.length
    }
    const parts = []
    let from = 0
    let width = 0
    for (const c of cuts) {
      c.before = width
      parts.push(source.slice(from, c.at), c.cut)
      from = c.at
      width += c.cut.length
    }
    parts.push(source.slice(from))
    for (const e of escapes) {
      const shift = widthUpTo(e.at)
      e.at += shift
      e.end += shift
    }
    source = parts.join('')
    const placed = []
    for (const c of cuts) {
      placed.push({ at: c.at + c.before, active: c.active })
      if (!c.comment) escapes.push({ at: c.at + c.before, end: c.block.end + c.before + c.cut.length, len: c.cut.length })
    }
    return placed
  }

  // A block escaped because a block to its right was still opaque may follow a
  // span that closes once that block is text. Glued to that closer it attaches
  // (PART 3 `attribute_run`), so its escape is taken back when no delimiter in
  // it paired and the document still reads with no unattached block.
  function restoreAttached(source, escapes, current) {
    escapes.sort((a, b) => a.at - b.at)
    // Every candidate is first taken back at once; a candidate that still
    // reads unattached leaves the trial, and what remains needs one read
    // (carve#3936). The one-at-a-time walk below finishes the rest.
    // A block with no delimiter of its own that is loose when every candidate
    // is taken back stays loose alone, so the walk skips it (carve#4059).
    let loneLoose = new Set()
    for (;;) {
      let trial = source
      let result = current
      let back = escapes.filter((e) => SPAN_CLOSER_ENDS.has(source[e.at - 1]) && !current.paired.some((p) => p > e.at && p < e.end))
      const plain = back.every((e) => PLAIN_BODY.test(source.slice(e.at + e.len + 1, e.end - 1)))
      loneLoose = new Set()
      let everyCandidate = true
      while (back.length > 1) {
        trial = source
        for (const e of back.toReversed()) trial = trial.slice(0, e.at) + trial.slice(e.at + e.len)
        result = read(trial)
        if (!result.offsets.length) break
        const loose = new Set(result.offsets.map((o) => o.at))
        let shift = 0
        const kept = back.filter((e) => {
          const keep = !loose.has(e.at - shift)
          shift += e.len
          if (!keep && everyCandidate && plain) loneLoose.add(e)
          return keep
        })
        everyCandidate = false
        back = kept.length < back.length ? kept : []
      }
      if (back.length < 2) break
      const taken = new Set(back)
      let shift = 0
      escapes = escapes.filter((e) => {
        if (taken.has(e)) {
          shift += e.len
          return false
        }
        e.at -= shift
        e.end -= shift
        return true
      })
      source = trial
      current = result
    }
    for (let k = 0; k < escapes.length; k++) {
      const { at, end, len } = escapes[k]
      if (loneLoose.has(escapes[k])) continue
      if (!SPAN_CLOSER_ENDS.has(source[at - 1])) continue
      if (current.paired.some((p) => p > at && p < end)) continue
      const trial = source.slice(0, at) + source.slice(at + len)
      const result = read(trial)
      if (result.offsets.length) continue
      source = trial
      current = result
      escapes.splice(k, 1)
      for (let j = k; j < escapes.length; j++) { escapes[j].at -= len; escapes[j].end -= len }
      loneLoose.clear()
      k = -1
    }
    return current.out
  }
}

// Characters that, once a block is text, can start a construct swallowing the
// text after it (a code span, a link, a nested block, an escape).
const TOKEN_CHARS = /[`[\]{}\\<]/
// A block body that holds no delimiter, escape or nested construct.
const PLAIN_BODY = /^[A-Za-z0-9 .#="]*$/

// The markers after `{` that open a braced inline (PART 9 SS22, editorial, comments).
const BRACED_MARKS = new Set(['/', '*', '_', '~', '^', ',', '=', '+', '-', '#', '%'])
const bracedHead = ohm.grammar(`CarveBracedHead <: ${g.name} {
  bracedHead = (forcedSpan | editorial | bracedComment) any*
}`, { [g.name]: g })
const bracedHeadEnd = bracedHead.createSemantics().addOperation('headEnd', {
  bracedHead(head, _rest) { return head.source.endIdx },
})

// PART 9 E2a, carve#3940: a braced opener between a closer's opener and the
// closer forms first. When the `X}` it needs sits in the closer's block, the
// outer entry is unreachable and the block attaches to nothing.
function contestedBlock(source, block) {
  const body = source.slice(block.at, block.end)
  return block.braces.some((p) => {
    const mark = source[p + 1]
    if (!BRACED_MARKS.has(mark) || !body.includes(mark + '}')) return false
    // The span has to close inside the block, so the probe stops at its end.
    const m = bracedHead.match(source.slice(p, block.at) + '\\' + body, 'bracedHead')
    return m.succeeded() && p + bracedHeadEnd(m).headEnd() > block.at + 1
  })
}

/*
 * The source offset of a caption's `#` number placeholder, or -1 for none.
 *
 * PART 9 SS4c puts the placeholder at the FIRST bare `#` in the caption's
 * TOP-LEVEL text: `#word` is a tag and `\#` an escape, so neither reaches the
 * `hash` token, and a `#` inside inline markup is literal. The scan therefore
 * walks the same token stream and SS9 pairing the renderer walks, over a stream
 * that carries source offsets instead of HTML, and steps over every paired
 * span. Every leaf -- a code span, a link, a forced span -- is one token here,
 * so a `#` it encloses is never seen.
 */
export function captionPlaceholder(text) {
  if (bracketDepthExceeds(text, MAX_NESTING_DEPTH)) return -1
  const m = g.match(text, 'inlines')
  if (m.failed()) return -1
  return capSem(m).capIdx()
}

const capSem = g.createSemantics().addOperation('capIdx', {
  inlines(_initial, items) {
    const build = () =>
      items.children.map((c) => {
        const alt = c.child(0)
        const at = alt.source.startIdx
        if (alt.ctorName === 'wordSlash') {
          return [{ k: 'word', at }, { k: 'd', ch: '/', at: alt.child(1).source.startIdx }]
        }
        const ch = alt.ctorName === 'litDelim' ? alt.child(0).sourceString : ''
        return STACK_DELIMS.has(ch) ? { k: 'd', ch, at } : { k: alt.ctorName, at }
      }).flat()
    const toks = build()
    const openMap = pairDelims(toks, this.source.sourceString)
    for (let i = 0; i < toks.length; i++) {
      if (openMap.has(i)) {
        i = openMap.get(i)
        continue
      }
      if (toks[i].k === 'hash') return toks[i].at
    }
    return -1
  },
})

// ---------------------------------------------------------------------------
// Heading slugs (grammar.ebnf PART 2 HEADING IDENTIFIERS, executable subset)
export function makeSlugger() {
  const seen = new Map()
  return (text) => {
    let slug = text
      .replace(/[‪-‮⁦-⁩​‌‍⁠﻿­]/g, '')
      .normalize('NFC')
      // ASCII punctuation and ASCII whitespace only. The rule is "each
      // maximal run of NON-ALPHANUMERIC ASCII characters", with non-ASCII
      // passing through unchanged - and `\\s` reaches past ASCII, so a
      // no-break space (U+00A0, what `#  Title` renders its second space
      // as) became a `-` and was then trimmed. All three engines keep it.
      // The ASCII ranges below already cover space, tab and newline.
      .replace(/[\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (slug === '') slug = 's'
    else if (/^\p{N}/u.test(slug)) slug = `s-${slug}`
    const n = seen.get(slug) ?? 0
    seen.set(slug, n + 1)
    return n === 0 ? slug : `${slug}-${n + 1}`
  }
}
