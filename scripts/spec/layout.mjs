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
 *
 * STATUS: a DERIVED CHECKER, not an authority. It executes what grammar.ebnf
 * states so a contradiction inside it becomes visible; it settles nothing. If
 * this file and a committed corpus golden disagree, this file is wrong until a
 * clause says otherwise - see the NORMATIVITY block at the top of
 * resources/grammar.ebnf. It has been the fourth answer to a three-way
 * disagreement before (carve#646).
 */

import { parseAttrList, parseBlockAttrList, parseAttrBlock } from './render.mjs'

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

/// Counted character work in the indentation machinery (carve#752).
///
/// Every container hands its body to a nested parse, so a line at depth `d` is
/// visited by `d` enclosing containers. What that costs per visit is what this
/// counts: the columns an indent scanner actually walks, and the characters a
/// stripper actually materializes. Loop indices, never string lengths.
///
/// It is a COUNT and not a clock deliberately. A wall-clock bound passes at
/// every complexity on a fast enough machine, which is the class of check that
/// cannot fail catalogued in carve#755; and this repository family has twice
/// recorded that a timing RATIO cannot separate linear from superlinear on a
/// shared machine (carve-js `test/writer-deep-list-perf.test.ts` and
/// `test/perf-regression.test.ts`). Counts are identical run to run under any
/// load, which is what makes tests/nested-container-rescan.test.mjs a guard
/// rather than a coin toss.
///
/// `scan` is columns of indentation walked. `pad` is characters written to
/// re-materialize a straddling tab's residual, the only place the strip builds
/// string data rather than pointing at it. `views` counts the suffix slices
/// themselves - each is O(1), a view over the same buffer, so what matters
/// about them is HOW MANY are taken, not how long they are. `lineVisits` is the
/// container model itself, one per line per enclosing level, and is the floor
/// nothing here can go below.
///
/// Charging a suffix slice by its LENGTH is the modelling error that makes a
/// healthy parse look cubic: the strip takes exactly one slice per line visit,
/// which is O(1) work per visit, and `views` is asserted against `lineVisits`
/// so a regression to walk-and-materialize is still caught.
/// `quoteStrips` is the OTHER container prefix. It is counted separately
/// because a `>` marker is not indentation and costs a fixed two columns; what
/// can go wrong with it is the NUMBER of strips, not their width. One per
/// quoted line per enclosing level is the floor and is what the model asks
/// for; carve-rs was doing 77 times that on a deep quote (carve-rs#731), from a
/// loop that unwound the whole remaining prefix to answer a question about the
/// innermost line. A counter here is what would have caught it.
export const layoutWork = { scan: 0, pad: 0, views: 0, quoteStrips: 0, lineVisits: 0 }

export function resetLayoutWork() {
  layoutWork.scan = 0
  layoutWork.pad = 0
  layoutWork.views = 0
  layoutWork.quoteStrips = 0
  layoutWork.lineVisits = 0
}

// Content after the marker+space must carry at least one non-ASCII-whitespace
// character: `#  ` / `#   ` (marker + whitespace only) is NOT a heading, exactly
// like a caption. A leading tab is content (`# \tx` is a heading with `\tx`).
const HEADING = /^(#{1,6}) ((?=.*[^ \t\n\r\f]).*)$/
const HR = /^(-{3,}|\*{3,}|_{3,})[ \t]*$/
const FENCE = /^(`{3,}|~{3,})(.*)$/
const PURE_FENCE = /^(`{3,}|~{3,})[ \t]*$/
const QUOTE = /^>(?: (.*)|)$/
// `reference_label = (character - ']' - '@'), {character - ']'}` - only those
// two are excluded, and only `@` only at the first position. `^` was excluded
// here too, so `[^]: %` matched nothing and fell through as a paragraph, where
// the PART 9 §10 note (and carve-rs, carve-php) read it as a link reference
// definition whose label is `^`: an EMPTY footnote label is not a footnote
// label, `footnote_label` being one-or-more (carve-rs#511, carve#589).
// Whitespace here is the Unicode White_Space property, NOT `\s`: JavaScript's
// class also holds U+FEFF, which `link_destination` names as an ORDINARY
// destination character, and omits U+0085, which is whitespace. So a BOM was
// skipped as the separator run or ended the destination early, and U+0085 was
// carried into the href. The rule is stated for the definition explicitly - it
// "is built from this same `link_destination`" - so the oracle has to read it
// the same way the inline form does (carve#806).
//
// The TITLE slot is the exception, and it is a different production. It is
// `link_title`, whose separator grammar.ebnf spells `space`. The slot is
// PADDING rather than a marker separator, but padding takes `space` too: it
// sits after the first non-whitespace character of the line, and a tab is
// syntax only in a leading indentation run (PART 7, MARKER SEPARATORS AND
// PADDING SLOTS; carve#901 correcting carve#878). The whole White_Space
// property was two answers to one production: `destTitle` in carve-core.ohm
// read the inline form's slot one way while this read the definition's as any
// Unicode space, so one normative file admitted `[a]: /u<NBSP>"T"` and the
// other rejected `[t](/u<TAB>"T")` (carve#888). Both now spell it `' '`.
//
// The two runs on either side of it deliberately keep the wider class. The
// leading one is entangled with the destination class above: PART 9 §25's
// scheme probe strips Unicode whitespace so an obfuscated destination cannot
// slip past the denylist, which corpus case 121 pins with a U+202F before
// `javascript:`. Narrowing that run is a separate question about
// `link_destination`, not about `link_title`, and is left alone here.
//
// CARDINALITY AT THE TITLE SLOT IS EXACTLY ONE (carve#912). `link_title =
// space, ...` spells one character, and this read a `+` run - so
// `[a]: /u<SP><SP>"T"` took the title here, as it did in all three engines and
// at the inline spelling in resources/carve-core.ohm. The ruling is that the
// production is right and the four lax artifacts narrow. With two spaces the
// quoted run is no longer a title.
//
// ANCHORED AT END OF LINE (carve#911). This ended in
// `(?:\p{White_Space}.*)?$` - a tail that swallowed anything after the
// destination and the optional title - so `[a]: /u zzz` was a definition with
// trailing junk in all three engines and here. NOTHING IN THE GRAMMAR
// AUTHORIZED THAT READING: `reference_definition` ends in `newline` and always
// did. The tail is also what made PART 7's promised failure mode unreachable
// at this line: the clause says a slot that does not match "falls back to
// prose rather than silently dropping metadata", and with the tail there was
// no prose to fall back to, so a failed title or attribute slot was dropped
// instead. Anchoring makes the clause reachable, and the tab and cardinality
// narrowings at both slots then follow from the general rule with no special
// case.
//
// The line ending is `whitespace`, space or tab, which is the terminal
// `blank_line = {whitespace}` uses (PART 1; carve#890). So `[a]: /u<SP>` is
// still a definition and `[a]: /u<NBSP>` is not - a no-break space is content
// under that same ruling, and content after the production is what the anchor
// rejects.
const LINK_DEF = /^\[([^\]@][^\]]*)\]: \p{White_Space}*(\P{White_Space}+)(?: "((?:\\"|[^"])*)")?[ \t]*$/u

/*
 * The production's own test, and the only spelling of it.
 *
 * `LINK_DEF` reads the line AFTER its optional trailing attribute block has
 * been split off, because `[space, attributes]` is part of the production and
 * the block is peeled by a scan rather than matched by the regex (see
 * `splitTrailingAttrBlock` below for why it cannot be a regex). While the
 * regex ended in a swallow-everything tail that did not matter: `[a]: /u {.c}`
 * matched it raw, so the eight places that ask "is this line a definition"
 * could test the raw line and get the right answer by accident.
 *
 * With the line anchored it matters at every one of them, and there are eight
 * - paragraph interruption, lazy continuation, the def-list fold, the
 * container scan, the item fold and the marker scan. That is the carve#922
 * shape: one rule spelled once and read in eight places, where narrowing the
 * one spelling silently changes all eight. So the split is done HERE, once,
 * and no caller tests `LINK_DEF` against a raw line.
 */
const isLinkDef = (line) => LINK_DEF.test(splitTrailingAttrBlock(line)[0])

/*
 * Split a TRAILING attribute block off a definition line (carve#604).
 *
 * Scanned rather than matched: an attribute value may hold a `}` inside quotes
 * (`{data-x="}"}`), and `\{[^}]*\}` stops at that brace, fails to parse, and
 * drops every attribute on the line silently. The scan tracks quote state, so
 * only a `}` outside quotes closes the block.
 *
 * The block must be preceded by a SPACE and end the line, so `[a]: /u{.x}`
 * keeps the braces in the DESTINATION, as the production's `space, attributes`
 * requires. A tab does not separate it either: the slot is padding, and padding
 * takes `space` because it sits after the first non-whitespace character of the
 * line (PART 7, MARKER SEPARATORS AND PADDING SLOTS; carve#901).
 * Returns [lineWithoutBlock, blockText|null].
 */
function splitTrailingAttrBlock(line) {
  const trimmedEnd = line.replace(/[ \t]+$/, '')
  if (!trimmedEnd.endsWith('}')) return [line, null]
  let quote = null
  let open = -1
  for (let i = 0; i < trimmedEnd.length; i++) {
    const c = trimmedEnd[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'") { quote = c; continue }
    if (c === '{') { if (open === -1) open = i; continue }
    if (c === '}' && open !== -1 && i === trimmedEnd.length - 1) {
      // Must be separated from what precedes it by a run of SPACES (PART 7).
      // The whole run is checked, not just the character adjacent to the `{`:
      // `[a]: /u<TAB><SP>{.c}` puts a space next to the brace while the run
      // still holds a tab, and the trailing-strip below would then swallow the
      // tab and attach the block anyway.
      //
      // AND THE RUN IS EXACTLY ONE SPACE (carve#912). The production is
      // `[space, attributes]`, one character, and this accepted any run of
      // them - so `[a]: /u<SP><SP>{.c}` attached the block here, as it did in
      // all three engines. The ruling is that the production is right and the
      // four lax artifacts narrow.
      //
      // WHERE THE REJECTED BLOCK GOES depends on the run, and the two cases
      // are NOT the same. A ZERO-space run glues the braces to the
      // destination, so `[a]: /u{.c}` gives href `/u{.c}` - `link_destination`
      // simply reads them, and the line is still a definition. A TWO-space run
      // does not: whitespace ends the destination, so `{.c}` is left over.
      // Until carve#911 that leftover fell into a swallow-everything tail on
      // `LINK_DEF` and was silently DROPPED - the outcome PART 7 names as the
      // one to avoid. With the line anchored at end of line there is no tail,
      // so the leftover makes the production fail and the line falls back to
      // prose, which is what the clause promises.
      if (open === 0) return [line, null]
      const sep = /[ \t]*$/.exec(trimmedEnd.slice(0, open))[0]
      if (sep !== ' ') return [line, null]
      return [trimmedEnd.slice(0, open).replace(/\s+$/, ''), trimmedEnd.slice(open)]
    }
  }
  return [line, null]
}
// The marker line must carry inline content (PART 9 SS16 production:
// `"]:", space, inline_content`); a bare `[^label]:` is an ordinary
// paragraph line (corpus 132).
const FOOTNOTE_DEF = /^\[\^([^\]]+)\]: +(?![ \t]*$)([^ ].*)$/
// `abbreviation_term = (letter | digit)+`, and `letter` is enumerated ASCII.
// This was `[^\]]+` - anything but a bracket - so the executable spec called
// `*[e.g.]:` and `*[ß]:` definitions, which made their LINE disappear, while
// all three engines kept it as paragraph text (carve#791).
const ABBR_DEF = /^\*\[([A-Za-z0-9]+)\]: +(?![ \t]*$)([^ ].*)$/
// The caption text drops its trailing whitespace run, like every other content
// line (PART 2, NO TRAILING WHITESPACE; carve#926). Done in the PATTERN rather
// than at each use: five places read this capture, and the rule was missing
// from all five - one rule, one spelling.
const CAPTION = /^\^ (.*?)[ \t]*$/
// SS4's two PROSE-spelled captionable hosts: a paragraph whose WHOLE content is
// one image (inline or reference form, trailing attribute block allowed), and
// one whose whole content is a display-math span. The other three hosts have a
// `[caption_slot]` production of their own. ONE spelling, read from two places -
// the paragraph collector, which decides whether a `^ ` line ends the paragraph,
// and the wrapper below it, which decides whether the caption attaches. Two
// copies would let those two answers drift apart, and the collector's copy would
// be the one nothing tested.
// THE §16 BRACKETED-RUN CLOSE, SCANNED RATHER THAN MATCHED (carve#1197).
//
// `line[open]` is a `[`; the return value is the index just past the `]` that
// closes it, or -1 if the line holds no close. grammar.ebnf states the rule
// beside `link_text` ("SEMANTIC CONSTRAINT: the link text ends at the matching
// `]` -- the close is balanced-bracket, escape- and LITERAL-SPAN-aware ...
// Not expressible context-free"), and PART 3's Images note binds an image to
// the same run: "only the leading `!` and the `<img src>` output differ".
//
// A REGEX CANNOT STATE THIS, which is why it kept being written as one. The
// close is BALANCED, so `[^\]]*` answers a different question - it stops at the
// first `]` at any depth - and it is right on exactly the inputs that have no
// nesting, which is every image in the corpus. Three copies of that spelling
// were live in this pipeline and all three agreed with each other and with
// nothing else. So this is a scanner: the depth counter is the part a pattern
// cannot carry.
//
// The three literal spans (inline code, the `!`-prefixed literal, an editorial
// comment) are skipped whole, because a `]` inside them is content and cannot
// be escaped. An UNCLOSED backtick run opens a verbatim span to the end of the
// block (PART 3 code_span), so the run has no close on this line: -1.
export function bracketRunEnd(line, open) {
  if (line[open] !== '[') return -1
  let depth = 0
  let i = open
  while (i < line.length) {
    const c = line[i]
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === '`') {
      const run = /^`+/.exec(line.slice(i))[0]
      // THE 1..3 TIER, because that is what the inline layer this feeds
      // accepts. resources/carve-core.ohm reads `code = code3 | code2 | code1 |
      // codeU` and says of the last one that longer runs are out of Core: a run
      // of four or more matches `codeU` and opens a verbatim span to the end of
      // the block whether or not an equal run follows. A scanner that paired
      // them anyway would hand this pass a close the inline pass does not
      // believe in, and the two answers meeting produced a `<figure>` wrapped
      // around a paragraph - a shape neither layer would have emitted alone.
      if (run.length > 3) return -1
      const closer = new RegExp('(?<!`)`{' + run.length + '}(?!`)', 'g')
      closer.lastIndex = i + run.length
      const hit = closer.exec(line)
      if (hit === null) return -1
      i = hit.index + run.length
      continue
    }
    if (c === '{' && line[i + 1] === '#') {
      const close = line.indexOf('#}', i + 2)
      if (close !== -1) {
        i = close + 2
        continue
      }
    }
    if (c === '[') depth++
    if (c === ']') {
      depth--
      if (depth === 0) return i + 1
    }
    i++
  }
  return -1
}
// SS4's two PROSE-spelled captionable hosts: a paragraph whose WHOLE content is
// one image (inline or reference form, trailing attribute block allowed), and
// one whose whole content is a display-math span. The other three hosts have a
// `[caption_slot]` production of their own. ONE spelling, read from two places -
// the paragraph collector, which decides whether a `^ ` line ends the paragraph,
// and the wrapper below it, which decides whether the caption attaches. Two
// copies would let those two answers drift apart, and the collector's copy would
// be the one nothing tested.
const CAPTIONABLE_IMAGE_TAIL = /^(?:\([^)]*\)|\[[^\]]*\])(?:\{[^}]*\})?$/
const CAPTIONABLE_MATH = /^\$\$`.*`$/
function isCaptionableParagraph(para) {
  if (para.length !== 1) return false
  const line = para[0]
  if (CAPTIONABLE_MATH.test(line)) return true
  if (!line.startsWith('![')) return false
  const altEnd = bracketRunEnd(line, 1)
  return altEnd !== -1 && CAPTIONABLE_IMAGE_TAIL.test(line.slice(altEnd))
}
// The run after the marker is SPACES ONLY: `-\titem` is a paragraph in every
// engine, so a tab here must not open a list (PART 9 SS11). Its width is the
// item's content column for a non-task bullet.
// AN ATTRIBUTE BLOCK IS NOT `\{[^}]*\}`. A value may hold a `}` inside quotes
// (`1.{title='a}b'} item`, `| a |{data-x="}"}`), and a `[^}]*` run stops at
// that brace. Where the block belongs to a MARKER, losing it also unmakes the
// marker, so the whole line rendered as text - where all three engines build
// the item and set the attribute. Where it belongs to a table CELL, the short
// run still matched, and set a truncated attribute from the fragment before the
// quoted brace while leaving the rest as content.
//
// Declared once so the four readers cannot drift apart again: it was fixed for
// definition lines first (carve#604, splitTrailingAttrBlock), then for the two
// markers, and the two table readers were still on the short run (carve#716).
// Matches `{`, a payload of quoted runs and bare characters, then `}`.
const ATTR_PAYLOAD = /(?:[^}'"\\]|\\.|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")*/.source
const ATTR_BLOCK = `\\{${ATTR_PAYLOAD}\\}`
const BULLET = new RegExp(`^([ \\t]*)([-*])(${ATTR_BLOCK})?( +)(?:\\[([ xX_>?-])\\] )?(.+)$`)
// The value is optional before a `.`: a bare `. ` is a decimal marker
// counting from 1 (PART 9 ordered_marker, BARE DOT). A bare `)` is not a
// marker, so the empty alternative is guarded by a lookahead at the dot.
const ORDERED = new RegExp(`^([ \\t]*)([0-9]+|[a-z]+|[A-Z]+|(?=\\.))([.)])(${ATTR_BLOCK})? (.+)$`)
const CONT_MARKER = /^\+[ \t]*$/
// marks a lazily-folded line (PART 9 SS10 I2): always paragraph text, never
// re-classified as structure when an item's content is re-parsed
export const LAZY = '\u0000L\u0000'

/// A body line with the internal LAZY frame removed.
///
/// The frame marks a line that reached this container by lazy folding; the
/// paragraph builder strips it, but anything that keeps its body VERBATIM -
/// fenced code, a raw block, a line block - joined the raw lines and shipped
/// the marker into the output. `- ``` ` plus a line below the item's content
/// column was enough: the rendered code read `\u0000L\u0000x`.
///
/// The corpus-wide sentinel check in scripts/formal-core-check.mjs could not
/// see it, because no corpus input opens a fence on a marker line and then
/// drops below the content column. tests/oracle-framing-never-leaks.test.mjs
/// generates those shapes instead of listing them.
export const stripLazy = (line) => (line.startsWith(LAZY) ? line.slice(LAZY.length) : line)

// Measurements a collector knows without walking anything (carve#752). A blank
// separator it synthesized stands at column 0 with no content; a lazily-folded
// line is re-materialized behind the LAZY frame, whose first character is not
// whitespace, so it stands at column 0 and IS its own content.
const BLANK_MEAS = { col: 0, rest: '', tabs: false }
const LAZY_MEAS = (rest) => ({ col: 0, rest: LAZY + rest, tabs: false })

// Lines that put the whole document out of the executable subset.
const REFUSERS = [
  [/^\[@/, 'citation definition'],
]

// The leading whitespace run, removed. `line.replace(/^[ \t]+/, '')` spells the
// same thing without being counted, and this is a walk over indentation like
// any other - carve#752 is about how many times that walk happens, so all of
// them go through the counter.
function stripIndent(line) {
  return indentCols(line).rest
}

// PART 9 SS24 C1: visual column of the first non-indent character.
//
// This is THE indentation walk. Every question the layout asks about a line's
// leading whitespace is answered from the pair it returns - `col` for the
// column arithmetic, `rest` for every pattern that would otherwise re-scan the
// same run - so the counter above sees all of that work in one place. A
// predicate that walks the indent itself, `/^[ \t]*$/` or `^([ \t]*)` in front
// of a marker, is invisible to the counter and cubic in depth: that is how the
// first instrument on this ticket read 1.5% of the work and concluded there
// was nothing to fix.
//
// `tabs` records whether the run held one. A container that strips columns can
// otherwise DERIVE its body's measurement instead of re-walking it, and a tab
// is what makes the derivation unsafe: re-materializing a straddling tab's
// residual as spaces moves every later tab stop on the line, so `\t\tx` minus
// two columns reaches column 4, not column 6.
export function indentCols(line) {
  return rootView(lineRecord(line))
}

// ---- Source-run records, and the views a container derives from them -------
//
// A measurement is a VIEW of one source line's indentation run: `pad` spaces
// materialized in front of `src.slice(start)`. The top-level line is the view
// with `start = 0, pad = 0`; every dedent moves `start` forward and leaves at
// most three residual columns behind as `pad` (a straddling tab lands on a
// multiple of 4, so the residual is never larger).
//
// Keeping the source coordinates is what makes the derivation EXACT for a tab
// run, which `col - cols` is not: the residual re-materialized as spaces moves
// every later tab stop on the line. See `colFrom` for the arithmetic.
function lineRecord(line) {
  let col = 0
  let i = 0
  let tabs = false
  for (; i < line.length; i++) {
    const ch = line[i]
    if (ch === ' ') col += 1
    else if (ch === '\t') { col = (Math.floor(col / 4) + 1) * 4; tabs = true }
    else break
  }
  layoutWork.scan += i
  layoutWork.views += 1
  // `nextTab` and `A` are built on first use, and only for a run that holds a
  // tab: a space run needs neither, so a document without tabs pays nothing.
  return { src: line, run: i, rest: i === 0 ? line : line.slice(i), hasTab: tabs, col, nextTab: null, A: null }
}

const rootView = (L) => ({ col: L.col, rest: L.rest, tabs: L.hasTab, L, start: 0, pad: 0 })

// Two backward passes over the run, fused, computed once per source line:
//
//   nextTab[i] - index of the first tab at or after `i`, or `run`.
//   A[i]       - columns advanced from `i` to the end of the run when the
//                current column is a multiple of 4.
//
// A[i] is a valid recurrence because a tab RESETS the residue: everything past
// a tab starts from a multiple of 4 again, so the spaces before the first tab
// are the only part that depends on where the walk started.
function runTable(L) {
  if (L.A) return L
  const { src, run } = L
  const nextTab = new Int32Array(run + 1)
  const A = new Int32Array(run + 1)
  nextTab[run] = run
  A[run] = 0
  for (let i = run - 1; i >= 0; i--) {
    const t = src[i] === '\t' ? i : nextTab[i + 1]
    nextTab[i] = t
    A[i] = t === run ? run - i : 4 * (Math.floor((t - i) / 4) + 1) + A[t + 1]
  }
  layoutWork.scan += run
  L.nextTab = nextTab
  L.A = A
  return L
}

// The column the content stands at, for the view `pad` spaces + src.slice(start).
//
// Spaces are a column each, so a tab-free suffix is `c + (run - start)`. With a
// tab at `t`, the walk reaches `c + (t - start)`, the tab rounds that up to the
// next multiple of 4, and everything past it is residue-independent - which is
// exactly what `A` holds.
function colFrom(L, start, pad) {
  if (!L.hasTab) return pad + (L.run - start)
  runTable(L)
  const t = L.nextTab[start]
  if (t === L.run) return pad + (L.run - start)
  return 4 * (Math.floor((pad + t - start) / 4) + 1) + L.A[t + 1]
}

// A view carries `tabs` CONSERVATIVELY - inherited from the line rather than
// recomputed for the suffix. Answering it exactly would mean building the table
// for every tab-bearing line, including the ones whose column arithmetic never
// needs it; and the only thing `tabs` decides is whether to take the exact path
// below, so erring towards it costs a table and never a wrong column.
const view = (L, start, pad, tabs, col) => ({
  col: col ?? colFrom(L, start, pad),
  rest: L.rest,
  tabs,
  L,
  start,
  pad,
})

// A footnote body's own column is fixed at 2 (grammar.ebnf, "Footnotes"),
// regardless of how the first continuation line is actually indented.
const FOOTNOTE_BODY_COLUMN = 2

// PART 9 SS24 C1/carve#692: a footnote continuation line qualifies by
// REACHING column 2, not by starting with two literal space characters. A
// bare tab (column 0 -> 4) and a space-then-tab (column 1 -> 4) both
// qualify; a single space (column 1) does not.
function isFootnoteContinuationLine(line) {
  if (line === undefined) return false
  const { col, rest } = indentCols(line)
  return col >= FOOTNOTE_BODY_COLUMN && rest !== ''
}

// A definition body's own column is fixed at 3 (grammar.ebnf,
// `definition_indent`) -- the column `:  ` establishes -- regardless of how the
// first continuation line is actually indented.
const DEFINITION_BODY_COLUMN = 3

// PART 9 SS24 C1/carve#893: a definition-body continuation line qualifies by
// REACHING column 3, not by starting with three literal space characters. A
// bare tab (column 0 -> 4) and a space-then-tab (column 1 -> 4) both qualify;
// two spaces (column 2) do not. This is the same rule
// `isFootnoteContinuationLine` applies one column lower, and it is spelled here
// ONCE because the character form used to be spelled three times in the
// definition-body loop below - two tests plus the dedent - and a fix reaching
// only some of them is the recurring shape catalogued in carve#755.
function isDefinitionContinuationLine(line) {
  if (line === undefined) return false
  const { col, rest } = indentCols(line)
  return col >= DEFINITION_BODY_COLUMN && rest !== ''
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
// while `matchMarkerAt` rejected it and parsed the line as prose. The two now
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
  // No dialect claims the token, so it is NOT an ordered marker: PART 2's
  // `ordered_marker` admits `digit+`, a single `letter` or a `roman_numeral`
  // and nothing else, and `abc.` is none of the three. The caller reads the
  // empty list as "not a marker" and the line stays a paragraph, which is what
  // the production already says (markup-carve/carve#1188).
  return out
}

// --- tables (PART 9 SS5) ----------------------------------------------------
// T1: split a row into raw cell segments; an unescaped `|` outside a code
// span separates cells. Returns null when the line is not a row.
function splitRow(line) {
  let s = line
  let rowAttrs = null
  const ra = new RegExp(`\\|\\{(${ATTR_PAYLOAD})\\}[ \\t]*$`).exec(s)
  // T8: a `{...}` GLUED to the closing pipe is the row attribute block - but
  // only if the payload is VALID: "the whole payload must be valid attribute
  // syntax (§15); otherwise the `{` is ordinary content and the line is not a
  // row attribute" (grammar.ebnf row_attributes). Deciding that here rather
  // than at render time is what keeps `| a |{bad!!}` a paragraph; testing it
  // downstream REFUSED the whole document, the one outcome the clause rules
  // out. Same move carve#713 made for the cell block, on the row's twin.
  if (ra && parseAttrBlock(`{${ra[1]}}`) !== null) {
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
  // The colon fence's ONE separator slot, shared by all four openers. It is a
  // MARKER SEPARATOR (PART 7, MARKER SEPARATORS AND PADDING SLOTS): the token
  // after it selects an admonition, a div, a line block or a local hard-break
  // block, so it is spelled `space` and a tab never satisfies it. It is also
  // the only slot on this line that is not already `space` for the OTHER
  // reason - the metadata slots below sit inline, where a tab is not syntax at
  // all (carve#901).
  //
  // Only the SPACE run is consumed. A tab anywhere in the run therefore
  // survives into the token tests below, every one of which then fails on it,
  // and the trailing-junk check at the end of this function turns the line
  // into an ordinary paragraph. That is what makes a MIXED run fail as well:
  // `:::<SP><TAB>note` and `:::<TAB><SP>note` are both prose, because this is
  // a check on the whole run rather than on its first character - the shape
  // that has slipped through the same fix elsewhere twice.
  //
  // CARDINALITY IS UNCHANGED, deliberately, and for the reason `titleSp` in
  // resources/carve-core.ohm gives: grammar.ebnf spells the slot as exactly
  // one `space`, so the run has always been the looser of the two, and it was
  // so for spaces long before the tab question arose. Narrowing to one here
  // would newly break `:::<SP><SP>note`, which every engine reads as an
  // admonition. Which side gives is a question for the production.
  s = s.replace(/^ +/, '')
  if (/^\|[ \t]*$/.test(s)) return { ...out, mode: 'line-block' }
  if (/^\\[ \t]*$/.test(s)) return { ...out, mode: 'hardbreaks' }
  const ty = /^([A-Za-z_-][A-Za-z0-9_-]*)/.exec(s)
  if (ty) {
    out.type = ty[1]
    s = s.slice(ty[0].length)
  }
  // The `"title"` and `[label]` slots are PADDING and take `space`: they sit
  // after the first non-whitespace character of the line, and a tab is syntax
  // only in a leading indentation run (PART 7; carve#901). A tab here leaves
  // the token unconsumed, so the trailing-junk check below turns the line into
  // an ordinary paragraph rather than silently dropping the metadata.
  const qt = /^ +"([^"]*)"/.exec(s)
  if (qt) {
    out.title = qt[1]
    s = s.slice(qt[0].length)
  }
  const lb = /^ *\[([^\]]*)\]/.exec(s)
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

function hasFollowingBody(lines, idx) {
  for (let j = idx + 1; j < lines.length; j++) {
    if (!isBlank(lines[j])) return true
  }
  return false
}

function bareColonHasFollowingBody(lines, idx) {
  return COLON_CLOSER.test(lines[idx] ?? '') && hasFollowingBody(lines, idx)
}

function paraHasInvalidColonOpener(para) {
  return para.some((l) => {
    const cf = COLON_FENCE.exec(l)
    return cf && parseColonOpener(cf[2]) === null
  })
}

/** SS12's interruption rule for one colon-fence LINE, decoupled from where the
 *  line was read. `followingBody` is whether any non-blank line follows it,
 *  `para` the lines of the paragraph currently open. Kept as a function of its
 *  three inputs so the block reader and the list-item collector below can share
 *  ONE spelling of the rule: the collector used to carry its own, a bare
 *  `COLON_FENCE.test(line)`, which closed the paragraph for a fence that had
 *  been ABSORBED into it and never interrupted anything (carve#891). */
function colonFenceInterrupts(line, followingBody, para) {
  if (isColonParagraphInterrupt(line)) return true
  return COLON_CLOSER.test(line) && followingBody && !paraHasInvalidColonOpener(para)
}

function colonInterruptsParagraph(lines, idx, para) {
  return colonFenceInterrupts(lines[idx], bareColonHasFollowingBody(lines, idx), para)
}

const COMMENT_LINE = /^[ \t]*%%/
// A fence line is DELIMITER + INSIGNIFICANT TAIL (SS28): only the leading run
// of `%` is structural, so `%%% TODO` opens and `%%% end` closes.
const COMMENT_FENCE = /^[ \t]*(%{3,})(.*)$/
// The same fence, matched against a line's indent-free content rather than the
// line: `[ \t]*` in front is what makes the pattern re-walk indentation an
// enclosing container has already walked.
const COMMENT_FENCE_BODY = /^(%{3,})(.*)$/

const CONT_ROW = /^\+.*\|[ \t]*$/ // `+` replaces the leading pipe; must close with one
const DELIM_CELL = /^ *:?-+:? *$/

// A table cell's padding slots are `space` runs, not whitespace runs
// (grammar.ebnf `delimiter_cell`, `header_cell`, `data_cell`, `rowspan_marker`,
// `colspan_marker`). They sit after the row's opening `|`, so they are INLINE,
// and a tab is syntax only in a line's leading indentation run (PART 7, MARKER
// SEPARATORS AND PADDING SLOTS; carve#901, carve#904).
//
// `trim()` was the whole reason the slots read as `whitespace`: it strips a tab
// as readily as a space, so the oracle padded `|<TAB>a<TAB>|` down to `a` and
// rendered it exactly as `| a |`. Stripping only spaces leaves the tab where it
// is, which makes it ordinary CONTENT rather than padding - the outcome the
// production describes.
//
// The two ends are separate replacements on purpose. A padding rule stated as
// "the slot takes a space" is easy to implement at one end only, and a fixture
// that carries a tab at both ends cannot tell a half-fix from a whole one.
const padTrim = (s) => s.replace(/^ +/, '').replace(/ +$/, '')

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
  // A glued attribute block; "the rest of the cell, AFTER OPTIONAL WHITESPACE, is
  // the content" (§5), so no space is required after the closing brace - this
  // used to demand one and read `|{.x}Total |` as literal text.
  //
  // Validity decides here, not at render time: "the whole brace payload must be
  // valid attribute syntax; otherwise the `{` is literal content". Testing it
  // downstream made an invalid payload REFUSE the document instead.
  const at = new RegExp(`^\\{(${ATTR_PAYLOAD})\\}`).exec(s)
  if (at && parseAttrBlock(`{${at[1]}}`) !== null) {
    cell.attrs = `{${at[1]}}`
    s = s.slice(at[0].length)
  }
  cell.content = padTrim(s)
  if (cell.attrs && (cell.content === '^' || cell.content === '<')) {
    // T4: there is no attributed span marker - the cell is ordinary content
    // whose literal text includes the braces
    cell.attrs = null
    // `padTrim` is provably EQUIVALENT to `trim()` at this call site, and is
    // written anyway so a sweep of the padding slots finds the same spelling
    // everywhere. This branch is only reached when the space-trimmed content is
    // exactly `^` or `<`, which rules out a tab beside the marker, and `seg`
    // begins with the attribute block glued to the opening pipe, which rules
    // out one before it. Mutating it therefore proves nothing either way.
    cell.content = padTrim(seg)
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
    const list = parseBlockAttrList(buf)
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
  // A single leading U+FEFF is stripped before the first line is read, so
  // `<BOM># T` is a heading rather than paragraph text. All three engines do
  // this and none of them says so anywhere normative; the oracle did not, and
  // rendered the BOM'd heading as a paragraph (carve#872).
  //
  // ONE, and only at the very start: a BOM anywhere else is an ordinary
  // zero-width character, which PART 9 already says of U+FEFF on a destination
  // ("ZERO-WIDTH characters are NOT whitespace and ARE ordinary characters").
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1)
  // `newline = '\n' | '\r\n' | '\r'` - all three end a line, and splitting on
  // '\n' alone left the carriage return as ordinary text at the end of every
  // line, which the inline grammar then refused outright. So the oracle could
  // not read a CRLF document at all, while the production says it is one
  // (carve#872).
  src = src.replace(/\r\n?/g, '\n')
  const lines = src.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  const state = {
    linkDefs: new Map(),
    footnoteDefs: new Map(),
    abbrDefs: new Map(),
  }
  // frontmatter (PART 1): consumed; renders nothing. The closer-lookahead
  // guard: with no closing --- the line is an ordinary thematic break.
  // The slot before the format token is PADDING and takes `space` (PART 7;
  // carve#901): it sits after the `---`, and a tab is syntax only in a leading
  // indentation run. `---<TAB>yaml` is therefore not a typed opener.
  //
  // The lookahead, rather than narrowing the alternation, is what makes
  // `---<SP><TAB>yaml` fail too. Narrowing the first alternative to a literal
  // space only rejects a run that STARTS with a tab; a mixed run reaches the
  // token just as well, and the rule is about the whole padding run rather
  // than its first character. Trailing whitespace after the token is a
  // different question - the line-ending rule, not this slot - so a tab is
  // still tolerated there.
  //
  // The lookahead used to be `(?![ \t]*\t)`, which is a NOT-A-TAB test rather
  // than a space-only one, and the alternation's first branch was `\s`. A tab
  // is not the only character outside the slot's class: JavaScript's `\s`
  // covers U+000C, U+000B, U+00A0 and U+2000, so `---<FF>yaml`,
  // `---<VT>yaml`, `---<NBSP>yaml` and `---<U+2000>yaml` all opened
  // frontmatter here while `frontmatter_open = "---", [space], ...` admits
  // none of them - and all three reference engines reject every one of them
  // (measured under carve#907 on carve-js `3d95e94`, carve-php `876e312` and
  // carve-rs `378f0d5`). So the oracle was the only artifact in the org that
  // read them as an opener. `[^\S ]` is "whitespace that is not a space", and
  // ` *` in front of it is what keeps the test about the whole run rather
  // than its first character.
  //
  // CARDINALITY IS EXACTLY ONE (carve#912). `frontmatter_open = "---",
  // [space], [frontmatter_format]` spells the slot as one character, and this
  // branch used to be a bare ` ` that matched the first space of any run and
  // never looked at the rest - so `---<SP><SP>yaml` opened frontmatter here,
  // as it did in all three engines. The ruling is that the production is right
  // and the four lax artifacts narrow: `(?! )` after the space is what makes
  // the slot one character rather than the first character of a run. The
  // second space then reaches `frontmatter_format = (letter | digit)+`, which
  // cannot match it, so the line is not a typed opener.
  if (lines[0] !== undefined && /^---(?! *[^\S ])( (?! )|[A-Za-z0-9]+\s*$|$)/.test(lines[0])) {
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
  // Unwrap a figure whose reference image never resolved (see the
  // `pendingRef` note above). Iterative, because a figure can sit inside
  // any container and the tree is as deep as the document.
  const stack = [blocks]
  while (stack.length > 0) {
    const level = stack.pop()
    for (const b of level) {
      if (b === null || typeof b !== 'object') continue
      if (b.t === 'para' && b.pendingRef !== undefined) {
        if (!state.linkDefs.has(b.pendingRef)) {
          b.lines = [...b.lines, b.captionSrc]
          delete b.caption
        }
        delete b.pendingRef
        delete b.captionSrc
      }
      for (const value of Object.values(b)) {
        if (Array.isArray(value) && value.some((x) => x !== null && typeof x === 'object')) {
          stack.push(value.filter((x) => x !== null && typeof x === 'object'))
        }
      }
    }
  }
  return { blocks, ...state }
}

/*
 * The lines past MAX_NESTING_DEPTH, grouped as ordinary paragraphs: runs of
 * non-blank lines split on blank lines, each stripped of trailing whitespace.
 * Blank-only input yields no blocks.
 */
function flattenPastCap(lines) {
  const blocks = []
  let run = []
  const flush = () => {
    if (run.length === 0) return
    // Same node shape a normal paragraph gets: { t: 'para', lines }. The
    // trailing whitespace of the LAST line goes, like any paragraph's.
    const trimmed = [...run]
    trimmed[trimmed.length - 1] = trimmed[trimmed.length - 1].replace(/[ \t]+$/, '')
    if (trimmed.join('').trim() !== '') blocks.push({ t: 'para', lines: trimmed })
    run = []
  }
  for (const line of lines) {
    if (line.trim() === '') { flush(); continue }
    run.push(line)
  }
  flush()
  return blocks
}

// Depth-guarded entry: every block-container recursion re-enters here, so a
// single counter on `state` bounds the nesting uniformly (PART 26). The
// counter is incremented on entry and decremented on exit (try/finally) so
// sibling containers never accumulate depth.
function parseBlocks(lines, state, top, inItem = false, meas = undefined) {
  state.blockDepth = (state.blockDepth ?? 0) + 1
  if (state.blockDepth > MAX_NESTING_DEPTH) {
    state.blockDepth--
    // PART 9 SS25: past the cap an opener DEGRADES to literal paragraph text
    // rather than recursing - and being ordinary paragraph text, it groups by
    // the ordinary paragraph rule. Consecutive lines form one paragraph, ending
    // at the first blank line, with no trailing whitespace carried in
    // (carve#494, carve#547).
    //
    // This used to Refuse, which is a legitimate answer for a construct outside
    // the executable subset and the WRONG one here: the degrade path is not an
    // exotic construct, it is what SS25 says every container does past the cap,
    // and refusing it meant the one implementation this repository owns had no
    // answer for the clause it had just written.
    return flattenPastCap(lines)
  }
  try {
    return parseBlocksImpl(lines, state, top, inItem, meas)
  } finally {
    state.blockDepth--
  }
}

function parseBlocksImpl(lines, state, top, inItem = false, seeded = undefined) {
  const blocks = []
  let i = 0
  const n = lines.length
  layoutWork.lineVisits += n

  // Measurements for these lines, memoized per index and SEEDED by the
  // enclosing container where it could derive them (carve#752). Without the
  // seed each level re-walks the same leading whitespace, which is what made a
  // nested document cost more than its bytes; with it the walk happens once
  // per line for the whole document. A seeded entry of `null` means the
  // container could not derive that one - a tab in the run, or a line it
  // synthesized - so it is walked here, once.
  const meas = seeded ?? new Array(n)
  const ind = (idx) => {
    const m = meas[idx]
    if (m !== undefined && m !== null) return m
    const line = lines[idx]
    if (line === undefined) return undefined
    return (meas[idx] = indentCols(line))
  }

  const peekInterrupts = (idx) => {
    // PART 9 SS10: does lines[idx] interrupt an open paragraph?
    const line = lines[idx]
    if (line === undefined) return false
    if (startsVisibleBlock(line)) return true
    if (isTableRow(line)) return true
    if (isColonParagraphInterrupt(line) || bareColonHasFollowingBody(lines, idx)) return true
    const fence = FENCE.exec(line)
    if (fence && hasCloser(lines, idx)) return true // I4
    // ABBR_DEF only at document level: elsewhere the line is paragraph text,
    // so it neither opens a block nor interrupts one (PART 12 SS7).
    if (isLinkDef(line) || FOOTNOTE_DEF.test(line) || (top && ABBR_DEF.test(line))) return true // I5
    // A BLOCK-ATTRIBUTE LINE is in I5's list too - "a reference definition, a
    // comment, and a block-attribute line" - and it was the one member missing
    // here. Inside a list item that meant `- a` / `{.c}` / `text` folded all
    // three lines into one paragraph and dropped the attribute, where every
    // engine ends the paragraph and puts the class on `text`. It only showed
    // in a container: at the top level the paragraph collector stops for its
    // own reasons before this predicate decides anything.
    if (line[0] === '{' && tryAttrLine(lines, idx)) return true // I5
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
    if (ind(i).rest === '') { // isBlank, without re-walking the indent
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
      // Indented continuation: the line's leading run must reach COLUMN 2
      // (PART 9 SS24 C1 column arithmetic), not two literal space characters.
      // A tab from column 0 already reaches column 4, so a bare tab or a
      // space-then-tab both satisfy the floor; a single space (column 1) does
      // not. Single blank lines are allowed between continuation lines.
      while (i < n) {
        if (isFootnoteContinuationLine(lines[i])) {
          bodyLines.push(dedent(lines[i], FOOTNOTE_BODY_COLUMN))
          pullPending = false
          i++
        } else if (isBlank(lines[i]) && isFootnoteContinuationLine(lines[i + 1])) {
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
        } else break
        // NO LAZY CONTINUATION. A branch here used to fold any flush-left
        // non-blank line into the note body, citing SS16 - but SS16 grants no
        // such thing: the body is "the def line plus any following lines
        // indented by >= 2 spaces", and SS17 L4's `+` marker is the explicit
        // way to attach a flush-left block. None of the three engines folds it
        // either. The branch silently moved a document paragraph into the note
        // (and, when the note was unreferenced, deleted it outright).
      }
      if (!state.footnoteDefs.has(label)) {
        // FIRST definition wins (PART 9R state)
        const bodyBlocks = parseBlocks(bodyLines, state, false)
        if (bodyBlocks.length === 0) {
          // A body holding NO BLOCKS and a body holding one block that RENDERS
          // NOTHING are two different documents, and PART 9R R2 spells their
          // endnote items differently -- the second keeps a blank line where
          // the block was, the first has nothing to keep. This file has no
          // comment BLOCK: a comment line is skipped during layout (SS21), so
          // a body whose only content was a comment arrives here as zero
          // blocks and is indistinguishable from an empty one. All three
          // engines keep the node and emit the blank line for it, so the two
          // are told apart HERE, on the source, and the answer is carried to
          // the renderer rather than re-derived from a block count that cannot
          // carry it.
          bodyBlocks.holdsAnInvisibleBlock = bodyLines.some(
            (l) => COMMENT_LINE.test(l) || COMMENT_FENCE.test(l),
          )
        }
        state.footnoteDefs.set(label, bodyBlocks)
      }
      continue
    }
    // PART 12 §7: recognized ONLY at document level. Inside a block quote, a
    // list item or a div the line is ordinary paragraph text - an abbreviation
    // rewrites every occurrence of its term with nothing at the use site
    // pointing back, so it may not be written where quoted material lives.
    if (top && (m = ABBR_DEF.exec(line))) {
      // No empty-term guard: `+` in ABBR_DEF cannot match zero characters, so
      // one here could never fire. `*[]: x` fails the pattern and is a
      // paragraph, which is what the production says it is.
      const term = m[1]
      // LAST definition wins (PART 9R state), like linkDefs below. This was
      // first-wins here while all three engines were last-wins, and PART 9R's
      // state table said nothing either way for abbrDefs - so the one place
      // that could have settled it was the one place that was silent
      // (carve#553).
      state.abbrDefs.set(term, m[2])
      i++
      continue
    }
    const [defLine, defAttrText] = splitTrailingAttrBlock(line)
    if ((m = LINK_DEF.exec(defLine))) {
      // LAST definition wins (PART 9R state)
      state.linkDefs.set(m[1], {
        url: m[2],
        title: m[3]?.replaceAll('\\"', '"'),
        // Raw list, not a rendered string: R1 merges it with the link site's
        // own attributes per SS15 A3, which needs both lists (carve#604).
        attrs: defAttrText ? parseAttrList(defAttrText) ?? undefined : undefined,
      })
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
          push({
            t: 'raw',
            format: info.lang.slice(1),
            text: lines.slice(i + 1, close).map(stripLazy).join('\n'),
          })
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
          text: lines.slice(i + 1, close).map(stripLazy).join('\n') + (close > i + 1 ? '\n' : ''),
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
        //
        // A `=FORMAT` opener is a RAW block whether or not it is terminated.
        // Only the terminated branch above tested the prefix, so an
        // unterminated one fell through to here and rendered as code with the
        // marker still in the info string - `class="language-=html"`, which is
        // not a class any renderer emits, with the raw bytes escaped into it.
        // All three engines pass the content through in both cases (carve#1104).
        if (info.lang.startsWith('=')) {
          push({
            t: 'raw',
            format: info.lang.slice(1),
            text: lines.slice(i + 1).map(stripLazy).join('\n'),
          })
          i = n
          continue
        }
        push({
          t: 'code',
          lang: info.lang,
          title: info.title,
          text: lines.slice(i + 1).map(stripLazy).join('\n') + '\n',
        })
        i = n
        continue
      }
      // INVALID-FENCE FALLBACK: ordinary paragraph text (the backtick run
      // becomes an inline verbatim span)
    }

    // --- definition lists (:: term / :  def) ---
    // A definition list OPENS on a TERM. A `: ` description line with no term
    // above it is not an entry - `definition_item` is a term plus its
    // descriptions - and all three engines read such a line as a paragraph.
    // Opening on either marker turned `:  [r]: /u` into an empty <dd> AND
    // consumed the rest of the line as a link definition, so a reference below
    // it resolved from a line the engines leave as text.
    if (DEFLIST_TERM.test(line) && !/^:::/.test(line)) {
      const node = { t: 'deflist', items: [] }
      // A plain line that folds (as a lazy continuation) into an open term or
      // the open paragraph of a definition (SS17): not blank, not a visible
      // block, not a definition/list/fence/caption opener.
      const foldablePlain = (cur) =>
        !isBlank(cur) &&
        !startsVisibleBlock(cur) &&
        !isLinkDef(cur) &&
        !FOOTNOTE_DEF.test(cur) &&
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
            // The `/^ {3,}\S/` here is NOT a fourth spelling of
            // `definition_continuation`, and carve#893 deliberately left it in
            // characters. It bounds `term_continuation_line`, a different
            // production, and it is already divergent from every engine in the
            // OTHER direction: measured on carve-js 3d95e94, carve-php 876e312
            // and carve-rs 83ab9c1, `:: t` followed by `   more` folds into the
            // <dt> in all three while this oracle breaks the term. A tab-
            // indented `more` folds in all four. So converting this to column
            // arithmetic would break the one case the four readers agree on and
            // widen the one they do not. It wants its own measurement.
            if (isEntry(unlazy(cur)) || isBlank(cur) || CONT_MARKER.test(cur) || /^ {3,}\S/.test(cur)) break
            if (!foldablePlain(cur)) break
            // A line folded into an item BELOW its content column arrives here
            // LAZY-prefixed (the item-fold pass at C3). Strip that framing marker
            // AND its dedented residual indent before it joins the term text.
            // A line at or above the content column is NOT framed: its over-indent
            // is meaningful continuation whitespace (the engines preserve it), so
            // leave it intact -- only the LAZY (below-column) branch strips.
            const cc = cur.startsWith(LAZY)
              ? stripIndent(cur.slice(LAZY.length))
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
            bodyLines.push(stripIndent(dm[1]).replace(/[ \t]+$/, ''))
          }
          while (i < n) {
            const cur = lines[i] ?? ''
            if (isEntry(cur)) break
            if (isBlank(cur)) {
              // a blank before an indented line is an internal paragraph break;
              // otherwise the blank ends this definition body.
              if (isDefinitionContinuationLine(lines[i + 1])) { bodyLines.push(''); i++; continue }
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
            if (isDefinitionContinuationLine(cur)) {
              // indented continuation block, dedented by the content margin.
              // `dedent` carries a tab that STRADDLES the margin back as the
              // spaces it bought past column 3, so `<TAB>x` (column 4) arrives
              // one column in, exactly as ` x` after three spaces would.
              bodyLines.push(dedent(cur, DEFINITION_BODY_COLUMN))
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
            if (foldablePlain(cur)) { bodyLines.push(stripIndent(cur).replace(/[ \t]+$/, '')); i++; continue }
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
              push({ t: 'line-block', lines: body.map(stripLazy) })
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
            // A continuation row's cells ARE `table_cell`s (grammar.ebnf
            // `continuation_row`), so they carry the same space-only padding
            // slots the cells of a standard row do.
            const add = padTrim(seg)
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
            // Equivalent to `trim()` here, and spelled `padTrim` for the same
            // reason as the span fallback above: every cell that reached this
            // loop matched DELIM_CELL, which admits only spaces, `:` and `-`.
            const s = padTrim(seg)
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
      let qPara = [] // its lines, for SS12's absorption test below
      const trackFence = (l, idx) => {
        if (openFence) {
          const c = PURE_FENCE.exec(l)
          if (c && c[1][0] === openFence[0] && c[1].length >= openFence.length) openFence = null
          qOpenPara = false
          qPara = []
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
        //
        // A COLON-CLOSER-SHAPED LINE THAT IS NOT ABSORBED leaves no open
        // paragraph either, and it was the third omission (carve#920 shape C).
        // A `:::` that really acts as a fence line either CLOSES a div - which
        // closes the paragraph inside it - or, with nothing to close, OPENS an
        // empty one, and a container that has just opened holds no paragraph.
        // Either way S4's "ANY container in the open stack holds an OPEN
        // PARAGRAPH" is false after it, and falling through to
        // `else qOpenPara = true` treated the line as prose.
        //
        // The exception is SS12's absorption (carve#902, corpus 260): a bare
        // `:::` with no body after it, or one under a paragraph that already
        // holds an INVALID colon opener, is swallowed as paragraph text and the
        // paragraph stays open. That is the same predicate the block reader
        // uses, applied to the STRIPPED line and to the quote's own paragraph -
        // spelling it a second way here is how the two answers would drift.
        const absorbedColon = qOpenPara && COLON_CLOSER.test(l) &&
          !colonFenceInterrupts(l, hasFollowingBody(lines, idx), qPara)
        if (!absorbedColon &&
            (isBlank(l) || HEADING.test(l) || HR.test(l) || isOpener ||
             isColonParagraphInterrupt(l) || COLON_CLOSER.test(l) ||
             l[0] === '|' || l[0] === '{' ||
             DEFLIST_TERM.test(l) || isLinkDef(l) ||
             FOOTNOTE_DEF.test(l))) {
          qOpenPara = false
          qPara = []
        } else {
          if (!qOpenPara) qPara = []
          qOpenPara = true
          qPara.push(l)
        }
      }
      while (i < n) {
        // The MARKER is `>` plus a space, or `>` alone - the same rule the
        // QUOTE test above uses to decide the quote opens at all. This regex
        // was looser (`> ?`), so it also claimed `>bad`, stripped the marker
        // and folded the rest in: the quote came out holding `bad` where every
        // engine holds a literal `>bad`. PART 9 SS10 I1 says `>text` is prose,
        // not a quote marker, and an entry test that is stricter than the
        // consumption loop is how the two answers coexisted.
        layoutWork.quoteStrips += 1
        const qm = QUOTE.exec(lines[i])
        if (qm) {
          inner.push(qm[1] ?? '')
          trackFence(qm[1] ?? '', i)
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
        if (lines[i] !== undefined && qOpenPara && !isBlank(lines[i]) &&
            !peekInterrupts(i) && !COLON_CLOSER.test(lines[i]) && !CAPTION.test(lines[i])) {
          // lazy continuation folds into the open quoted paragraph (SS10 I6)
          //
          // A FLUSH-LEFT COLON FENCE NEVER FOLDS (carve#920 shape B).
          // `peekInterrupts` answers SS12 for a line the paragraph already
          // owns: a bare `:::` with no body after it is ABSORBED rather than an
          // interruption. That rule is written about a paragraph's OWN lines,
          // and this line is not one of the quote's - it supplies no `>`
          // prefix, so it reaches the paragraph only by S4's lazy fold. The
          // strict column-0 rule decides it instead: a flush-left fence-shaped
          // line interrupts, the quote closes, and the line is re-classified at
          // top level. All three engines already answer it that way.
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
    if (matchMarkerAt(ind(i))) {
      const before = blocks.length
      i = parseListRun(lines, i, blocks, state, peekInterrupts, ind, meas)
      if (pending.length && blocks.length > before) flushAttrs(blocks[before])
      continue
    }

    if (CONT_MARKER.test(line) && !inItem) {
      throw new Refuse('stray continuation marker')
    }
    // A `+` reaching HERE is inside a list item's body and is NOT a marker.
    // Every position where SS17 L3 makes it one is consumed before this: the
    // OUTER list's marker column by the parseListRun that collected this body,
    // and a SUB-LIST's marker column by that sub-list's own parseListRun,
    // which runs from the marker branch above. What is left is a `+` the
    // author wrote at the item's CONTENT column, which the dedent moved to
    // column 0 - so consuming it here read the content column as a marker
    // column and swallowed a marker that never existed. It is ordinary text:
    // it falls through to the paragraph below and folds with the line after
    // it, which is what all three engines do (carve#812, carve#863).

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
      // SS4, NOT SS10. A `^ ` line ends an open paragraph only where SS4 has
      // something to attach it to: a paragraph whose WHOLE content is one image
      // or one display-math span, the two hosts SS4 spells in prose. SS10's
      // interruption relation does not list a caption line at all - neither I1's
      // visible openers nor I5's invisible constructs - so anywhere else the
      // line is ordinary paragraph text and FOLDS IN, caret and all, which is
      // what all three engines do.
      //
      // This used to break on every caption line. The paragraph then ended and
      // the caret line opened a second one, and only the indented spelling was
      // in the corpus (158-indented-image-and-caption-stay-literal), where both
      // readings agree because an indented line opens nothing. The flush-left
      // form went unpinned until the canonical writer stopped force-escaping a
      // line-initial caret and `oracle(fmt(x))` parted from `oracle(x)` on a
      // document every engine agreed about (carve#1046).
      if (isCaptionableParagraph(para) && CAPTION.test(lines[i])) break
      if (lines[i][0] === '{' && tryAttrLine(lines, i)) break // SS15 A1 / SS10 I5
      if (ind(i).rest.startsWith('%%')) break // SS10 I5 (comment line or fence)
      if (inItem && para.length > 0 && matchMarkerAt(ind(i))) break // SS24 C3
      if (para.length > 0) {
        // definitions interrupt and are consumed (SS10 I5)
        if (isLinkDef(lines[i]) || FOOTNOTE_DEF.test(lines[i]) || (top && ABBR_DEF.test(lines[i]))) break
        if (startsVisibleBlock(lines[i])) break // I1
        if (isTableRow(lines[i])) break // I1: valid table row
        {
          if (colonInterruptsParagraph(lines, i, para)) break // I1/I4
        }
        const f = FENCE.exec(lines[i])
        if (f && parseFenceInfo(f[2]) && hasCloser(lines, i)) break // I4: interrupts
      }
      para.push(stripIndent(lines[i]).replace(/[ \t]+$/, ''))
      i++
    }
    const pnode = { t: 'para', lines: para }
    // image paragraph caption -> figure (PART 9 SS4; one blank line allowed)
    let j = i
    if (j < n && isBlank(lines[j] ?? '') && CAPTION.test(lines[j + 1] ?? '')) j++
    const cap = j < n && lines[j] !== undefined ? CAPTION.exec(lines[j]) : null
    if (cap) {
      // A REFERENCE image is an image: the bracket form takes a caption
      // exactly as the parenthesis form does. Only the inline form was
      // tested here, so the oracle left the caption as literal paragraph
      // text under a reference image while all three engines built the
      // figure - and nothing caught it, because every captioned-image case
      // in the corpus uses the inline form.
      if (isCaptionableParagraph(para)) {
        pnode.caption = cap[1]
        // A reference image is captionable ONLY IF IT RESOLVES, and the
        // definition may sit below it - so the decision cannot be made
        // here, in a single forward pass. Record what an unwrap would need
        // and let the post-pass below settle it once every definition is
        // known. Without that, an unresolved reference produced a figure
        // wrapped around literal text, where all three engines produce one
        // paragraph holding both lines.
        // The alt run is scanned, not matched: see `bracketRunEnd`. The label
        // that follows is a `reference_label`, which really does stop at the
        // first `]` (grammar.ebnf: `{character - ']'}`), so that half stays a
        // pattern.
        const altEnd = para[0].startsWith('![') ? bracketRunEnd(para[0], 1) : -1
        const refImage = altEnd === -1 ? null : /^\[([^\]]*)\]/.exec(para[0].slice(altEnd))
        if (refImage) {
          // KEYED THE WAY RESOLUTION KEYS IT (html.mjs, carve#648): the
          // label as written with whitespace collapsed, and the alt text
          // standing in for an empty label. Storing the raw alt instead
          // made `![ a  b][]` with `[a b]: /p.png` look unresolved here
          // while resolving there, so the figure was unwrapped and the
          // caption came back as literal text.
          // Keyed EXACTLY as resolution keys it (html.mjs): an explicit label
          // matches as written - PART 9R R1 is "case-sensitive, no whitespace
          // folding" - while the collapsed form derives its label from the alt
          // text, trimmed and collapsed. Using one rule for both directions
          // put a figure around literal text in one case and dropped a caption
          // from a resolving image in the other.
          pnode.pendingRef = refImage[1] === '' ? para[0].slice(2, altEnd - 1) : refImage[1]
          pnode.captionSrc = stripIndent(lines[j]).replace(/[ \t]+$/, '')
        }
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
  // The opener slot before the info string, and the `"header"` / `[label]`
  // slots inside it, are all PADDING and all take `space` (PART 7; carve#901):
  // each sits after the first non-whitespace character of the line, and a tab
  // is syntax only in a leading indentation run. So the leading run is stripped
  // as spaces only - ```<TAB>js leaves the tab in place, matches no shape, and
  // the line is not a fence at all. Only TRAILING whitespace keeps the wider
  // class, which is the line-ending rule rather than a slot.
  //
  // CARDINALITY IS EXACTLY ONE (carve#912). The opener slot is `[space]`, so
  // this strips at most one; it was `^ +` and stripped the whole run. The
  // second space then reaches `language_info`, whose class holds no space, and
  // the trailing-junk check below turns the line into an ordinary paragraph.
  // The `"header"` and `[label]` slots keep their `^ *` runs on purpose: those
  // are spelled `space+` in the production, and carve#912 ruled only the four
  // slots spelled with a bare `space`.
  let s = raw.replace(/^ ?/, '').replace(/[ \t]+$/, '')
  const out = { lang: '', title: null, label: null }
  const lm = /^([A-Za-z0-9\-_+#.=/]+)/.exec(s)
  if (lm) {
    out.lang = lm[1]
    s = s.slice(lm[0].length)
  }
  const tm = /^ *"([^"]*)"/.exec(s)
  if (tm) {
    out.title = tm[1]
    s = s.slice(tm[0].length)
  }
  const lb = /^ *\[([^\]]*)\]/.exec(s)
  if (lb) {
    out.label = lb[1]
    s = s.slice(lb[0].length)
  }
  if (!/^[ \t]*$/.test(s)) return null
  return out
}

/** The LAST line of a FENCED block opening at `start`, or -1 when none opens
 *  there. All three fence kinds, in one place: a CODE fence and a COMMENT fence
 *  (both opaque, so `opaqueSpanEnd` already answers them together) and a COLON
 *  fence, whose closer search skips the opaque spans nested inside it.
 *
 *  A fence with no closer returns -1 and the caller falls back to its
 *  line-by-line scan. That keeps the answer identical to the one the code-fence
 *  spelling here has always given (`findCloser` returning -1 fell through the
 *  same way), and it leaves the unterminated case where it was: no clause names
 *  it for an ATTACHED block, so it is not settled here. */
function fencedBlockEnd(lines, start) {
  const opaque = opaqueSpanEnd(lines, start)
  if (opaque !== -1) return opaque
  const cf = COLON_FENCE.exec(lines[start] ?? '')
  if (cf && parseColonOpener(cf[2]) !== null) {
    const close = findColonCloser(lines, start, cf[1].length)
    if (close !== -1) return close
  }
  return -1
}

/** Extent of the ONE flush-left block a `+` CONTINUATION MARKER attaches to its
 *  container (PART 9 SS17 L3), as an EXCLUSIVE end index.
 *
 *  L3 names "fenced code" among the block kinds a `+` may attach, and bounds the
 *  attachment "up to the next blank line, sibling marker, or a further `+`".
 *  Those bound THE BLOCK: a fenced block ends at its closer, which is what makes
 *  it one block, so a boundary line written between an opener and its closer is
 *  fence CONTENT and ends nothing. A helper that scans for a blank with no fence
 *  state consulted therefore severs a legal document, and severs it differently
 *  per container.
 *
 *  ONE SPELLING FOR EVERY CONTAINER. This rule had two spellings and only one of
 *  them knew about a fence, so the same input answered differently in a list, a
 *  block quote, a footnote and a `dd`; neither spelling knew about a colon or a
 *  comment fence, so those severed everywhere (carve#982). `endsBlock(idx)` is
 *  the only per-container part: the boundary set differs (a quote line ends the
 *  block-quote form, a sibling marker ends the list form), the fence rule does
 *  not. The caller hands lines[start..end) to parseBlocks, which owns the actual
 *  block classification. */
function oneBlockEnd(lines, start, endsBlock) {
  const fenced = fencedBlockEnd(lines, start)
  if (fenced !== -1) return fenced + 1
  let end = start
  while (end < lines.length && !endsBlock(end)) end++
  return end
}

// Parse ONE following flush-left block (for the `+` continuation marker).
function takeOneBlock(lines, start) {
  const end = oneBlockEnd(lines, start, (idx) =>
    isBlank(lines[idx]) || CONT_MARKER.test(lines[idx]) || QUOTE.test(lines[idx]))
  return { rawMarker: lines.slice(start, end), next: end }
}

// The same extent for the block a `+` marker pulls into a footnote/<dd> (SS17
// L4), whose boundary set is a blank line or a further marker.
function takePulledBlockEnd(lines, start) {
  return oneBlockEnd(lines, start, (idx) =>
    isBlank(lines[idx]) || CONT_MARKER.test(lines[idx]))
}

// --- lists: PART 9 SS11 N1-N3, SS17 L1-L4, SS24 C3/C4 ----------------------
function parseListRun(lines, i, blocks, state, peekInterrupts, ind, meas) {
  const n = lines.length
  while (i < n) {
    const head = matchMarkerAt(ind(i))
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
    i = collectItems(lines, i, list, state, ind, meas)
    finalizeOrdered(list)
    blocks.push(list)
    // a marker-mismatch sibling list continues the run (SS11 N1)
    if (i < n && matchMarkerAt(ind(i))) continue
    break
  }
  return i
}


// The marker match, taken from a line's MEASUREMENT rather than from the line.
//
// `BULLET` and `ORDERED` lead with `([ \t]*)`, so running them on the raw line
// re-walks the indentation the caller has usually just walked - twice per line
// per level in the item collector, which was half the counted work on a deep
// ladder. Run against `rest` that group matches empty and the remainder of the
// pattern is anchored at exactly the same character, so the match is the same
// match; the indent it would have reported is `col`, which the measurement
// already carries.
function matchMarkerAt(meas) {
  if (meas === undefined) return null
  const { col, rest: line } = meas
  // The saving is entirely in what this is handed. Given a line with its
  // indentation still on it the patterns match exactly the same way, at
  // exactly the same cost as before - identical output, identical counts, and
  // three times the wall clock on a deep ladder, because the walk moves inside
  // the regex engine where no counter can see it. So the contract is checked
  // rather than trusted.
  if (line !== '' && (line[0] === ' ' || line[0] === '\t')) {
    throw new Error('matchMarkerAt: indentation must be measured, not re-matched')
  }
  let m = BULLET.exec(line)
  if (m && m[3] && m[3].replace(/[{} ]/g, '') !== '' && parseAttrList(m[3]) === null) m = null
  if (m) {
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

function collectItems(lines, i, list, state, ind, meas) {
  const n = lines.length
  const baseIndent = matchMarkerAt(ind(i)).indent
  while (i < n) {
    const head = matchMarkerAt(ind(i))
    if (!head || head.indent !== baseIndent || !sameAxes(list, head)) break
    if (list.ord && list.items.length > 0) {
      // narrow the dialect set per item (SS11 N2)
      const heads = new Set(head.dialects.map((d) => d.dialect))
      list.ord.dialects = list.ord.dialects.filter((d) => heads.has(d.dialect))
    }
    let contentCol = head.indent + head.markerWidth
    const itemLines = []
    // Measurements for the body lines, carried to the item's own parse so it
    // does not re-walk indentation this collector has already walked
    // (carve#752). `null` means "not derivable here" - a line this collector
    // synthesized, or one whose run held a tab - and the inner parse walks it
    // once. Every push goes through `pushLine` so the two arrays cannot drift.
    const itemMeas = []
    const pushLine = (text, m = null) => { itemLines.push(text); itemMeas.push(m) }
    pushLine(head.text)
    const item = { }
    if (head.attrs && head.attrs.replace(/[{} ]/g, '') !== '') item.attrs = head.attrs
    if (list.task) item.checked = /^[xX]$/.test(head.task)
    // The marker line's text opens the item paragraph -- unless that text is
    // itself a construct that opens none. `. >` is an EMPTY quote, so nothing
    // is open and a later flush-left line closes the item rather than folding
    // into it (PART 1 S4, NO OPEN PARAGRAPH NO LAZY LINE; carve#576,
    // carve#582).
    let openPara = true
    // The lines of that open paragraph, for SS12's absorption test: a paragraph
    // that has already taken a MALFORMED colon fence as text absorbs the next
    // fence-shaped line as text too, so knowing the paragraph is open is not
    // enough - the collector has to know what is in it (carve#891).
    // Seeded from the MARKER LINE's own text, which is the paragraph's first
    // line and may itself be the malformed fence (`- :::note`).
    let para = [head.text]
    const closePara = () => { openPara = false; para = [] }
    const startPara = () => { openPara = true; para = [] }
    const openParaWith = (line) => { if (!openPara) para = []; openPara = true; para.push(line) }
    // A blank line was seen, and what followed it attached INVISIBLY (a comment,
    // a definition). §17 L1's second clause - an item followed by a blank line
    // before the next sibling marker - still applies when that sibling arrives,
    // so the blank is remembered rather than consumed by the attachment.
    let blankBeforeInvisible = false
    // A blank line was seen, and only invisible lines have followed it so far
    // (§17 L1b). The next PARAGRAPH closes the separation and loosens.
    let pendingSeparation = false
    {
      const headText = head.text.trim()
      if (QUOTE.test(headText)) { if ((QUOTE.exec(headText)[1] ?? '').trim() !== '') startPara(); else closePara() }
    }
    // Content column of the FIRST sub-list opened in this item (-1 = none). A
    // blank followed by content at or past this column belongs to the sub-list,
    // not this item, so a descendant's looseness must not propagate up to this
    // item (carve#322).
    let subCol = -1
    // Open fence state inside the item's own content, so an interior blank line
    // is fence content, not an item-loosening separator (carve#326 C). This is
    // deliberately an incremental tracker: only a valid opener sets state and
    // its matching closer clears it, with no lookahead for a closer. carve#985
    // requires all three fence kinds here rather than code fences alone.
    //
    // Code and comment fences are opaque. A colon fence can nest by delimiter
    // length, and an opaque fence inside it suspends changes to the colon stack
    // until that innermost span closes.
    const fence = { opaque: null, colon: [] }
    const insideFence = () => fence.opaque !== null || fence.colon.length !== 0
    const trackFence = (line) => {
      if (fence.opaque) {
        if (fence.opaque.kind === 'code') {
          const c = PURE_FENCE.exec(line)
          if (c && c[1][0] === fence.opaque.run[0] && c[1].length >= fence.opaque.run.length) {
            fence.opaque = null
          }
        } else {
          const c = COMMENT_FENCE_BODY.exec(line)
          if (c && c[1].length === fence.opaque.run.length) fence.opaque = null
        }
        return
      }

      const code = FENCE.exec(line)
      if (code && parseFenceInfo(code[2]) !== null) {
        fence.opaque = { kind: 'code', run: code[1] }
        return
      }
      const comment = COMMENT_FENCE_BODY.exec(line)
      if (comment) {
        fence.opaque = { kind: 'comment', run: comment[1] }
        return
      }
      const closer = COLON_CLOSER.exec(line)
      if (closer) {
        const len = closer[1].length
        if (fence.colon.length !== 0 && len === fence.colon[fence.colon.length - 1]) fence.colon.pop()
        else fence.colon.push(len)
        return
      }
      const colon = COLON_FENCE.exec(line)
      if (colon && parseColonOpener(colon[2]) !== null) fence.colon.push(colon[1].length)
    }
    // The item's last collected content was an invisible comment, so the item
    // is still OPEN - C3 is explicit that a comment "does not close the ITEM
    // either" (carve#618) - but holds no open paragraph.
    let afterComment = false
    {
      // A fence can open on the MARKER LINE (`- ``` `), where its opener is the
      // marker-line content, not a collected continuation line -- seed from it.
      trackFence(head.text)
    }
    i++
    // FIRST-BLOCK form (SS17 L4): a bare `+` as the sole marker-line content
    // opens an item whose body is the following flush-left block(s)
    let attachNext = false
    if (!list.task && head.text.trim() === '+') {
      itemLines.length = 0
      itemMeas.length = 0
      attachNext = true
      closePara()
    }
    const attachFlushLeft = () => {
      pushLine('', BLANK_MEAS)
      // ONE block, with the SAME extent rule every other container uses: a
      // fence runs through its closer, so a boundary line written inside one is
      // fence content (SS17 L3, carve#982). This loop used to be the blind
      // spelling - it stopped at the first blank with no fence state consulted,
      // which severed a `+`-attached fence here while a footnote body one
      // container over kept it whole.
      const end = oneBlockEnd(lines, i, (idx) =>
        ind(idx).rest === '' || CONT_MARKER.test(lines[idx]) ||
        matchMarkerAt(ind(idx))?.indent === baseIndent)
      for (; i < end; i++) {
        // attached VERBATIM, so the line keeps the measurement it has here
        pushLine(lines[i], ind(i))
      }
      pushLine('', BLANK_MEAS)
      closePara()
    }
    if (attachNext) attachFlushLeft()
    while (i < n) {
      const line = lines[i]
      // `+` at the item's MARKER column attaches ONE following flush-left
      // block to this item (SS17 L3/L4)
      const lm = ind(i)
      if (CONT_MARKER.test(line) && lm.col === baseIndent) {
        i++
        attachFlushLeft()
        continue
      }
      if (line.startsWith(LAZY)) {
        // a lazy line from an OUTER context propagates to the deepest open
        // paragraph (PART 9 SS10 I2)
        if (!openPara) break
        pushLine(line, lm)
        i++
        continue
      }
      if (lm.rest === '') {
        // A blank line INSIDE any open fence is fence content: keep it in the
        // item body and stay tight (no looseness decision).
        if (insideFence()) {
          pushLine('', BLANK_MEAS)
          i++
          continue
        }
        // decide with the NEXT content line
        let j = i + 1
        while (j < n && ind(j).rest === '') j++
        if (j >= n) { i = j; break }
        const jm = ind(j)
        const { col } = jm
        const nm = matchMarkerAt(jm)
        // A CONTINUATION MARKER survives the blank. §17 L3/L4 place the marker
        // at the item's marker column, and nothing there makes a preceding
        // blank line matter - but this branch decided the blank by what the
        // next content line MATCHED, and `+` is not a marker (§11 N1) and sits
        // below the content column, so it matched nothing at all. The item
        // ended here, the marker reached the document level, and a lone `+`
        // there is a refusal: the document was rejected rather than answered
        // (carve#867).
        //
        // The blank does not loosen. Measured, not reasoned: all three engines
        // render `- a` / blank / `+` / `c` exactly as `- a` / `+` / `c`, so
        // treating the blank as a separator here would invent a difference
        // none of them makes.
        if (CONT_MARKER.test(lines[j]) && jm.col === baseIndent) {
          i = j + 1
          attachFlushLeft()
          continue
        }
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
            pushLine('', BLANK_MEAS)
            closePara()
            i = j
            continue
          }
          const dedented = dedent(lines[j], contentCol)
          if (opensSubBlock(dedented)) {
            // sub-BLOCK after a blank: attaches, stays tight (SS17 L2)
            pushLine('', BLANK_MEAS)
            closePara()
            i = j
            continue
          }
          if (
            COMMENT_LINE.test(dedented) ||
            COMMENT_FENCE.test(dedented) ||
            FOOTNOTE_DEF.test(dedented) ||
            isLinkDef(dedented) ||
            ABBR_DEF.test(dedented) ||
            parseAttrList(dedented) !== null
          ) {
            // An INVISIBLE construct is not a second paragraph, and SS17 L1
            // asks for one: "some item holds a blank-line-separated second
            // PARAGRAPH". A comment or a definition renders nothing, so there
            // is no second paragraph to wrap, and the item stays tight.
            //
            // This fell through to the paragraph branch below, so `- a` + blank
            // + `  %% c` rendered `<li><p>a</p></li>` - an item wrapped because
            // of a line that produces no output at all. carve-rs renders every
            // one of these tight; carve-js does for two of the three.
            pushLine('', BLANK_MEAS)
            closePara()
            blankBeforeInvisible = true
            // §17 L1b: the invisible line is not a separator either, so the
            // blank line's separation survives it. If a PARAGRAPH follows, the
            // item holds a blank-line-separated second paragraph and is loose;
            // the invisible line just sits in the gap. Without this, deleting
            // the comment from `- a` / blank / `  %% n` / `  text` changed the
            // rendering of both paragraphs - a line that outputs nothing making
            // a visible difference (carve#625).
            pendingSeparation = true
            i = j
            continue
          }
          // a second PARAGRAPH inside the item -> loose (SS17 L1)
          pushLine('', BLANK_MEAS)
          list.tight = false
          startPara()
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
          pushLine('', BLANK_MEAS)
          closePara()
          i = j
          continue
        }
        i = j
        break
      }
      const { col } = lm
      const nm = matchMarkerAt(lm)
      if (col >= contentCol) {
        const dd = dedentMeasured(lm, line, contentCol)
        const dedented = dd.text
        // The body line's own measurement, derived from this one rather than
        // re-walked, and handed to the item's parse below (carve#752).
        const dmeas = dd.meas ?? indentCols(dedented)
        if (
          pendingSeparation &&
          dmeas.rest !== '' &&
          !opensSubBlock(dedented) &&
          !matchMarkerAt(dmeas) &&
          !dmeas.rest.startsWith('%%') &&
          !FOOTNOTE_DEF.test(dedented) &&
          !isLinkDef(dedented) &&
          !ABBR_DEF.test(dedented) &&
          parseAttrList(dedented) === null
        ) {
          // §17 L1b: a second paragraph, still blank-line-separated.
          list.tight = false
          pendingSeparation = false
        }
        // A bare `+` is left ALONE here, tagged neither as text nor as a
        // marker. Which one it is cannot be decided at push time: after the
        // dedent, column 0 of this body is BOTH the outer item's content
        // column (where SS17 L3 says a `+` is not a marker) and a sub-list's
        // marker column (where it is). Whether a sub-list is open there is not
        // known until the body is parsed, so the decision belongs to the inner
        // parse - `parseListRun` consumes it for a sub-list whose marker
        // column it sits at, and the block reader below leaves every other one
        // as text (carve#863).
        pushLine(dedented, dmeas)
        // Advance the incremental three-kind tracker so the blank-line branch
        // above knows whether an interior blank is fence content.
        trackFence(dedented)
        // A COMMENT IS INVISIBLE, SO IT LEAVES NO PARAGRAPH OPEN. §24 C3 says a
        // comment "does end the open PARAGRAPH" (carve#677), of BOTH spellings
        // - the `%%` line and the `%%%` fence, "whose body and closer travel
        // with its opener" (carve#634). COMMENT_LINE recognizes every one of
        // those delimiter lines, which is all the PARAGRAPH state needs: a
        // fence's CLOSER is itself comment-shaped and is the last line before
        // anything that follows the fence. The separate looseness tracker now
        // does need the span (carve#985), and matches it with
        // COMMENT_FENCE_BODY rather than `findCloser`, whose alphabet is
        // backticks and tildes.
        if (COMMENT_LINE.test(dedented)) afterComment = true
        else if (dmeas.rest !== '') afterComment = false
        // record the first sub-list's content column (carve#322)
        if (subCol < 0 && nm && nm.indent >= contentCol) subCol = nm.indent + nm.markerWidth
        // does the deepest structure now hold an OPEN paragraph that lazy
        // text may fold into? markers open a sub-item paragraph; quotes an
        // open quoted paragraph; fences/breaks close everything (SS10 I2/I6)
        if (COMMENT_LINE.test(dedented)) closePara()
        else if (FENCE.test(dedented) || HR.test(dedented)) closePara()
        // A COLON FENCE CLOSES THE PARAGRAPH ONLY IF IT INTERRUPTED IT. SS12's
        // opener test rejects `:::note` (a type word wants a separator), which
        // makes the line ordinary paragraph text and makes the paragraph absorb
        // the next fence-shaped line as text too. An absorbed fence opened no
        // block and interrupted nothing, so the paragraph is still OPEN and PART
        // 1 S4 folds a later under-indented line into it. This branch tested the
        // line's SHAPE instead, so the item ended on a fence that was prose, and
        // corpus 86-list-lazy-continuation-9 pinned that answer against S4
        // (carve#891). Same rule, same spelling, as the block reader's
        // colonInterruptsParagraph.
        else if (COLON_FENCE.test(dedented)) {
          if (colonFenceInterrupts(dedented, hasFollowingBody(lines, i), para)) closePara()
          else openParaWith(dedented)
        }
        else if (dedented[0] === '|' || CONT_ROW.test(dedented)) closePara()
        else if (matchMarkerAt(dmeas)) startPara()
        // A quote opens a paragraph only if it CARRIES one. A bare `>` is an
        // empty quote, so there is nothing for a later flush-left line to fold
        // into, and the item closes instead -- PART 1 S4's NO OPEN PARAGRAPH,
        // NO LAZY LINE (carve#576, carve#582). Testing QUOTE alone treated
        // `. >` as if a paragraph were open and swallowed the next column-0
        // line into the item.
        else if (QUOTE.test(dedented)) {
          if ((QUOTE.exec(dedented)[1] ?? '').trim() !== '') startPara()
          else closePara()
        }
        else if (dmeas.rest !== '') openParaWith(dedented)
        i++
        continue
      }
      // A FENCED BODY IS NOT A PARAGRAPH, so nothing below the content column
      // folds while one is open (PART 9 §24, carve#646). §24's STEP algorithm
      // says it twice over: a below-column line supplies none of the body's
      // indentation, so S1 MATCH PREFIXES stops at the ITEM and S2 FENCED BODY
      // never fires -- S2 wants the innermost MATCHED container to be the body.
      // S4 governs, and its lazy branch continues an open PARAGRAPH, which a
      // verbatim body is not. So the unmatched containers close: the item holds
      // an EMPTY code block and the residue re-parses in the surviving context.
      //
      // This is the SAME spelling the quote collector already uses one loop up
      // (`if (openFence) break // the innermost open block is verbatim (S2)`),
      // and the quote answer it produces is the one all three engines already
      // agree on. The item collector had no equivalent, so a below-column line
      // AND the closer folded into the code text and the fence never closed --
      // four readers, four answers, and no corpus case below the column.
      // This below-column guard retains its narrower role: only an innermost
      // opaque (code or comment) body is verbatim for S2. A colon container is
      // tracked for interior blanks above, but is not itself opaque.
      if (fence.opaque) break
      if (nm && nm.indent <= baseIndent) {
        // §17 L1, first clause: the item WAS followed by a blank line before
        // this sibling marker - an invisible attachment in between does not
        // undo that, because the clause is about the blank, not about what
        // filled the gap.
        if (blankBeforeInvisible && nm.indent === baseIndent && sameAxes(list, nm)) {
          list.tight = false
        }
        break // sibling or outer list
      }
      if (nm && nm.indent < contentCol && nm.indent > baseIndent && openPara && itemLines.length > 0) {
        // a marker BELOW the content column folds as lazy item text
        // (PART 9 SS24 C3; list markers never interrupt, SS10 I2)
        pushLine(LAZY + lm.rest, LAZY_MEAS(lm.rest))
        i++
        continue
      }
      // C3'S BELOW BRANCH PRESUMES AN OPEN PARAGRAPH, AND AFTER A COMMENT THERE
      // IS NONE. The branch says the dedented line "folds in as lazy paragraph
      // text" -- an operation, not a classification, and lazy continuation
      // continues an open paragraph (§10 I2). A comment ENDS that paragraph and
      // does NOT end the item (C3's comment exception, carve#677 and
      // carve#618), so the instruction has nothing to carry out and the marker
      // is classified in the context that survives: still inside the item, at
      // its own column 0, where C4 Rule B opens a list.
      //
      // carve-js, carve-rs and carve-php all answer this way; the executable
      // spec was the lone dissenter, folding the marker as text because it read
      // the comment fence's BODY as prose and thought a paragraph was open
      // (carve#682).
      if (nm && nm.indent < contentCol && nm.indent > baseIndent && !openPara &&
          afterComment && itemLines.length > 0) {
        pushLine(lm.rest, { col: 0, rest: lm.rest, tabs: false })
        i++
        continue
      }
      // A COMMENT IS RECOGNIZED AT ANY COLUMN. Every other construct below the
      // content column folds as text (SS24 C3), but a comment is invisible by
      // nature and authors indent one freely, so all three engines find it
      // after trimming the line wherever it sits. Folding it made `%% c`
      // VISIBLE - the one outcome a comment may never have. Pushed without the
      // LAZY frame so the item's own parse sees a comment line, which is what
      // keeps it invisible and leaves the item open for a following line
      // (carve#618).
      // A comment FENCE is a comment too. #624 exempted the `%%` line form
      // and left `%%%` folding as text, so `- a` / ` %%% n` rendered the
      // opener VISIBLY where carve-js and carve-rs drop it - the same
      // inconsistency one delimiter over (carve#629). COMMENT_LINE's `%%`
      // prefix already covers both; the fence's own body lines are indented
      // with it and follow it in.
      // A comment FENCE AT THE FRAME'S COLUMN 0 ends the item: all three
      // engines give the following line to the enclosing block, while an
      // INDENTED fence stays with the item (corpus 187, 192). The `%%` line
      // form is exempt at any column - that is carve#618, and every engine
      // agrees. Breaking rather than declining to claim the line matters:
      // falling through would fold the fence as text and make a comment
      // VISIBLE, the one outcome it may never have.
      if (!nm && COMMENT_FENCE_BODY.test(lm.rest) && lm.col === 0 && itemLines.length > 0) {
        break
      }
      if (!nm && lm.rest.startsWith('%%') && itemLines.length > 0) {
        // KEEP ONE COLUMN of the original indentation. Stripping it entirely
        // told the item's own parse that a line indented in the source had
        // been written flush left, and the rule above cannot then tell an
        // authored column-0 fence from one an enclosing dedent had clamped -
        // corpus 192 is parsed twice, once with ` %%% c` and once with the
        // stripped copy.
        pushLine(
          lm.col > 0 ? ' ' + lm.rest : line,
          lm.col > 0 ? { col: 1, rest: lm.rest, tabs: false } : lm,
        )
        // NOT `closePara()`, and not `afterComment`. C3's comment exception
        // does say a comment is recognized at ANY column and does end the open
        // paragraph - but BELOW the content column the item's following line
        // reaches the item only through the lazy fold, and closing the
        // paragraph takes that path away: corpus 189 and 192 pin `- - a` /
        // ` %% c` / ` b` with `b` inside the INNER item, which is carve#618's
        // "a following line still belongs to the item", and closing here moves
        // `b` to the outer one. So the below-column spelling answers this
        // differently from the content-column spelling, on a rule whose text
        // does not mention the comment's column. Left as it is, and recorded:
        // deciding it means moving a corpus pin (carve#682).
        i++
        continue
      }
      // A DEFINITION AT COLUMN 0 IS A DEFINITION, NOT LAZY TEXT. §24 C3's BELOW
      // branch folds "every other line", but a line at column 0 is not below a
      // column - it is AT the enclosing context's own block position, which is
      // where a definition is recognized. Folding it here made this
      // implementation the only one that reads
      //
      //     - x
      //     [^f]: y
      //
      //     see[^f]
      //
      // as item text with `see[^f]` left literal, where carve-js, carve-rs and
      // carve-php all collect the note. Ending the item hands the line to the
      // enclosing parse, which sees it at column 0 and collects it there.
      //
      // The same branch is what made a definition at the OUTER item's content
      // column fold: `- - a` / `  [^f]: x` dedents to column 0 for the inner
      // list's collector, so it arrives here (carve#635).
      //
      // ABBREVIATIONS ARE EXCLUDED, and unanimously so: `- x` / `*[A]: b` is
      // item text in all four implementations. PART 12 §7 recognizes an
      // abbreviation definition only as a direct child of the DOCUMENT, and an
      // item's body is not the document however its columns line up.
      //
      // A definition BELOW every open content column is untouched - it never
      // reaches column 0 in any collector, so it still folds as text (corpus
      // 183).
      if (!nm && lm.col === 0 && (FOOTNOTE_DEF.test(line) || isLinkDef(line))) break
      // `afterComment` joins `openPara` here for the other half of the same
      // clause: a comment ends the paragraph but not the ITEM, so a below-column
      // NON-marker line still belongs to the item -- it "begins the item's
      // SECOND paragraph rather than continuing the first" (§24 C3, carve#677).
      // All three engines fold ` # h`, ` > q`, ` ::: d` and ` | a |` after a
      // closed comment fence as item text, and only the two MARKER shapes take
      // the branch above (carve#682).
      if (!nm && (openPara || afterComment) && itemLines.length > 0 && !startsVisibleBlock(line) && !isTableRow(line) && !COLON_FENCE.test(line) && !(FENCE.test(line) && hasCloser(lines, i))) {
        // lazy fold into the open item paragraph (SS10 I2 / SS24 C3). A column-0
        // fence with a closer INTERRUPTS (I4), exactly as a column-0 quote/
        // heading does via startsVisibleBlock -- FENCE only matches at column 0,
        // so an indented (below-content) fence still folds as lazy text.
        pushLine(LAZY + lm.rest, LAZY_MEAS(lm.rest))
        i++
        continue
      }
      break
    }
    item.blocks = parseBlocks(itemLines, state, false, true, itemMeas)
    list.items.push(item)
  }
  return i
}

const dedent = (line, cols) => dedentParts(line, cols).text

function dedentParts(line, cols) {
  // strip `cols` visual columns of indentation (PART 9 SS24 C5)
  let col = 0
  let i = 0
  while (i < line.length && col < cols) {
    if (line[i] === ' ') col += 1
    else if (line[i] === '\t') col = (Math.floor(col / 4) + 1) * 4
    else break
    i++
  }
  // A TAB THAT STRADDLES THE BOUNDARY still advances to its stop, so the
  // columns past `cols` are indentation this line keeps - they come back as
  // spaces. Dropping them made a tab-indented line arrive flush where the
  // space spelling of the same column arrives indented, and SS24 C1 says the
  // two are the same claim: under `1. a` a tab reaches column 4, one past the
  // content column, where a block opener is text rather than a nested block
  // (carve-js#767, carve-php#890 - both engines had this exact bug, and so did
  // this oracle).
  layoutWork.scan += i
  layoutWork.views += 1
  if (col > cols) {
    layoutWork.pad += col - cols
    return { text: ' '.repeat(col - cols) + line.slice(i), i, col }
  }
  return { text: i === 0 ? line : line.slice(i), i, col }
}

// `dedent` plus the body line's own measurement, DERIVED rather than re-walked.
//
// This is the whole of carve#752 in the oracle. A line at depth `d` is handed
// to `d` enclosing containers, and each one used to re-walk its leading run to
// find out where its content starts - so the walk cost `O(depth)` per line per
// level, cubic in depth for a document that is quadratic in bytes. The
// enclosing container already knows the answer: it just removed `cols` columns
// from a line whose column it had measured, so the body line stands at
// `col - cols` and its content is the same string. Deriving that is O(1) and
// the walk happens once for the document rather than once per level.
//
// The subtraction `col - cols` this used to do is exact in two cases and no
// others: a run of SPACES, where a column is a character, and a `cols` that is
// a multiple of 4, where every tab stop shifts with it. Everywhere else the
// residual re-materialized as spaces moves every later stop on the line -
// `\t\tx` minus two columns reaches column 4, not column 6 - so the body line
// was walked the old way instead, once per level, and a tab ladder at a content
// column that is not a multiple of 4 stayed superlinear (carve#930: 36.78
// columns per byte at depth 200 against the space ladder's 1.96).
//
// It is now derived in every case, from SOURCE coordinates rather than from a
// column. The dedented line is `pad` spaces in front of `src.slice(start)`, and
// both move forward monotonically, so `colFrom` answers each level in O(1) off
// one table per source line. `pad` is at most 3: a straddling tab lands on a
// multiple of 4.
// Exported for tests/tab-ladder-derivation.test.mjs, which compares what this
// derives against a fresh walk of the line it produced, exhaustively.
export function dedentMeasured(m, line, cols) {
  const { text, i, col } = dedentParts(line, cols)
  // A synthesized measurement (a blank the container inserted, a lazy
  // continuation) has no source run behind it, so there is nothing to derive
  // from and the line is walked. Reachable only for lines the container wrote.
  if (!m.L) return { text, meas: indentCols(text) }
  // Consuming `i` characters eats the pad first, then the source run. Stopping
  // inside the pad leaves the rest of it in place; `col` is then exactly `cols`
  // (pad is spaces, a column each), so there is no new residual.
  const start = i <= m.pad ? m.start : m.start + (i - m.pad)
  const pad = i <= m.pad ? m.pad - i : col > cols ? col - cols : 0
  // Where the subtraction IS exact - a space run, or a strip that lands on a
  // tab stop - take it and leave the table unbuilt. The exhaustive check in
  // tests/tab-ladder-derivation.test.mjs compares the two paths on every run of
  // spaces and tabs up to length 7, so this is a shortcut rather than a second
  // rule.
  const cheap = !m.tabs || cols % 4 === 0
  return {
    text,
    meas: view(m.L, start, pad, m.tabs, cheap ? (m.col > cols ? m.col - cols : 0) : undefined),
  }
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
