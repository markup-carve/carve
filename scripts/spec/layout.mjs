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
import { labelKey } from './label-key.mjs'
import layoutTransitions from '../../resources/spec/layout-transitions.json' with { type: 'json' }

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

/**
 * PART 0's ownership-first transition table. This is intentionally independent
 * of lazy folding: callers select an owner and apply this boundary before they
 * decide how an already-owned text line extends its leaf paragraph.
 */
export function ownershipTransition(boundary, deepestParagraphOpen = false) {
  const transition = layoutTransitions.boundaries[boundary]
  if (!transition) throw new Refuse(`unknown ownership boundary: ${boundary}`)
  return {
    containerOpen: transition.containerOpen,
    paragraphOpen: transition.paragraphOpen === 'deepest'
      ? Boolean(deepestParagraphOpen)
      : transition.paragraphOpen,
  }
}

// Content after the marker+separator must carry at least one
// non-ASCII-whitespace character: `#  ` / `#   ` (marker + whitespace only) is
// NOT a heading, exactly like a caption. A leading tab is content (`# \tx` is a
// heading with `\tx`).
//
// THE MARKER SEPARATOR IS A RUN, AND NONE OF IT IS CONTENT (carve#1581). This
// read `#{1,6} `, one space, so `##<SP><SP>h` gave the heading `<SP>h` where
// all three engines give `h` - a divergence no gate could reach, because no
// corpus document, no optional-corpus case and none of the authored documents
// spells a heading with a second space after the marker. It is the same defect
// carve#1575 fixed on `CAPTION` below, one construct over, and the same two
// normative clauses settle it. PART 2's MARKER SEPARATORS AND PADDING SLOTS
// defines a marker separator as "what stands between the marker and the content
// it introduces" and rules that a writer aligning in a column "is writing
// separator, not content" (carve#892); and PART 11 §1 names MARKER ALIGNMENT
// among the spellings `fmt` may normalize while preserving what the document
// says, which is only true if the run is not content.
//
// A TAB IS STILL CONTENT. `space = ' '` (PART 1), so the run is ASCII spaces
// and the first character that is not one begins the heading text.
//
// THE ID DOES NOT MOVE WITH THE TEXT, which is worth saying because the ticket
// predicted it would: slugging drops a leading run either way, so `##<SP><SP>a
// b` was `a-b` before this and is `a-b` after. What moves is the heading's TEXT
// and therefore a crossref's auto-text (PART 9 §19).
const HEADING = /^(#{1,6}) +(?=.*[^ \t\n\r\f])(.*)$/
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
//
// THE MARKER SEPARATOR IS A RUN, AND NONE OF IT IS CONTENT (carve#1575). This
// read `^\^ `, one space, so `^   cap` gave the caption `  cap` where all three
// engines give `cap` - a divergence no gate could reach, because no corpus
// document, no optional-corpus case and none of the 85 authored documents
// spells a caption with two spaces after the caret. Two normative clauses
// settle it against this reading. PART 2's MARKER SEPARATORS AND PADDING SLOTS
// defines a marker separator as "what stands between the marker and the content
// it introduces" and rules that a writer aligning in a column "is writing
// separator, not content" (carve#892); and PART 11 §1 names MARKER ALIGNMENT
// among the spellings `fmt` may normalize while preserving what the document
// says, which is only true if the run is not content. The engines' writers do
// normalize it - `^   cap` comes back `^ cap` - so under the old reading every
// one of them was changing the document on every pass.
//
// A TAB IS STILL CONTENT. `space = ' '` (PART 1), so the run is ASCII spaces
// and the first character that is not one begins the caption: `^ <TAB>cap`
// keeps the tab, which is what the engines already do and what the heading
// comment above says for the same position.
//
// AND THE MARKER REQUIRES CONTENT, which the comment on `HEADING` above already
// claimed for this pattern - "`#  ` / `#   ` (marker + whitespace only) is NOT a
// heading, exactly like a caption" - while this pattern did the opposite. `^   `
// matched and yielded an EMPTY caption, so a quote above it became a figure
// carrying `<figcaption></figcaption>`, where all three engines leave the quote
// alone and read the line as the paragraph `^`. MARKER REQUIRES CONTENT (PART 2)
// is normative and names the shape: a marker followed by the separator and
// nothing but whitespace opens no block. The lookahead is the same one `HEADING`
// carries, for the same clause.
const CAPTION = /^\^ +(?=.*[^ \t\n\r\f])(.*?)[ \t]*$/
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
// and the wrapper below it, which decides whether the paragraph CARRIES A SLOT.
// Two copies would let those two answers drift apart, and the collector's copy
// would be the one nothing tested.
//
// SYNTACTIC ONLY, AND IT SETTLES NOTHING SEMANTIC (carve#1784). It answers
// "which paragraphs carry a caption slot at all", over the source shape, and
// returns the host kind - `'image'`, `'math'` or `null`. Whether an image host
// is a BLOCK IMAGE, and so whether its slot binds as a caption, is a property of
// the RESOLVED tree and is settled in exactly one later place: the promotion
// phase in html.mjs. Do not read this function as that answer - an unresolved
// reference image is captionable-SHAPED and is not a block image.
const CAPTIONABLE_IMAGE_TAIL = /^(?:\([^)]*\)|\[[^\]]*\])(?:\{[^}]*\})?$/
const CAPTIONABLE_MATH = /^\$\$`.*`$/
function isCaptionableParagraph(para) {
  // The whole paragraph, not its first line. An image's ALT is `brContent*`,
  // which admits a line boundary like any other inline content, so
  // `![a` / `b](/i)` is one image and one paragraph - and a paragraph whose
  // whole content is one image is exactly what §4 makes captionable. This read
  // `para[0]` behind a `para.length !== 1` guard, so the two-line spelling of
  // the same image was never captionable and never a standalone image either;
  // all three engines answer both the same as the one-line spelling
  // (carve#1352).
  //
  // THE ALT SPANS LINES, THE TAIL DOES NOT. Only `brContent` gained the
  // boundary: `link_destination` and `reference_label` are one-line
  // productions and stayed that way, so a tail carrying a newline is not an
  // image tail and the paragraph is ordinary text. Reading the join without
  // that half made `![a][r` / `x]` / `^ cap` a figure wrapping a paragraph of
  // literal text, where all three engines leave both lines as prose - the
  // tail patterns admit a newline inside `[...]` and `(...)` because they
  // never had to exclude one.
  const line = para.join('\n')
  if (CAPTIONABLE_MATH.test(line)) return 'math'
  if (!line.startsWith('![')) return null
  const altEnd = bracketRunEnd(line, 1)
  if (altEnd === -1) return null
  const tail = line.slice(altEnd)
  return !tail.includes('\n') && CAPTIONABLE_IMAGE_TAIL.test(tail) ? 'image' : null
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
const ORDERED = new RegExp(`^([ \\t]*)([0-9]+|[a-z]+|[A-Z]+|(?=\\.))([.)])(${ATTR_BLOCK})?( +)(.+)$`)
const CONT_MARKER = /^\+[ \t]*$/
// marks a lazily-folded line (PART 9 SS10 I2): always paragraph text, never
// re-classified as structure when an item's content is re-parsed
//
// STILL A NUL, and now unforgeable rather than merely unlikely: `parse` below
// replaces every U+0000 with U+FFFD before the first line is read (PART 0
// INPUT), so no document can carry the character this frame is built from.
// Until that line existed a source holding a NUL could forge the frame - the
// same collision shape as markup-carve/carve-rs#1217 (carve#1523).
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

/*
 * The index just past the blank run starting at `i`, when a footnote
 * continuation line follows it; -1 when nothing does (carve#1620).
 *
 * Spelled once rather than at the two places the definition loop needs it - the
 * test and the advance - because a fix reaching only one of them is the
 * recurring shape catalogued in carve#755.
 */
function footnoteBlankRunEnd(lines, i, n) {
  let k = i
  while (k < n && isBlank(lines[k])) k++
  return isFootnoteContinuationLine(lines[k]) ? k : -1
}

// A definition body's column is the one its OWN marker establishes: `:` plus
// the separator run, so `: ` gives 2, `:  ` gives 3 and `:    ` gives 5
// (grammar.ebnf, `definition_separator`). It is never read off the first
// continuation line. This is the bullet's rule -- `-   first` sits at column 4
// -- and the definition body used to be the one construct measuring its
// separator against a fixed width instead.
//
// One space is the CANONICAL spelling; every other marker in the language takes
// exactly one separator space. A wider run is accepted and the formatter
// narrows it, which narrows this column with it, so a canonical rewrite has to
// carry the body's continuations down by the same amount.
const DEFINITION_BODY_COLUMN = 3

// PART 9 SS24 C1/carve#893: a definition-body continuation line qualifies by
// REACHING column 3, not by starting with three literal space characters. A
// bare tab (column 0 -> 4) and a space-then-tab (column 1 -> 4) both qualify;
// two spaces (column 2) do not. This is the same rule
// `isFootnoteContinuationLine` applies one column lower, and it is spelled here
// ONCE because the character form used to be spelled three times in the
// definition-body loop below - two tests plus the dedent - and a fix reaching
// only some of them is the recurring shape catalogued in carve#755.
function isDefinitionContinuationLine(line, column = DEFINITION_BODY_COLUMN) {
  if (line === undefined) return false
  const { col, rest } = indentCols(line)
  return col >= column && rest !== ''
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
/*
 * `openRun` seeds the scanner with a verbatim run left OPEN by the row this
 * line continues (carve#1293). A `+` continuation extends the cell, so the
 * block the run reaches the end of is that whole cell - the pipes it spans on
 * the continuation row are its content, exactly as they are on the row that
 * opened it. Splitting the continuation with a fresh scanner cut the line at a
 * pipe that is inside the run, and every segment past the first was then
 * dropped for want of a column to join, which is content loss rather than a
 * different answer.
 */
function splitRow(line, openRun = 0, openRunAt = 0, kind = 'standard') {
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
  // The seed belongs to ONE column: a run left open by the row above was open
  // in that row's LAST cell, and a continuation joins per column, so the
  // columns before it are scanned normally and the pipe that ends them still
  // separates. Seeding the whole line instead swallowed those separators and
  // pushed the continuation into the wrong cell, leaving the run's own cell
  // with an empty `<code></code>` - the artifact the ruling on carve#1293
  // names as a mechanism showing through rather than an answer.
  let inCode = openRunAt === 0 ? openRun : 0 // backtick run length of an open code span
  /*
   * THE CLOSING PIPE CLOSES THE ROW EVEN WITH A VERBATIM RUN STILL OPEN
   * (carve#1284). An unclosed backtick run inside a cell used to swallow every
   * `|` after it, including the row's own closer, so `| a ``b | c d |` ended
   * with content dangling and the line was prose. All three engines read it as
   * a table whose single cell is `a ``b | c d`, with the run stopping at the
   * closer - carve-php moved last, and this reader is now the only one left on
   * the old answer.
   *
   * The closer is the last `|` on the line, trailing whitespace aside: the same
   * position the `cur.trim() !== ''` test below already treats as the end of the
   * row, so this does not widen what counts as a row - it only stops an open run
   * from eating the character that ends one.
   */
  let closerIdx = s.length - 1
  while (closerIdx >= 0 && (s[closerIdx] === ' ' || s[closerIdx] === '\t')) closerIdx--
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
    if (c === '|' && (!inCode || i === closerIdx)) {
      cells.push(cur)
      cur = ''
      if (cells.length === openRunAt) inCode = openRun
      i++
      continue
    }
    cur += c
    i++
  }
  /*
   * AN ESCAPED CLOSING PIPE IS STILL AN ESCAPE (carve#1293). `| a b \|` ends
   * in a pipe, so the row closes there; the escape decides what the CELL holds,
   * which is a literal pipe rather than an orphaned backslash. Taking the
   * escape as the terminator instead is what produced `a b <br>` in two
   * engines, and it is a POSITION EXCEPTION with nothing behind it: every
   * reader already honors `\|` in every other position of the same row, as the
   * mid-cell control beside this case shows. The one authoring consequence
   * decides it - `\|` is the only way to write a literal pipe in a cell, and
   * under the terminator reading it stops working in the position an author
   * reaches for most.
   *
   * This does not widen what counts as a row: the leftover must be the escaped
   * closer itself, so `| a | b` is prose exactly as before.
   */
  if (cur.trimEnd().endsWith('\\|')) {
    cells.push(cur)
    cur = ''
  }
  // T2: a row CLOSES with a pipe (`standard_row` ends in `'|'`). A line-initial
  // `|` with content dangling after the last pipe is prose, at a block start as
  // much as mid-paragraph -- there is no lenient open form.
  if (cur.trim() !== '') return null
  if (cells.length === 0) return null // T2: `||` has no cell
  /*
   * T2's MINIMUM-CELL GUARD IS THE STANDARD ROW'S (carve#1354). "At least one
   * cell lies between" is written of `valid_row`, the predicate that decides
   * whether a line OPENS a table and whether it interrupts a paragraph, and T2
   * says so in as many words: "this matches the `standard_row` production".
   * A continuation row opens nothing - it appends to a table already open and
   * produces no `<tr>` - so a row whose every cell is empty appends nothing,
   * which is exactly what T6 provides for ("empty cells append nothing").
   *
   * Applying the standard row's guard here made ONE clause answer twice by
   * column count: `| a | b |` over `+ | |` was absorbed and `| a |` over
   * `+ |` was published as a paragraph, because only the one-column shape
   * reaches a `cells.length === 1` test. All three engines absorb both.
   */
  if (kind === 'standard' && cells.length === 1 && cells[0].trim() === '') return null // `||`
  // `inCode` here is the run the row's closing pipe did NOT close: a
  // continuation row is scanned with it, and nothing else reads it.
  // `inCode` here is the run the row's closing pipe did NOT close, and it sits
  // in the LAST cell by construction: once open, a run swallows every `|` but
  // the closer. A continuation row is scanned with both, and nothing else
  // reads either.
  return { cells, rowAttrs, openRun: inCode, openRunAt: cells.length - 1 }
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
// line-block / hard-break block; anything else makes the line an ordinary
// paragraph line. A bare type is a class, so it admits an ASCII digit first.
function parseColonOpener(tail) {
  let s = tail
  const out = { type: null, title: null, label: null, mode: 'div' }
  if (/^[ \t]*$/.test(s)) return out // bare generic div
  if (/^[A-Za-z0-9_-]/.test(s)) return null // type words must be separated
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
  // THE SIGIL OPENERS NEED THE SEPARATOR TOO. The guard above rejects a GLUED
  // TYPE WORD, but a glued sigil is not alphanumeric and sailed past it, and
  // the strip below then removed nothing - so `:::|`, a backslash glued the
  // same way, and `:::>` all opened their block where every engine reads the
  // line as a paragraph. The separator is one `space` in the grammar for all
  // four openers alike, so whether one was actually there has to be part of
  // the test rather than assumed by the strip.
  const separated = /^ /.test(s)
  s = s.replace(/^ +/, '')
  if (separated && /^\|[ \t]*$/.test(s)) return { ...out, mode: 'line-block' }
  if (separated && /^\\[ \t]*$/.test(s)) return { ...out, mode: 'hardbreaks' }
  // A bare `>` is the fenced block-quote opener: a second SPELLING of the
  // block quote, whose body is ordinary block content (markup-carve/carve#1718).
  if (separated && /^>[ \t]*$/.test(s)) return { ...out, mode: 'quote' }
  const ty = /^([A-Za-z0-9_][A-Za-z0-9_-]*)/.exec(s)
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

/**
 * Recognize layout-transparent comments after an opaque payload has had the
 * first chance to consume the line, but before visible block ownership is
 * selected. The returned extent remains available to AST/source-layout
 * consumers even though it contributes no visible block.
 */
/*
 * DOES THIS COMMENT FENCE OPEN A SPAN? -- PART 9 §28, and PART 0's
 * COMMENTS ARE CLASSIFIED BEFORE BLOCK OWNERSHIP.
 *
 * An opener with an exact-width closer AHEAD opens a `fenced_comment`; one
 * without opens nothing and IS one `%%` line comment. The lookahead is
 * `classifyLayoutComment`'s own, extracted so the collectors that need only
 * the boolean ask the same question rather than a second spelling of it.
 */
export function commentFenceCloserAhead(lines, index, run) {
  for (let i = index + 1; i < lines.length; i++) {
    const closer = COMMENT_FENCE.exec(lines[i] ?? '')
    if (closer && closer[1].length === run.length) return true
  }
  return false
}

export function commentFenceOpensSpan(lines, index) {
  const opener = COMMENT_FENCE.exec(lines[index] ?? '')
  return opener !== null && commentFenceCloserAhead(lines, index, opener[1])
}

export function classifyLayoutComment(lines, index) {
  const opener = COMMENT_FENCE.exec(lines[index] ?? '')
  if (opener) {
    for (let i = index + 1; i < lines.length; i++) {
      const closer = COMMENT_FENCE.exec(lines[i] ?? '')
      if (closer && closer[1].length === opener[1].length) {
        return { kind: 'fenced_comment', start: index, end: i + 1 }
      }
    }
  }
  if (COMMENT_LINE.test(lines[index] ?? '')) {
    return { kind: 'line_comment', start: index, end: index + 1 }
  }
  return null
}

const CONT_ROW = /^\+.*\|[ \t]*$/ // `+` replaces the leading pipe; must close with one
const DELIM_CELL = /^ *:?-+:? *$/

/*
 * IS THIS LINE A CONTINUATION ROW? -- PART 9 SS5 T6, and PART 2 `table`.
 *
 * The SHAPE does not answer on its own. A continuation row exists only relative
 * to a table ABOVE it: T6 says a table "cannot BEGIN with a continuation row",
 * and the block reader says the same thing operationally - it enters a table
 * run on `isTableRow` alone, so a `+ ...|` line reached anywhere else falls
 * through to the paragraph collector and is published as ordinary prose.
 *
 * `isTableRow` needs no such parameter, and that asymmetry is what hid this: a
 * `|`-delimited row OPENS a table by itself, so for a standard row the shape IS
 * the context.
 *
 * The other `+` - SS17 L3's continuation MARKER - disambiguates by being alone
 * on its line. T6 cannot borrow that rule, because a continuation row REQUIRES
 * cells after the `+`, so it leans entirely on what is above it.
 *
 * Classified by shape, the oracle contradicted itself inside one document.
 * `- + a |` / `tail` published the marker line as paragraph text and then told
 * PART 1 S4 the same line was a table row, so S4 found no open paragraph and
 * `tail` left the item, where every engine folds it in (carve#1345). Both
 * answers come from here now.
 */
const isContinuationRow = (text, tableOpen) => tableOpen && CONT_ROW.test(text)

/*
 * ONE STEP OF A TABLE RUN. A row opens it, a continuation row extends it, and
 * any other line - a blank included - ends it, which is the run the block
 * reader's own table loop walks.
 *
 * `tableOpenAfter` folds it over a whole body. The list-item collector folds
 * the same step one pushed line at a time instead, because it sees its body
 * incrementally and re-walking that body per line is quadratic over a long
 * continuation run.
 */
const tableRunStep = (open, line) => isTableRow(line) || isContinuationRow(line, open)
const tableOpenAfter = (lines) => lines.reduce(tableRunStep, false)

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

// One alignment-marker run, decoded. Returns null when the marks are not a
// valid run so the caller can try a SHORTER one: `<<` is not left-plus-a-
// vertical, but its first `<` alone is a run, and only after that also fails
// the space test does the cell end up with no run at all.
function decodeAlignment(marks) {
  if (marks === '') return { align: null, valign: null }
  const [horizontalMark, verticalMark] = [...marks]
  const inheritedHorizontal = horizontalMark === '?' && marks.length === 2 && '^~v'.includes(verticalMark)
  const horizontal = '<>~'.includes(horizontalMark)
    ? (horizontalMark === '<' ? 'left' : horizontalMark === '>' ? 'right' : 'center')
    : null
  const vertical = verticalMark !== undefined && '^~v'.includes(verticalMark)
    ? (verticalMark === '^' ? 'top' : verticalMark === 'v' ? 'bottom' : 'middle')
    : null
  if (inheritedHorizontal) return { align: null, valign: vertical }
  if (horizontal !== null && (marks.length === 1 || vertical !== null)) return { align: horizontal, valign: vertical }
  return null
}

// PART 9 SS5 T11: a cell's marker run is the kind marker, the alignment run and
// the attribute block, in T10's order, and it ENDS AT A SPACE. Returns the
// decoded run plus its length, or null when the cell carries no run - either
// because it opens with content, or because what looked like a run is not
// followed by the space that terminates one. Both cases mean the same thing to
// the caller: every character of the segment is content.
//
// Candidates are tried LONGEST FIRST, because a run that fails the space test
// may contain a shorter one that passes: `|=~ x |` is header-plus-center, while
// `|=~x~ |` is neither (it is the highlight its author wrote). The kind marker
// is not tried separately - nothing shorter than `=` can start an alignment
// run, so if the `=` family fails there is no run.
function readMarkerRun(seg) {
  const header = seg[0] === '='
  const start = header ? 1 : 0
  const marks = (/^[<>~^v?]{1,2}/.exec(seg.slice(start)) || [''])[0]
  for (let len = marks.length; len >= 0; len--) {
    const alignment = decodeAlignment(marks.slice(0, len))
    if (alignment === null) continue
    const afterMarks = start + len
    // Validity decides here, not at render time: "the whole brace payload must
    // be valid attribute syntax; otherwise the `{` is literal content". Testing
    // it downstream made an invalid payload REFUSE the document instead.
    const at = new RegExp(`^\\{(${ATTR_PAYLOAD})\\}`).exec(seg.slice(afterMarks))
    const attrs = at && parseAttrBlock(`{${at[1]}}`) !== null ? `{${at[1]}}` : null
    for (const withAttrs of attrs ? [true, false] : [false]) {
      const end = withAttrs ? afterMarks + at[0].length : afterMarks
      if (end === 0) return null // no marker at all: the unpadded cell is unchanged
      if (seg[end] !== ' ') continue // a tab is not padding (PART 7), nor is the closing pipe
      return { header, align: alignment.align, valign: alignment.valign, attrs: withAttrs ? attrs : null, end }
    }
  }
  return null
}

// classify one raw cell segment
function parseCell(seg) {
  const cell = { header: false, align: null, valign: null, attrs: null, content: '' }
  const run = readMarkerRun(seg)
  // `\=` needs no case of its own: it is not `=`, so it opens no run and the
  // inline pass unescapes it into a literal `=` data cell.
  let s = seg
  if (run) {
    cell.header = run.header
    cell.align = run.align
    cell.valign = run.valign
    cell.attrs = run.attrs
    s = seg.slice(run.end)
  }
  cell.content = padTrim(s)
  // T4 SAYS THE CELL IS NOT A SPAN MARKER. IT DOES NOT SAY THE ATTRIBUTES GO
  // (carve#1463). A branch here used to CLEAR `cell.attrs` and re-read the
  // whole segment when the content was exactly `^` or `<`, so `|{.x} < |`
  // rendered `{.x} &lt;` - the author's attribute block silently became text.
  //
  // The productions above settle it: a `data_cell` consumes `cell_attributes`
  // and then its content, and nothing re-literalizes a block the cell already
  // took. The only stated route from a brace run to literal text is an INVALID
  // payload, which is decided where the block is read, a few lines up. All
  // three engines read it that way; this file was alone.
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

/*
 * DOES THIS LINE LEAVE A PARAGRAPH OPEN? -- PART 1 S4, NO OPEN PARAGRAPH, NO
 * LAZY LINE.
 *
 * S4's lazy branch asks one question and only one: does ANY container in the
 * open stack hold an OPEN PARAGRAPH. Everything else about the unmatched
 * container is irrelevant, which S4 says outright ("the fence kind is not a
 * parameter"). So the item collector needs the same predicate a paragraph
 * tracker anywhere else needs, and it needs it for the MARKER LINE too - the
 * marker line's content is the item's first block, and a heading, a table, a
 * break or a definition is not a paragraph however it got there.
 *
 * This existed only as a QUOTE special case, so `- # H` recorded an open
 * paragraph and a following column-0 line folded into an item that had none.
 * That was the whole of carve#1280: eight of eleven last-child kinds folded in
 * a list item and ended in a block quote, on a rule that names neither
 * container.
 *
 * A colon fence is deliberately absent: its BODY can hold a paragraph, so the
 * answer depends on what is inside it rather than on the opener, and S4 works
 * that case separately. A code fence is absent for the opposite reason - the
 * collector breaks on an open opaque body before it ever asks.
 *
 * `atBlockPosition` says the caller knows this text sits where a BLOCK OPENER
 * is recognized, so a marker on it really opens a nested item. It is off by
 * default because one caller cannot promise that: a `dd` body's last line may
 * be marker-SHAPED text that folded into the body's open paragraph (§10 I2 -
 * list markers never interrupt), and reading `:  a` / `   - # H` as a nested
 * list there moved a `tail` out of the `<dd>`.
 *
 * The peel is a LOOP rather than a self-call, and it carries the SAME nesting
 * budget the parse does. A self-call overflowed the JS stack on one line of
 * ~10k stacked markers, and an unbounded loop replaced that with a quadratic
 * walk - each turn re-matches the whole remaining suffix, so 8k markers cost
 * 6s where the base parse costs 21ms. §25 settles both: past
 * MAX_NESTING_DEPTH an opener DEGRADES to literal paragraph text, so a peel
 * that reaches the cap is looking at prose and says so.
 */
function opensParagraph(text, atBlockPosition = false, tableOpen = false) {
  let budget = MAX_NESTING_DEPTH
  // Whether a table is open ABOVE this line, which is the one thing the shape of
  // a continuation row cannot tell (see `isContinuationRow`). It does not
  // survive a peel, and each peel has its own reason.
  //
  // A MARKER carries its item's FIRST block, and nothing is above a first
  // block - a table written above the marker is above the ITEM, not above the
  // item's first line, and cannot reach into it.
  //
  // A QUOTE spans lines, so its content is not always its first block, and the
  // peel does not carry the quote's own line history. That history is the
  // CALLER's to supply, which is what `tableOpen` is for: a caller walking a
  // quote's lines in order knows the run and hands it in, and the quote reader
  // does exactly that per depth (`nestedQuoteOpensParagraph`). A caller with
  // only one line gets the one-line answer, and a `+ ...|` with no table it can
  // see is prose - which is carve#1345's rule rather than a shortcut.
  //
  // This comment used to record the opposite as settled, on the ground that
  // `> | a |` / `> + b |` / `tail` kept `tail` inside the quote everywhere.
  // carve#1348 moved that: the quote's own tracker carries the run now, so the
  // quote ends and `tail` is a document paragraph here and in carve-rs.
  // carve-js and carve-php have not landed it yet (carve#1355).
  let openTable = tableOpen
  for (;;) {
    if (text.trim() === '') return false
    // A quote is asked the SAME question about what it carries. An empty quote
    // opens nothing, and neither does `> # H` - the answer is the quote's own
    // last block, not merely whether the quote had any content. This used to
    // test non-emptiness alone, so `- > # H` / `tail` folded the tail into the
    // ITEM with no paragraph open anywhere in the stack. A quote's content is
    // at a block position exactly when the quote itself is, so the flag rides
    // along unchanged.
    if (budget-- <= 0) return true
    if (QUOTE.test(text)) { text = QUOTE.exec(text)[1] ?? ''; openTable = false; continue }
    if (HEADING.test(text) || HR.test(text)) return false
    // A LIST MARKER is asked the SAME question about what it carries, for the
    // same reason a quote is, and S4's clause names this case outright: the
    // rule "binds even where the unmatched container is a LIST ITEM whose last
    // block is a container". A nested item is that container, so `- # H` opens
    // no paragraph and neither does the `- - # H` that carries it.
    //
    // Asked of the marker LINE instead of its content, the answer was prose
    // every time, which is why depth 1 was already right and depth 2 was not:
    // `- # H` reached this predicate as `# H` and closed, `- - # H` reached it
    // as `- # H` and did not. `- - - # H` folded exactly one level in, the tell
    // that one turn of the peel was missing rather than the whole rule.
    //
    // The leading-whitespace guard is `matchMarkerAt`'s own precondition: it
    // requires the indentation to be measured rather than re-matched, and an
    // indented marker is a different question anyway - whether a list opens
    // there at all is the column rule, not this one.
    //
    // HR is tested first and stays first: `---` is a break, not a bullet with
    // no content. BULLET cannot match it anyway - it wants a space after the
    // marker character - so the order is belt and braces.
    if (atBlockPosition && text[0] !== ' ' && text[0] !== '\t') {
      const nm = matchMarkerAt({ col: 0, rest: text })
      if (nm) {
        text = nm.text.trim()
        openTable = false
        // A bare continuation marker is an empty FIRST-BLOCK item until a
        // following document-column-0 block is attached. It does not leave a
        // paragraph open for an enclosing collector to lazy-fold an indented
        // line into (markup-carve/carve#1436).
        if (text === '+') return false
        continue
      }
    }
    if (COMMENT_LINE.test(text) || COMMENT_FENCE_BODY.test(text)) return false
    if (isTableRow(text) || isContinuationRow(text, openTable)) return false
    if (FOOTNOTE_DEF.test(text) || isLinkDef(text)) return false
    if (tryAttrLine([text], 0)) return false

    return true
  }
}

/*
 * DOES A DEFINITION BODY SO FAR LEAVE A PARAGRAPH OPEN? -- PART 1 S4 for a `dd`.
 *
 * A flush-left line joins a `dd` only by folding into an open paragraph, so the
 * body's last block answers, exactly as it does for a list item and a quote. It
 * used to be asked of nothing at all, which let `:  {.k}` / `tail` fold `tail`
 * in and hand it an attribute the author wrote against a container that had
 * already ended (carve#1281).
 *
 * The question is asked of the trailing RUN rather than of the last physical
 * line, because A5 lets one attribute block WRAP: a body ending `{.k` / `#x}`
 * has a closing brace on its last line and is still one attribute block, and
 * classifying that line alone reads it as prose.
 *
 * The body is also where the CONTINUATION-ROW context comes from. `+ a |` as a
 * body's only line is prose and holds an open paragraph; the same line under a
 * table row is that table's last row and holds none.
 */
function bodyLeavesParagraphOpen(bodyLines, quoted = false, depth = 0) {
  let last = -1
  for (let k = bodyLines.length - 1; k >= 0; k--) {
    if (bodyLines[k].trim() !== '') { last = k; break }
  }
  // An empty body has nothing to fold into and nothing to protect: the
  // flush-left line IS the body, which is the `:  ` + pulled-block shape.
  //
  // An empty QUOTE is the opposite answer to the same emptiness, and S4 states
  // it outright: `- >` / `X` closes the item because "there is no open
  // paragraph anywhere in the stack". So the peel below cannot borrow this
  // return, and `:: t` / `:  >` / `tail` must leave the definition.
  if (last < 0) return !quoted
  for (let k = last; k >= 0 && bodyLines[k].trim() !== ''; k--) {
    if (bodyLines[k][0] !== '{') continue
    const al = tryAttrLine(bodyLines, k)
    if (al && al.next === last + 1) return false
  }

  /*
   * A QUOTE'S OWN BODY ANSWERS, AND THE PEEL HAPPENS HERE -- PART 1 S4
   * (carve#1348). S4 already says the question "is asked of a QUOTE
   * recursively" and that "its own last block answers". `opensParagraph` peels
   * a quote too, but it is handed ONE line, so a quote whose last block spans
   * lines reaches it with no history: `> | a |` over `> + b |` arrived as
   * `+ b |` with no table above it, which is prose, and the flush-left line
   * folded into a definition whose body ends in a TABLE.
   *
   * Recursing on the quote's trailing run gives the peel the history it needs
   * and needs no new rule: the body of a quote is a body like any other, so it
   * is asked the same question by the same predicate.
   *
   * ON THE SAME BUDGET `opensParagraph` PEELS WITH, and for the same reason:
   * one turn per marker on a line of ten thousand of them is a stack overflow
   * where the cap promises a DEGRADATION, and a `RangeError` out of the layout
   * automaton is exactly the outcome MAX_NESTING_DEPTH exists to prevent. Past
   * the cap an opener is literal paragraph text, so the answer there is the
   * one `opensParagraph` gives: prose, and a paragraph open.
   */
  if (QUOTE.test(bodyLines[last])) {
    if (depth >= MAX_NESTING_DEPTH) return true
    let first = last
    while (first > 0 && QUOTE.test(bodyLines[first - 1])) first--
    const inner = bodyLines.slice(first, last + 1).map((l) => QUOTE.exec(l)[1] ?? '')
    // AN EXPLICIT `>` BLANK LINE IS THE QUOTE'S OWN BLANK, and it CLOSES the
    // paragraph above it. The trailing-blank skip at the top of this function
    // is written for a definition body, where trailing blanks are the
    // separator between the body and what follows and carry no such meaning -
    // so it must not run on a peeled quote, or `:  > a` over `   >` reports
    // the paragraph `>` just ended as open and pulls the flush-left line in.
    if (inner.length > 0 && inner[inner.length - 1].trim() === '') return false
    return bodyLeavesParagraphOpen(inner, true, depth + 1)
  }

  return opensParagraph(bodyLines[last], false, tableOpenAfter(bodyLines.slice(0, last)))
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

const opensAuthoredBase = (line) => opensSubBlock(line) || isLinkDef(line) ||
  FOOTNOTE_DEF.test(line) || COMMENT_LINE.test(line) ||
  parseAttrList(line) !== null || isCaptionableParagraph([line])

/**
 * Rebase an authored block opener inside a definition or footnote body.
 * `lines` have already been stripped to the body's minimum column. A
 * recognized opener farther right establishes one local base; subsequent
 * lines at or beyond it are stripped relative to that base until a line
 * returns left of it. This measures every leading run once and preserves any
 * payload indentation beyond the opener.
 */
export function normalizeAuthoredBodyBases(lines, state = {}) {
  const out = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const measured = indentCols(line)
    const establishesBase = measured.col > 0 && opensAuthoredBase(measured.rest)
    // A LIST ITEM IS A CONTAINER TOO (carve#1781). `opensSubBlock` answers a
    // different question - whether a blank-separated sub-block leaves a list
    // TIGHT - and a list marker is deliberately absent from it there, because a
    // marker at a body's own column opens a SUBLIST rather than a sub-block.
    // Here the question is whose content the lines below belong to, and the
    // answer for a marker is the item it opens. Without this a quote written at
    // a nested item's content column was rebased to the outer body's column and
    // lifted out of the item it was written into, which is the same defect this
    // clause fixed one container kind over.
    const protectsInnermostContainer = measured.col === 0 &&
      (opensSubBlock(measured.rest) || matchMarkerAt(measured) !== null)
    if (!establishesBase && !protectsInnermostContainer) {
      out.push(line)
      continue
    }

    const base = establishesBase ? measured.col : 0
    const candidate = lines.slice(index).map((source) => {
      if (isBlank(source)) return source
      const sourceMeasured = indentCols(source)
      return sourceMeasured.col < base
        ? source
        : dedentMeasured(sourceMeasured, source, base).text
    })
    const relativeEnd = Math.max(1, firstBlockEnd(candidate, 0, candidate.length, state))
    out.push(...candidate.slice(0, relativeEnd))
    index += relativeEnd - 1
  }
  return out
}

/*
 * The LENGTH-PRESERVING half of PART 0 INPUT, exported on its own.
 *
 * PART 0 applies three transforms before the first line is read. Two of them
 * change the string's LENGTH - the BOM strip removes a codepoint, the
 * line-ending fold removes one per CRLF - and the engines report positions
 * against the source as it arrived, so a checker that slices the source must
 * NOT apply those two (that is carve#876's territory).
 *
 * The NUL replacement is one codepoint for one and moves no offset, so a
 * checker MUST apply it: `tests/ast-positions.test.mjs` sliced the raw fixture
 * and reported the NUL corpus document as a bad span while every offset in it
 * was right - the source said U+0000 where the node said U+FFFD (carve#1523).
 */
export const replaceNulls = (src) => src.replace(/\u0000/g, '\uFFFD')

function normalizeSource(src) {
  // A single leading U+FEFF is stripped before the first line is read, so
  // `<BOM># T` is a heading rather than paragraph text. All three engines do
  // this and none of them says so anywhere normative; the oracle did not, and
  // rendered the BOM'd heading as a paragraph (carve#872).
  //
  // ONE, and only at the very start: a BOM anywhere else is an ordinary
  // zero-width character, which PART 9 already says of U+FEFF on a destination
  // ("ZERO-WIDTH characters are NOT whitespace and ARE ordinary characters").
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1)
  // Every U+0000 becomes U+FFFD before the first line is read (PART 0 INPUT,
  // A NULL IS REPLACED BEFORE THE FIRST LINE IS READ; PART 9 §29 carries the
  // reasons). All three engines did this and none said so; the oracle did
  // not, and emitted the raw NUL, which no corpus document could see because
  // none carried the byte (carve#1523).
  //
  // It also makes the LAZY frame below SAFE BY CONSTRUCTION rather than by
  // luck: that frame is U+0000 'L' U+0000, and until this line existed a
  // document carrying a NUL could forge one. Nothing downstream of here can
  // hold the character, so the sentinel stays a NUL and stays unforgeable -
  // and scripts/formal-core-check.mjs can go on treating a U+0000 in the
  // OUTPUT as a framing leak, since that is now the only way one gets there.
  src = replaceNulls(src)
  // `newline = '\n' | '\r\n' | '\r'` - all three end a line, and splitting on
  // '\n' alone left the carriage return as ordinary text at the end of every
  // line, which the inline grammar then refused outright. So the oracle could
  // not read a CRLF document at all, while the production says it is one
  // (carve#872).
  src = src.replace(/\r\n?/g, '\n')
  return src
}

export function parse(src, { authoredBodyBases = true } = {}) {
  src = normalizeSource(src)
  const lines = src.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  const state = {
    linkDefs: new Map(),
    footnoteDefs: new Map(),
    abbrDefs: new Map(),
    authoredBodyBases,
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
  //
  // POSITION DECIDES WHICH RULE GOVERNS (carve#1295). Everything above is
  // about the slot BEFORE a format token. A run with NOTHING after it is not
  // that slot at all: it is trailing whitespace on a content line, PART 2
  // drops it, and what is left is the bare `---` opener. So `---<TAB>` and
  // `---<SP><TAB>` open frontmatter while `---<TAB>yaml` does not, and the
  // two clauses never need an exception written into either. `[ \t]*$` is the
  // whole of that reading, and it is deliberately spelled with the same two
  // characters PART 2's `whitespace` admits - a form feed or a no-break space
  // is CONTENT, so `---<FF>` is not an opener and falls through as before.
  if (lines[0] !== undefined && /^---(?:[ \t]*$|(?! *[^\S ])( (?! )|[A-Za-z0-9]+\s*$))/.test(lines[0])) {
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
  // inFigureGroup is the same kind of transient recursion bookkeeping (the
  // PART 9 SS4c no-nesting demotion); it is false again here, so drop it too.
  delete state.inFigureGroup
  delete state.authoredBodyBases
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
function parseBlocks(lines, state, top, inItem = false, meas = undefined, stop = undefined) {
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
    return parseBlocksImpl(lines, state, top, inItem, meas, stop)
  } finally {
    state.blockDepth--
  }
}

/*
 * PART 9 SS17 L7: `loose` on the preceding block-attribute line is a CONSUMED
 * boolean, the way SS15's `header-rows` is. It states a rendering fact about the
 * container and never reaches the output as an attribute, so it is taken off the
 * attribute lists here - at the one site that attaches them - and the caller
 * records what it said on the node.
 *
 * A bare boolean and an EMPTY-valued key are the same attribute (PART 4), so
 * both spellings are consumed. `loose=x` names a value this key does not take,
 * so it is left alone and renders as the ordinary attribute it is.
 *
 * Returns whether the key was there. Emptied lists are dropped rather than kept
 * as empty arrays, so a container whose ONLY attribute was this one renders with
 * no attribute string at all.
 */
function consumeLooseKey(node) {
  if (!node.battrs) return false
  let found = false
  const kept = []
  for (const list of node.battrs) {
    const keep = []
    for (const a of list) {
      if (a[1] === 'loose' && (a[0] === 'bool' || (a[0] === 'kv' && a[2] === ''))) {
        found = true
        continue
      }
      keep.push(a)
    }
    if (keep.length) kept.push(keep)
  }
  if (found) node.battrs = kept.length ? kept : undefined
  return found
}

function parseBlocksImpl(lines, state, top, inItem = false, seeded = undefined, stop = undefined) {
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

  /*
   * A CAPTION SLOT, WITH THE CONTINUATION LINES IT SPILLS ONTO -- PART 2,
   * MULTI-LINE CAPTIONS.
   *
   * `from` is the index just past the captionable host. The return value is
   * `null` when no caption line follows, or `{ text, next, src }`: the folded
   * caption text, the index to resume the block loop at, and the caption's
   * SOURCE lines, which an image paragraph carries UNBOUND until the promotion
   * phase runs - a slot on a paragraph that is not promoted to a block image
   * gives those lines back as ordinary paragraph text (carve#1784).
   *
   * ONE HELPER RATHER THAN FIVE COPIES, for the reason the `CAPTION` pattern
   * gives above it: five sites read this slot -- code block, figure group,
   * table, block quote and image/display-math paragraph -- and each carried
   * its own three-line spelling that read exactly one line. So the caption
   * ENDED at its own line in all five, and no corpus document holds a caption
   * with a continuation line, which is how the oracle held a reading no engine
   * and no clause shares (markup-carve/carve#1561).
   *
   * WHERE IT ENDS is the clause's own list, and the clause says outright that
   * the list is a paragraph's: "It ends the same way an open paragraph does".
   * So the ends are read from `peekInterrupts`, the §10 I1/I4/I5 predicate the
   * paragraph collector already uses, plus the two the clause names on its
   * own account:
   *
   *   - a further `^ ` line does NOT continue the caption (item 4). There is
   *     no repeated marker, so the second caret line ends this caption and,
   *     with nothing captionable above it, becomes paragraph text.
   *   - a LIST MARKER does NOT end it (item 3), which is why no marker test
   *     appears here. A caption folds `- x` in as literal text exactly as a
   *     paragraph does.
   *
   * WHAT IT DOES NOT NORMALIZE. A continuation line keeps its leading run and
   * drops only its trailing whitespace, the same treatment the caption's own
   * line gets from `CAPTION`. The clause's paragraph comparison is about the
   * EXTENT -- which lines belong to the caption -- and it enumerates the ends
   * to say so; nothing in it, and nothing in `caption_continuation_line =
   * inline_content, newline`, dedents the line. So the indented spelling is
   * left as written rather than given a normalization the text does not state.
   */
  const captionSlot = (from) => {
    let j = from
    if (j < n && isBlank(lines[j] ?? '') && CAPTION.test(lines[j + 1] ?? '')) j++
    const cap = j < n && lines[j] !== undefined ? CAPTION.exec(lines[j]) : null
    if (!cap) return null
    const text = [cap[1]]
    const src = [stripIndent(lines[j]).replace(/[ \t]+$/, '')]
    let k = j + 1
    while (k < n && !isBlank(lines[k])) {
      // A LAZY line is a paragraph continuation by construction (PART 1 S4),
      // so it folds without asking the interruption predicate anything - the
      // same short-circuit the paragraph collector takes, and for the same
      // reason: the marker it is missing is what made it lazy.
      if (lines[k].startsWith(LAZY)) {
        text.push(lines[k].slice(LAZY.length).replace(/[ \t]+$/, ''))
        src.push(lines[k].slice(LAZY.length).replace(/[ \t]+$/, ''))
        k++
        continue
      }
      for (const [re, what] of REFUSERS) {
        if (re.test(lines[k])) throw new Refuse(`${what} interrupting a caption`)
      }
      if (CAPTION.test(lines[k])) break // item 4: no repeated marker
      if (ind(k).rest.startsWith('%%')) break // §10 I5
      if (peekInterrupts(k)) break // §10 I1/I4/I5
      text.push(lines[k].replace(/[ \t]+$/, ''))
      src.push(stripIndent(lines[k]).replace(/[ \t]+$/, ''))
      k++
    }
    return { text: text.join('\n'), next: k, src }
  }

  while (i < n) {
    // SS17 L3 asks this parser where the FIRST block ends (see firstBlockEnd).
    // A block is pushed only once it is complete, so the top of the loop - the
    // one place that has consumed nothing of the next line - is where `i` is
    // exactly that boundary. Asking here costs one parse; the alternative,
    // re-parsing every prefix until one yields a single block, is quadratic in
    // the attached block's line count and reachable from ordinary input.
    if (stop !== undefined && blocks.length > 0) {
      stop.next = i
      return blocks
    }
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
      const comment = classifyLayoutComment(lines, i)
      if (comment) {
        i = comment.end
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
      // not. A blank RUN of any length is allowed between continuation lines.
      while (i < n) {
        if (isFootnoteContinuationLine(lines[i])) {
          bodyLines.push(dedent(lines[i], FOOTNOTE_BODY_COLUMN))
          pullPending = false
          i++
        } else if (isBlank(lines[i]) && footnoteBlankRunEnd(lines, i, n) !== -1) {
          // A BLANK RUN DOES NOT END THE DEFINITION -- carve#1620.
          //
          // An indented continuation belongs to the construct whose
          // indentation it matches, and a blank run ends no other indented
          // block in Carve: a list item, a quote and a container all keep an
          // indented continuation across one. A footnote definition is an
          // indented container like the others and the clause names no
          // difference, so the run is interior to the body exactly as a single
          // blank already was.
          //
          // This tested only `lines[i + 1]`, so the body ended at the SECOND
          // blank and the continuation was ejected - and ejecting relocates it,
          // since a note's body renders in the endnotes section at the foot
          // while the ejected paragraph lands at document level ABOVE it. The
          // paragraph moved backwards past unrelated blocks, which is not what
          // "the definition ended here" means.
          //
          // The WHOLE run is pushed, not one blank standing in for it: the body
          // is parsed recursively from `bodyLines`, so a run collapsed here is a
          // run that parse can never see, and §11 N1a's three-blank boundary is
          // measured inside the body like anywhere else.
          const end = footnoteBlankRunEnd(lines, i, n)
          for (let k = i; k < end; k++) bodyLines.push('')
          i = end
        } else if (CONT_MARKER.test(lines[i] ?? '')) {
          // A `+` pull-left block joins the note (SS17 L4): the following
          // flush-left block folds into the note's <li> as a new block. The
          // blank separator lets parseBlocks start it fresh. Checked BEFORE
          // lazy continuation, which would otherwise swallow the bare `+` as
          // paragraph text.
          //
          // CONTINUATION-MARKER FLUSH-LEFT MEANS COLUMN 0 (SS17 L3, carve#1436) - asked here by
          // the same predicate every other container asks (carve#1814). When
          // the next line is at any other column the `+` is NOT a marker: it is
          // an ordinary invisible line at document column 0, and this body ends
          // at it exactly as it ends at a comment line there. It is consumed
          // first, so the enclosing parse resumes on the line the marker did
          // not take rather than on a stray `+`.
          //
          // The body used to end only at column 1 and below, by way of the
          // pull branch failing to place the line - so `[^n]: a` / `+` / ` para`
          // put the paragraph in the note while the comment spelling of the
          // same document put it at document level, and at column 2 the note
          // kept it through the continuation branch without the pull branch
          // ever being asked.
          i++
          if (!attachesFlushLeft(ind(i))) break
          bodyLines.push('')
          pullPending = true
        } else if (pullPending && !isBlank(lines[i] ?? '')) {
          // the whole flush-left block pulled in by the preceding `+` marker
          const end = attachedBlockEnd(lines, i, state, attachmentBoundary(lines), ind(i))
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
      const key = labelKey(label)
      if (!state.footnoteDefs.has(key)) {
        // FIRST definition wins (PART 9R state)
        const normalizedBody = state.authoredBodyBases
          ? normalizeAuthoredBodyBases(bodyLines, state)
          : bodyLines
        const bodyBlocks = parseBlocks(normalizedBody, state, false)
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
        state.footnoteDefs.set(key, bodyBlocks)
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
      state.linkDefs.set(labelKey(m[1]), {
        rawLabel: m[1],
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
        const cap = captionSlot(i)
        if (cap) {
          node.caption = cap.text // a captioned code block is a LISTING (SS4)
          i = cap.next
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
            // The folded line is a CONTENT LINE, so its trailing whitespace run
            // is dropped before the soft break (PART 2, NO TRAILING WHITESPACE,
            // which names a definition term). Leading over-indent is a separate
            // question and is preserved by the branch above.
            dt += '\n' + cc.replace(/[ \t]+$/, '')
            i++
          }
          node.items.push({ dt })
          continue
        }
        if ((dm = /^:( +)(.*)$/.exec(cur0))) {
          const bodyColumn = 1 + dm[1].length
          // definition (dd): collect its full body, then parse it to blocks. A
          // definition body continues like a list item (SS17): lazy
          // continuations, a blank-separated indented paragraph, and a `+`
          // pull-left block (including the first-block `:  +` form) all fold
          // into the <dd>. Feeding the assembled lines to parseBlocks keeps a
          // single paragraph tight and yields a loose multi-block <dd> for the
          // rest -- matching the real output the corpus pins for all engines.
          // (`:  \+` stays a literal `+`, never a marker.)
          const bodyLines = []
          // The fold question is asked of the body AS IT WILL BE READ (§10 I5,
          // carve#1911): a block opener past the body's column is rebased to
          // the body's own column 0 before the body is parsed, so asking the
          // authored lines reported an open paragraph the body does not have.
          const asRead = (ls) => (state.authoredBodyBases ? normalizeAuthoredBodyBases(ls, state) : ls)
          i++
          // `pullPending` marks that a `+` marker (bare or the first-block `:  +`
          // form) opened a pulled-in block: the NEXT flush-left line begins it.
          // This is a distinct signal from an empty definition body, so an empty
          // `:  ` never swallows the following flush-left block.
          let pullPending = CONT_MARKER.test(dm[2].trim())
          if (!pullPending) {
            bodyLines.push(stripIndent(dm[2]).replace(/[ \t]+$/, ''))
          }
          while (i < n) {
            const cur = lines[i] ?? ''
            if (isEntry(cur)) break
            if (isBlank(cur)) {
              // a blank before an indented line is an internal paragraph break;
              // otherwise the blank ends this definition body.
              if (isDefinitionContinuationLine(lines[i + 1], bodyColumn)) { bodyLines.push(''); i++; continue }
              break
            }
            if (CONT_MARKER.test(cur)) {
              // `+` pull-left marker: the following flush-left block joins the
              // <dd>; a blank separator lets parseBlocks start a fresh block.
              //
              // CONTINUATION-MARKER FLUSH-LEFT MEANS COLUMN 0 (SS17 L3, carve#1436), asked by
              // the shared predicate (carve#1814). A `+` whose next line sits
              // at any other column is not a marker at all - it is an invisible
              // line at document column 0, and the description body ends at it
              // exactly as it ends at a comment line there. Consumed first, so
              // the enclosing parse resumes on the following line and not on a
              // stray `+`, which is a refusal at document level.
              //
              // This site had no column test, so `:: t` / `:  a` / `+` /
              // `  para` pulled a column-2 line into the `<dd>` while the
              // comment spelling of the same document left it outside.
              i++
              if (!attachesFlushLeft(ind(i))) break
              bodyLines.push('')
              pullPending = true
              continue
            }
            if (isDefinitionContinuationLine(cur, bodyColumn)) {
              // indented continuation block, dedented by the content margin.
              // `dedent` carries a tab that STRADDLES the margin back as the
              // spaces it bought past column 3, so `<TAB>x` (column 4) arrives
              // one column in, exactly as ` x` after three spaces would.
              bodyLines.push(dedent(cur, bodyColumn))
              pullPending = false
              i++
              continue
            }
            /*
             * AN EMPTY BODY CLAIMS NOTHING BELOW COLUMN 0 -- §17 L3, carve#1821.
             *
             * `CONTINUATION-MARKER FLUSH-LEFT MEANS COLUMN 0` gives the marker its own control:
             * a refused `+` behaves "exactly as if the `+` line had been a
             * comment". In the FIRST-BLOCK form `:  +` no paragraph is open, so
             * the `+` genuinely is a marker and the clause reads its payload's
             * column - and a payload at column 1 or 2 is not flush-left, so the
             * marker is refused and the body ends where the comment ends it.
             *
             * It did not, at either column, and BOTH ways of reaching the line
             * claimed it: `pullPending` attached it as the pulled block, and
             * with a gate guard on the first-block form instead - measurable
             * dead code - the fold below claimed the same line into the same
             * empty `dd`, because `bodyLeavesParagraphOpen([])` reports an
             * empty body as leaving a paragraph open. So the guard belongs
             * here, ahead of both, and not on the gate.
             *
             * The LIST ITEM is the reference: `- +` over ` flush` already
             * agrees with its comment control at columns 1 and 2 and attaches
             * at column 0, which is exactly the band this restores. Column 0 is
             * untouched - there the marker is not refused, and the first-block
             * form keeps the one flush-left block it names.
             */
            if (bodyLines.length === 0 && indentCols(cur).col > 0) break
            // flush-left line: either the block pulled in by a preceding `+` /
            // first-block marker, or a lazy continuation of the open paragraph.
            if (pullPending) {
              const end = attachedBlockEnd(lines, i, state, attachmentBoundary(lines), ind(i))
              for (let k = i; k < end; k++) bodyLines.push(lines[k])
              pullPending = false
              i = end
              continue
            }
            // BELOW THE BODY'S COLUMN THE BODY ENDS (PART 9, carve#932). The
            // question is asked of the line as the body would READ it, which is
            // dedented to the body's column 0 - not of the line as authored.
            //
            // Those two differ exactly where a block opener sits below the
            // body's column: a top-level opener must be written at column 0
            // (STRICT COLUMN ZERO), so `<SP>> q` is not a quote where it
            // stands, `foldablePlain` called on the authored line said "plain",
            // and the push then DEDENTED it to the body's column 0 - the one
            // column where it IS an opener. The line opened a quote inside the
            // `dd` that it opened nowhere else, at 1 and 2 columns only, which
            // is the band carve#1772 measured.
            //
            // Asking the dedented line instead ends the body there, and the
            // surviving top-level context classifies the authored line: below
            // column 0's strict rule it is ordinary paragraph text. Plain text
            // is unaffected at every column, because dedenting `more` yields
            // `more`.
            const dedented = stripIndent(cur).replace(/[ \t]+$/, '')
            const authoredCol = indentCols(cur).col
            /*
             * AN INVISIBLE CONSTRUCT AT DOCUMENT COLUMN 0 IS NOT LAZY TEXT --
             * the same test the item fold makes at §24 C3, for the same reason
             * (§10 I5): column 0 is not below a column, it is the surrounding
             * DOCUMENT's own opener column, which is where a definition is
             * recognized and where a floating attribute block lives. So the
             * body ends and the enclosing parse classifies the line there: the
             * definition registers in the shared table, and the attribute
             * floats forward onto the next visible block.
             *
             * The ATTRIBUTE half is what carve#1801 reported. It reached
             * `foldablePlain` below - an attribute line is neither a visible
             * block nor a definition - so it folded INTO the body, closed the
             * body's paragraph with nothing left in the body to attach to, and
             * §15 A4 discarded it. The author's characters reached neither the
             * page nor any symbol table, while the identical line under a list
             * item or a block quote attached to the following paragraph, and
             * adding one blank line above it made this host attach too. A blank
             * line is not what makes pending metadata exist (§15 A2).
             *
             * Abbreviations are excluded here exactly as they are at C3: PART 12
             * §7 recognizes one only as a direct child of the DOCUMENT, and a
             * `dd` is not the document however its columns line up.
             */
            if (authoredCol === 0 &&
                (FOOTNOTE_DEF.test(dedented) || isLinkDef(dedented) || tryAttrLine([dedented], 0))) break
            /*
             * A COMMENT BELOW THE BODY'S COLUMN ENDS IT (carve#1930). This arm
             * is only reached for a line BELOW the body's content column, and
             * §17's band sends such a line to the surviving context: the body
             * ends and the document classifies it. A comment closes the
             * paragraph above it wherever it is written, so once the body's
             * paragraph is closed and the comment is not the body's own
             * content, nothing is left open for the next line to fold into -
             * S4's ordinary answer, reached the ordinary way.
             *
             * The `dd` had no such arm at all, so a comment here folded in as an
             * invisible BODY line and the body went on collecting. Two things
             * followed. A terminated `%%%` never opened a comment BLOCK, so both
             * delimiters degraded to line comments and the text between them was
             * PUBLISHED; and a following line at the body's own column stayed in
             * the `dd` where every engine puts it outside.
             *
             * NEITHER THE KIND NOR THE COLUMN IS A PARAMETER. The `%%` line
             * form, a `%%%` with no closer ahead and a terminated `%%%` answer
             * alike, and so does a comment one or two columns in. Both narrower
             * forms were written first and every document that told them apart
             * sided with this one in all three engines.
             *
             * The ITEM collector states its half of the same rule further down,
             * and corpus 214 pins it there. AT the body's own column nothing
             * changes: that line is the body's own content and never reaches
             * here, and neither does a comment under an EMPTY body - the
             * first-block `+` branch above consumes it first, which is why
             * there is no emptiness guard on this line to go stale.
             */
            if (classifyLayoutComment(lines, i) !== null) break
            /*
             * AN INVISIBLE LINE FOLDS LIKE ANY OTHER -- NORMATIVE, and §10 I5's
             * own sentence for the same band: "at a nonzero column BELOW
             * content_column it is lazy paragraph text and does not register".
             * Both clauses say TEXT, and the plain-line control at the identical
             * column folds, so the line folds into the DESCRIPTION rather than
             * being handed to the document.
             *
             * The LAZY frame is what makes it text. Pushing the bare line let
             * the body's own parse re-recognize the construct it is shaped like,
             * which is how the three kinds came apart (carve#1800): a link or
             * footnote definition broke the body and was then published as
             * document-level paragraph text - text, but not in the container the
             * fold rule names - and an attribute line folded in as an ATTRIBUTE
             * and was discarded. A frame is a paragraph continuation by
             * construction (PART 1 S4), so neither can happen.
             *
             * The abbreviation spelling already folded, because nothing inside a
             * `dd` recognizes it; it is framed here too so all four kinds reach
             * the body by one path rather than by two that agree today.
             */
            if (authoredCol > 0 && bodyLeavesParagraphOpen(asRead(bodyLines)) &&
                !startsVisibleBlock(dedented) &&
                (isLinkDef(dedented) || FOOTNOTE_DEF.test(dedented) ||
                 ABBR_DEF.test(dedented) || tryAttrLine([dedented], 0) !== null)) {
              bodyLines.push(LAZY + dedented)
              i++
              continue
            }
            if (foldablePlain(dedented) && bodyLeavesParagraphOpen(asRead(bodyLines))) {
              bodyLines.push(dedented)
              i++
              continue
            }
            break
          }
          const normalizedBody = state.authoredBodyBases
            ? normalizeAuthoredBodyBases(bodyLines, state)
            : bodyLines
          node.items.push({ ddBlocks: normalizedBody.length ? parseBlocks(normalizedBody, state, false) : [] })
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
      // PART 9 SS17 L7: the same boolean, on the other container that has the
      // axis. A `<dd>` has no per-list tightness flag to move, so the node
      // carries the answer and the renderer wraps every description.
      if (consumeLooseKey(node)) node.loose = true
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
          if (close === -1 && body.some((l) => l.startsWith(LAZY)) && body.every((l) => isBlank(l) || l.startsWith(LAZY))) {
            // A marker-line opener whose only "body" came from below-content
            // lazy folding did not actually acquire container body lines.
            //
            // LAZY FOLDING IS THE SUBJECT, so the guard asks whether any
            // happened. It used to fire on `body.length > 0` alone, which a
            // BLANK line satisfies - and the item collector pushes exactly one
            // blank into the body while a colon fence is open, so `- ::: d`
            // followed by a blank came in here with a one-blank body and was
            // demoted to literal text. The same blank is the container's own
            // content two functions over; reading it here as evidence that no
            // body was acquired gives one line two contradictory roles inside
            // a single parse. The neighbouring spellings were all already
            // right - the opener at end of input, with its closer, with a body
            // line, and the same opener inside a quote - so only the blank
            // differed (carve#1382). A blank may still ride ALONGSIDE lazy
            // lines, which is what `isBlank` keeps covering.
          } else {
            i = close === -1 ? n : close + 1
            if (opener.mode === 'line-block') {
              push({ t: 'line-block', lines: body.map(stripLazy) })
            } else if (opener.mode === 'hardbreaks') {
              push({ t: 'hardbreaks', children: parseBlocks(body, state, false) })
            } else if (opener.mode === 'quote') {
              // The node a `>`-prefixed quote produces; the spelling differs,
              // the tree does not (markup-carve/carve#1718).
              const node = { t: 'quote', children: parseBlocks(body, state, false) }
              if (close !== -1) {
                // SS4's seventh host: the slot hangs on the CLOSING fence, as
                // the figure group's does. A quote closed by end of input has
                // no closer line to host it.
                const cap = captionSlot(i)
                if (cap) {
                  node.caption = cap.text
                  i = cap.next
                }
              }
              push(node)
            } else if (opener.type === 'footnotes') {
              // placement directive: relocates the endnotes section
              if (body.some((l) => !isBlank(l))) throw new Refuse('non-empty ::: footnotes body')
              push({ t: 'footnotes-placement' })
            } else if (opener.type === 'toc') {
              throw new Refuse('::: toc directive')
            } else if (
              opener.type === 'figure' && opener.title === null && opener.label === null &&
              !state.inFigureGroup
            ) {
              // PART 9 SS4c: a BARE `::: figure` opener is a composite figure
              // group. An opener carrying a quoted title or [label] does not
              // match figure_group_open and falls to the generic colon-div arm
              // below; a bare opener anywhere inside an open group's body is
              // demoted the same way (groups do not nest), which is what the
              // state flag carries through the recursion.
              state.inFigureGroup = true
              let children
              try {
                children = parseBlocks(body, state, false)
              } finally {
                state.inFigureGroup = false
              }
              const node = { t: 'figure-group', children }
              if (close !== -1) {
                // caption at the CLOSER (SS4's sixth host; one blank allowed).
                // A group closed by end of input has no closer line to host
                // the slot.
                const cap = captionSlot(i)
                if (cap) {
                  node.caption = cap.text
                  i = cap.next
                }
              }
              push(node)
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
      // the verbatim run the last row left open, and the column it is open in,
      // for the continuation rows below
      let openRun = 0
      let openRunAt = 0
      // T7 consumes the delimiter row, so the LINE above a `+` may be a line
      // that is not a row of this table at all. See the continuation branch.
      let afterDelimiterRow = false
      while (i < n) {
        const l = lines[i]
        if (l === undefined || isBlank(l)) break
        if (CONT_ROW.test(l)) {
          // T6: continuation row - joins per column onto the row above
          const sr = splitRow('|' + l.slice(1), openRun, openRunAt, 'continuation')
          if (!sr) break
          openRun = sr.openRun
          openRunAt = sr.openRunAt
          if (node.rows.length === 0) throw new Refuse('table begins with a continuation row')
          const prev = node.rows[node.rows.length - 1]
          /*
           * THE ROW ABOVE IS A LINE, NOT A `<tr>` (carve#1354). T6 joins a
           * continuation onto "the row ABOVE", and T7 CONSUMES the delimiter
           * row - it produces no `<tr>` and is not a row of the table - so a
           * `+` line directly under one has no row above it to join and is
           * ordinary prose. That is corpus 115, and it is the only case that
           * declines.
           *
           * This tested `prev.cells.every((c) => c.header)` instead, which
           * gets 115 right for the wrong reason and gets the NATIVE header
           * spelling wrong: `|=a |` over `+ b |` was published as a PARAGRAPH
           * where all three engines join it onto the header cell, and
           * `| a |` over `|=b |` over `+ c |` joins onto an all-header row in
           * every reader including this one. Header-ness was never the
           * discriminator - a delimiter row between the two lines is, and it
           * declines a NATIVE header row just the same (`|=a |` / `| - |` /
           * `+ cont |` is prose in all three). T9 says the rest outright: a
           * `^` rowspan may reach a header cell, so a header cell is an
           * ordinary cell in every other table mechanism.
           */
          if (afterDelimiterRow) break
          sr.cells.forEach((seg, ci) => {
            // A continuation row's cells ARE `table_cell`s (grammar.ebnf
            // `continuation_row`), so they carry the same space-only padding
            // slots the cells of a standard row do.
            const add = padTrim(seg)
            const cell = prev.cells[ci]
            if (add === '' || cell === undefined) return
            if ((cell.content === '^' || cell.content === '<') && cell.attrs == null) {
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
        openRun = sr.openRun
        openRunAt = sr.openRunAt
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
          afterDelimiterRow = true
          i++
          continue
        }
        const row = { cells: sr.cells.map(parseCell), rawCells: sr.cells, rowAttrs: sr.rowAttrs }
        node.rows.push(row)
        afterDelimiterRow = false
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
      const cap = captionSlot(i)
      if (cap) {
        node.caption = cap.text
        i = cap.next
      }
      push(node)
      continue
    }
    // a stray `+ ... |` line is ordinary paragraph text (corpus 113)

    // --- block quote ---
    if (QUOTE.test(line)) {
      const inner = []
      let openFence = null // run string of a fence opened inside the quote
      let openComment = null // exact-width comment fence opened inside the quote
      let prevBlank = true // fences open only at BLOCK START (I4 otherwise)
      let qOpenPara = false // does the quote currently end in an open paragraph?
      let qPara = [] // its lines, for SS12's absorption test below
      /*
       * IS A TABLE OPEN INSIDE THE QUOTE? -- PART 9 SS5 T6 (carve#1348).
       *
       * `l[0] === '|'` below clears the open paragraph because a table row is a
       * block, and a CONTINUATION ROW is one too: T6 gives it `table_cell`s and
       * appends them onto the row above. It was missing here, so a quote ending
       * on one recorded an open paragraph and the flush-left line below folded
       * in - while the SAME quote ending on a standard row closed. One
       * question, answered by how the last row was spelled.
       *
       * It needs the run because the shape alone does not answer: with no table
       * above it a `+ ...|` line IS prose (carve#1345). This loop already walks
       * the quote's own lines in order, so it can carry the run one line at a
       * time and needs no lookahead.
       */
      let qTableOpen = false
      /*
       * The same run, one level down and per depth: a nested quote's own table
       * state. `opensParagraph` is handed ONE line and cannot see it, so the
       * outer tracker carries it here and hands it back in - which is what
       * lets `> > | a |` / `> > + b |` be read as the table it is rather than
       * as prose.
       */
      const qNestedTable = []
      /*
       * DOES THE NESTED QUOTE ON THIS LINE LEAVE A PARAGRAPH OPEN?
       *
       * Peels one marker per level, advancing that level's table run as it
       * goes, and asks `opensParagraph` about the innermost text with the run
       * as it stood BEFORE that text - a continuation row is a row relative to
       * what is above it, never to itself, which is the same order the outer
       * loop uses for its own rows.
       */
      const nestedQuoteOpensParagraph = (line) => {
        let text = line
        let depth = 0
        while (QUOTE.test(text)) {
          text = QUOTE.exec(text)[1] ?? ''
          const before = qNestedTable[depth] ?? false
          qNestedTable[depth] = tableRunStep(before, text)
          depth++
          // A run this line does not reach has ENDED, so its state is not a
          // run any more. Keeping it let a later quote at the same depth
          // inherit a table that closed before it: `> > | a |` / `> # H` /
          // `> > + b |` opens a NEW inner quote whose first line is prose, and
          // the stale run read it as a continuation row and ended the quote.
          if (!QUOTE.test(text)) {
            qNestedTable.length = depth
            return opensParagraph(text, false, before)
          }
        }
        qNestedTable.length = depth

        return opensParagraph(text)
      }
      const trackFence = (l, idx) => {
        if (openComment !== null) {
          const c = COMMENT_FENCE_BODY.exec(l)
          if (c && c[1].length === openComment) openComment = null
          qOpenPara = false
          qTableOpen = false
          qPara = []
          return
        }
        if (openFence) {
          const c = PURE_FENCE.exec(l)
          if (c && c[1][0] === openFence[0] && c[1].length >= openFence.length) openFence = null
          qOpenPara = false
          qTableOpen = false
          qPara = []
          return
        }
        const comment = COMMENT_FENCE_BODY.exec(l)
        if (comment) {
          for (let j = idx + 1; j < n; j++) {
            const quoted = QUOTE.exec(lines[j] ?? '')
            if (!quoted) break
            const close = COMMENT_FENCE_BODY.exec(quoted[1] ?? '')
            if (close && close[1].length === comment[1].length) {
              openComment = comment[1].length
              break
            }
          }
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
        // Asked with the run as it stood BEFORE this line, then advanced: a
        // continuation row is a row relative to what is above it, never to
        // itself.
        const contRow = isContinuationRow(l, qTableOpen)
        qTableOpen = tableRunStep(qTableOpen, l)
        /*
         * A QUOTE INSIDE A QUOTE IS ASKED WHAT IT ENDS ON -- PART 1 S4
         * (carve#1355). S4 puts the question to a quote RECURSIVELY and says
         * "its own last block answers"; this loop reads the OUTER quote's
         * stripped lines, so a line still beginning with `>` is an inner
         * quote's line and fell into the prose branch below whatever that
         * quote ends on.
         *
         * The one-level spelling already answers correctly here, which is what
         * makes this a contradiction rather than a gap: `> # H` over `tail`
         * ends the quote in all four implementations, and `> > # H` over
         * `tail` kept `tail` in the OUTER quote in three of them - as a
         * paragraph continuing nothing, since the outer quote's last block is
         * the inner quote and the inner quote's is a heading.
         *
         * `opensParagraph` is the same predicate the item collector uses and
         * it already recurses through the marker, so the two containers cannot
         * drift apart on the nested spelling the way they did on the bare one.
         */
        // Every depth ends when a line stops supplying its marker, so a line
        // that is not a nested quote at all clears the whole ladder.
        if (!QUOTE.test(l)) qNestedTable.length = 0
        const nestedQuoteEnds = QUOTE.test(l) && !nestedQuoteOpensParagraph(l)
        if (!absorbedColon &&
            (isBlank(l) || HEADING.test(l) || HR.test(l) || isOpener ||
             isColonParagraphInterrupt(l) || COLON_CLOSER.test(l) ||
             l[0] === '|' || l[0] === '{' || contRow || nestedQuoteEnds ||
             DEFLIST_TERM.test(l) || isLinkDef(l) || COMMENT_LINE.test(l) ||
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
        if (openFence || openComment !== null) break // the innermost open block is verbatim (S2)
        if (lines[i] !== undefined && CONT_MARKER.test(lines[i])) {
          // PART 9 SS17 L4: `+` at column 0 attaches ONE following block
          i++
          // ... and CONTINUATION-MARKER FLUSH-LEFT MEANS COLUMN 0 says WHICH block, asked in
          // `attachedBlockEnd` where every container asks it (carve#1814). A
          // QUOTE IS REACHED BY ITS MARKER, AND A COLUMN NEVER REACHES INTO ONE
          // (SS10 I5, carve#1384): a column-2 line under `> a` is in no quote,
          // and with no gate here the marker reached out and took it anyway.
          //
          // A refused marker is consumed and contributes NOTHING - no blank
          // separators, because a separator would close the quote's open
          // paragraph, and the clause says the line behaves as if the `+` had
          // been a comment. The quote does not END at it the way a footnote
          // body or a `<dd>` does: those two end at a comment line in that
          // position and a quote does not, and the difference belongs to each
          // container's invisible-line rule rather than to the marker.
          const attached = takeOneBlock(lines, i, state, ind(i))
          if (attached.next > i) {
            // blank separators force the attached lines to parse as their own
            // block instead of lazily folding into the open paragraph
            inner.push('', ...attached.rawMarker, '')
            i = attached.next
          }
          continue
        }
        // A COMMENT IS COLUMN-EXEMPT (§10 I5's first exception, §24 C3). The
        // other four invisible kinds are ordinary text below a column and fold;
        // a comment stays invisible at ANY column, and folding one would make it
        // VISIBLE -- the one outcome a comment may never have. `peekInterrupts`
        // is the I5 predicate for the four that fold, so it does not answer for
        // a comment; the caption slot carries the same extra arm one construct
        // over, and the quote's own marker-line tracker above already tests
        // COMMENT_LINE. This branch was the only reader of an unmarked line that
        // never asked, so `> x` over `%% c` published the comment's own text as
        // quoted prose where all three engines drop it (carve#1899).
        //
        // The line is not framed here: the item collector pushes a comment
        // UNFRAMED for exactly this reason, so a comment reaching a nested quote
        // still arrives as itself.
        if (lines[i] !== undefined && qOpenPara && !isBlank(lines[i]) &&
            !COMMENT_LINE.test(lines[i]) &&
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
          //
          // AND IT ARRIVES LAZY-FRAMED. The line supplies no `>` prefix, so it
          // is not the quote's own content and its COLUMN inside the quote body
          // means nothing - it reached the paragraph by S4's fold and is
          // paragraph text wherever it landed. Pushed raw, the quote's own parse
          // read it by column instead, and a definition that happened to line up
          // with an inner list item's content column REGISTERED there and
          // rendered nowhere: `> - x` over `  [r]: /url` defined `r` while
          // `> x` over the same line folded it as text. One line, two answers,
          // decided by what the quote's body happened to be (carve#1384).
          //
          // Same framing the item collector uses for the same reason at §24 C3.
          // A line that reached HERE already framed came from an outer
          // collector's own fold; framing it twice leaks the sentinel into the
          // rendered text, which the paragraph collector strips only once.
          inner.push(lines[i].startsWith(LAZY) ? lines[i] : LAZY + ind(i).rest)
          i++
          continue
        }
        break
      }
      const children = parseBlocks(inner, state, false)
      const node = { t: 'quote', children }
      // caption -> <figure><blockquote/><figcaption> (PART 9 SS4)
      const cap = captionSlot(i)
      if (cap) {
        node.caption = cap.text
        i = cap.next
      }
      push(node)
      continue
    }

    // --- lists ---
    if (matchMarkerAt(ind(i))) {
      const before = blocks.length
      i = parseListRun(lines, i, blocks, state, peekInterrupts, ind, meas)
      if (blocks.length > before) {
        if (pending.length) flushAttrs(blocks[before])
        // PART 9 SS17 L7: the consumed boolean loosens the list it rides.
        if (consumeLooseKey(blocks[before])) blocks[before].tight = false
      }
      continue
    }

    // A `+` reaching HERE is NOT a marker, in any container.
    //
    // THE FIRST-BLOCK FORM IS THE LIST ITEM AND THE DESCRIPTION, and nothing
    // else. SS17 L4 spells it for those two - `- +` and `:  +` open a body
    // whose content is the following flush-left block - and a footnote body and
    // a block quote have no such form. A `+` that opens one of THOSE bodies is
    // ordinary text, and its payload lands wherever the ordinary column rules
    // put it, which is a different answer from "place by column" rather than a
    // narrower one.
    //
    // This used to Refuse the whole document, `stray continuation marker`, and
    // that was the one implementation of four saying so: carve-js, carve-php and
    // carve-rs render the text, agreeing byte for byte, at every payload column
    // (carve#1821). The refusal was not even a conservative reading of the
    // shipped form - it fired at COLUMN 0 too, the one column where the
    // first-block form attaches cleanly in the two containers that have it.
    //
    // And it was never scoped to those two containers: every caller but the list
    // item's own body reaches here, so a lone `+` refused the document at top
    // level, in a `:::` div, in a line block, in a `dd` below its first block
    // and in every nesting of those. All twenty measured shapes now agree with
    // the engines.
    //
    // IN A LIST ITEM'S BODY it was never a marker either, for a separate reason.
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
    // AN UNBOUND CAPTION SLOT, NOT A CAPTION (PART 9 SS4; one blank line
    // allowed). carve#1784: block-image status is a property of the RESOLVED
    // tree, so the slot cannot BIND here - a reference image is a block image
    // only if it resolves, and its definition may sit anywhere below. The old
    // shape attached the caption optimistically, recorded `pendingRef` and
    // `captionSrc` as undo data on the node, and a post-pass in `parse` took
    // the figure apart again when the reference turned out not to resolve.
    //
    // So the slot is carried unbound - its folded TEXT, its SOURCE lines and
    // the host kind the syntactic filter found - and the promotion phase in
    // html.mjs settles it once, after resolution: it binds as a caption on a
    // promoted block image, and otherwise its source lines go back to the
    // paragraph as ordinary text. Nothing is built that has to be dismantled.
    //
    // A REFERENCE image is an image: the bracket form takes a caption exactly
    // as the parenthesis form does. Only the inline form was tested here, so
    // the oracle left the caption as literal paragraph text under a reference
    // image while all three engines built the figure - and nothing caught it,
    // because every captioned-image case in the corpus uses the inline form.
    const cap = captionSlot(i)
    if (cap) {
      const host = isCaptionableParagraph(para)
      if (host !== null) {
        // EVERY line of the caption, not the marker line alone. A slot that is
        // not promoted gives these back to the paragraph, so a caption that
        // spilled onto a continuation line has to give all of them back or the
        // document loses a line (PART 2, MULTI-LINE CAPTIONS).
        pnode.captionSlot = { host, text: cap.text, src: cap.src }
        i = cap.next
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

/*
 * WHERE THE FIRST BLOCK OF A REGION ENDS -- SS17 L3's ONE BLOCK.
 *
 * `oneBlockEnd` computes the marker's EXTENT: the furthest the attachment may
 * reach, bounded by a blank line, a sibling marker or a further `+`. That is not
 * a count, and reading it as one is what made a single `+` attach a whole run of
 * blocks: the extent of `para` / `> q` is both lines, and handing both to the
 * block parser produces TWO blocks (carve#1290).
 *
 * The boundary is found by ASKING THE BLOCK PARSER rather than by re-deriving
 * block segmentation here, which would be a second spelling of a rule this file
 * already owns - and the way a rule with two spellings drifts.
 *
 * ONE parse, not one per prefix. `parseBlocks` takes a `stop` object and returns
 * at the top of its loop as soon as one block is complete, which is the only
 * point in the walk that has consumed nothing of the next line. Probing prefixes
 * instead - the shortest that yields a single block - gives the same answer and
 * is quadratic in the attached block's line count, reachable from ordinary input
 * on a long wrapped paragraph.
 *
 * The parse uses a THROWAWAY state. `parseBlocks` collects definitions into the
 * symbol table as it goes and the real parse of these lines happens afterwards,
 * so sharing the state would register every definition in the region twice.
 */
function firstBlockEnd(lines, start, limit, state) {
  if (limit - start <= 1) return limit
  const stop = { next: limit - start }
  const seen = {
    linkDefs: new Map(),
    footnoteDefs: new Map(),
    abbrDefs: new Map(),
    blockDepth: state.blockDepth ?? 0,
    measuringAuthoredBlock: state.measuringAuthoredBlock ?? false,
  }
  try {
    parseBlocks(lines.slice(start, limit), seen, false, true, undefined, stop)
  } catch {
    // Outside the executable subset: the extent is the honest answer, and the
    // real parse of these lines raises the same refusal where it belongs.
    return limit
  }
  return foldedDefinitionEnd(lines, start, start + stop.next, seen)
}

/*
 * SS10 I5 SPENDS THE LAZY FOLD FIRST, so a block's extent ends above a
 * definition the block can only take as TEXT -- carve#1918.
 *
 * This measurement parses the block ALONE, where a definition below the block's
 * own content column is ordinary lazy paragraph text and the extent swallows
 * it. The block is not alone: PART 0's OWNERSHIP PRECEDES REBASING gives the
 * base to the innermost open container whose content column the opener REACHES,
 * and a line that reaches the surrounding container but not this block is the
 * container's. SS10 I5 is what makes that a definition rather than text -- at a
 * container's content column a definition INTERRUPTS the open paragraph and
 * registers, so the fold this measurement relied on is already spent.
 *
 * REGISTRATION IS THE TEST, not the column, because the column alone cannot
 * answer it: inside the block a definition at a nested item's content column is
 * genuinely the block's and registers there. The parse above already carries the
 * answer in its own tables, so this costs one pass and no second parse.
 *
 * A definition at the block's column 0 is the block's by construction and is
 * never a candidate. A REPEATED key is, because first-wins registration makes
 * the table no evidence for the second line: the label is in it either way, so
 * without this the second spelling of one label would stay folded and publish
 * its own characters as text.
 *
 * AN OPAQUE PAYLOAD IS NOT SCANNED, and this walk has to say so itself: it is
 * handed a line slice rather than a parse, so a `[r]: /url` written INSIDE a
 * code, raw or comment fence looks exactly like one written beside it. The
 * block never registers verbatim content, so every such line read as folded and
 * the block was cut in half inside its own fence -- `- a` / `+` / a fence
 * holding one came out as an EMPTY code block plus a paragraph carrying the
 * definition and the closing run. The span is tracked with the same opener and
 * closer tests the item collector's `trackFence` uses: a code or raw fence
 * closes on a pure run of its own character at or past its length, a comment
 * fence on an EXACT-width run (SS28).
 *
 * AN OPENER WITH NO CLOSER IS STILL OPAQUE, and requiring one here is wrong:
 * an unterminated code or raw fence runs to the end of its container rather
 * than falling back to prose, so scanning its payload cuts the fence in half.
 * `trackFence` records the span the same way, unconditionally. The comment
 * fence is the one that differs -- SS28 gives an unterminated `%%%` no span at
 * all -- which is why only that branch asks for a closer ahead.
 */
function foldedDefinitionEnd(lines, start, end, seen) {
  const claimed = new Set()
  let opaque = null
  for (let k = start; k < end; k++) {
    const line = lines[k]
    if (line === undefined || isBlank(line)) continue
    const { col, rest } = indentCols(line)
    if (opaque) {
      if (opaque.kind === 'code') {
        const c = PURE_FENCE.exec(rest)
        if (c && c[1][0] === opaque.run[0] && c[1].length >= opaque.run.length) opaque = null
      } else {
        const c = COMMENT_FENCE_BODY.exec(rest)
        if (c && c[1].length === opaque.run.length) opaque = null
      }
      continue
    }
    const code = FENCE.exec(rest)
    if (code && parseFenceInfo(code[2]) !== null) {
      opaque = { kind: 'code', run: code[1] }
      continue
    }
    const comment = COMMENT_FENCE_BODY.exec(rest)
    if (comment && commentFenceCloserAhead(lines, k, comment[1])) {
      opaque = { kind: 'comment', run: comment[1] }
      continue
    }
    const footnote = FOOTNOTE_DEF.exec(rest)
    const link = isLinkDef(rest) ? LINK_DEF.exec(splitTrailingAttrBlock(rest)[0]) : null
    if (!footnote && !link) continue
    const key = labelKey(footnote ? footnote[1] : link[1])
    const table = footnote ? seen.footnoteDefs : seen.linkDefs
    const kind = footnote ? 'f' : 'l'
    if (col > 0 && (claimed.has(kind + key) || !table.has(key))) return k
    claimed.add(kind + key)
  }
  return end
}

/*
 * THE MARKER IS ONE OPERATION -- PART 9 SS17 L3, carve#1782.
 *
 * `+` transfers ownership of the NEXT flush-left block to the container whose
 * marker column the line sits at, and every container reaches that block the
 * same way: measure the marker's EXTENT - a blank line, a further `+`, or a
 * sibling marker of that container - then narrow it to the ONE block L3 counts.
 *
 * WHAT THE ATTACHED BLOCK IS is not a parameter of the operation. This file
 * held FOUR spellings of the extent, and only three of them narrowed: a `+` in
 * a footnote body or a `<dd>` attached everything up to the boundary, so L3's
 * own example - `+` / `para` / `> q` - gave the quote to the note and left it
 * outside the item one container over. The other spelling tested QUOTE, so a
 * `+` inside a block quote declined to attach a following quote line and the
 * marker did nothing at all, where L3 says the marker only ever ATTACHES.
 *
 * AND WHICH LINE IT REACHES is not a parameter of the operation either
 * (carve#1814). `CONTINUATION-MARKER FLUSH-LEFT MEANS COLUMN 0` (SS17 L3, carve#1436) says the
 * marker attaches a block that BEGINS AT COLUMN 0 and nothing else; a line at
 * any other column is not attached at all and falls through to the ordinary
 * column rules, which give it to whichever container its own column names,
 * exactly as if the `+` line had been a comment. That gate was spelled TWICE -
 * once in the list item's `attachFlushLeft`, once in the item collector's
 * nested-attachment guard - and the other three attach sites had no equivalent,
 * so a `<dd>` pulled a column-1 or column-2 line in, a footnote body pulled a
 * column-1 line in, and a block quote reached out for a column-2 line that
 * `A QUOTE IS REACHED BY ITS MARKER` (SS10 I5, carve#1384) puts in no quote at
 * all. Both readers agreed with each other on all of it, because the corpus
 * only ever asked the container that had the gate (carve#1814).
 *
 * So the gate is asked HERE, once, off the SOURCE column: `firstMeas.L` is the
 * measured line's own record and `L.col` is its DOCUMENT column, no matter how
 * many strips the frame is behind. A frame-relative `ind(i).col` cannot answer
 * it - inside a container that is the column the strip left, not the column the
 * author wrote - which is why both surviving spellings read `.L.col`.
 *
 * A refused attachment returns `start`, an EMPTY range. Every caller reads that
 * as "the marker attached nothing" and lets its own ordinary rules have the
 * line; the marker line is still consumed and still contributes nothing, which
 * is exactly what the clause's comment spelling does.
 */
const attachesFlushLeft = (firstMeas) =>
  !!firstMeas && (firstMeas.L ? firstMeas.L.col : firstMeas.col) === 0

function attachedBlockEnd(lines, start, state, endsAttachment, firstMeas) {
  if (!attachesFlushLeft(firstMeas)) return start
  return firstBlockEnd(lines, start, oneBlockEnd(lines, start, endsAttachment), state)
}

// The boundary set for a container with no marker column of its own - a block
// quote, a footnote body, a definition description: a blank line or a further
// `+`. A list item adds its sibling marker to this and is otherwise identical.
const attachmentBoundary = (lines) => (idx) =>
  isBlank(lines[idx]) || CONT_MARKER.test(lines[idx])

function authoredBlockEnd(lines, start, base, state) {
  if (state.measuringAuthoredBlock) return start + 1
  const candidate = lines.slice(start).map((source) => {
    if (isBlank(source)) return source
    const measured = indentCols(source)
    return measured.col < base ? source : dedentMeasured(measured, source, base).text
  })
  return start + firstBlockEnd(candidate, 0, candidate.length, {
    ...state,
    measuringAuthoredBlock: true,
  })
}
// Parse ONE following flush-left block (for the `+` continuation marker).
// `next === start` means the gate refused: the line is not at column 0, so the
// marker attaches nothing and the caller's ordinary rules keep the line.
function takeOneBlock(lines, start, state, firstMeas) {
  const one = attachedBlockEnd(lines, start, state, attachmentBoundary(lines), firstMeas)
  return { rawMarker: lines.slice(start, one), next: one }
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
      // The task box is CONTENT and the attribute block is item METADATA, so
      // neither moves the bare marker's content column (carve#1701). The
      // whitespace branch keeps an ordinary marker's authored separator run.
      markerWidth: m[2].length + (m[5] !== undefined ? 1 : whitespaceWidth),
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
      text: m[6],
      // Marker-attached attributes are metadata, not marker width (§24 C3).
      // The separator is the authored RUN of spaces, not a fixed one: the
      // content column is where the content actually starts (§24 C3), so
      // `1.   x` sits at 5 exactly as `-   x` sits at 4 (carve#1773).
      markerWidth: m[2].length + m[3].length + m[5].length,
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
    // Is a TABLE open at the end of the body collected so far? The context a
    // `+ ...|` line needs before it can be a continuation row (§5 T6, see
    // `isContinuationRow`), advanced by `tableRunStep` on every line that joins
    // the body - the MARKER line included, since that line is the item's first
    // block, and the blank a blank-line branch pushes, which ends the run.
    let tableOpen = false
    const pushLine = (text, m = null) => {
      itemLines.push(text)
      itemMeas.push(m)
      tableOpen = tableRunStep(tableOpen, text)
    }
    pushLine(head.text)
    // Whether the marker line opens nested items whose innermost item is the
    // FIRST-BLOCK `+` form. An enclosing collector must carry a following
    // flush-left block down to that item even though the empty `+` leaves no
    // paragraph open at the enclosing levels.
    let carried = head.text.trim()
    let carriesBareContinuation = false
    for (let depth = 0; depth < MAX_NESTING_DEPTH; depth++) {
      if (carried === '+') { carriesBareContinuation = true; break }
      const nested = carried[0] !== ' ' && carried[0] !== '\t'
        ? matchMarkerAt({ col: 0, rest: carried })
        : null
      if (!nested) break
      carried = nested.text.trim()
    }
    let nestedAttachmentEnd = -1
    const item = { }
    if (head.attrs && head.attrs.replace(/[{} ]/g, '') !== '') item.attrs = head.attrs
    if (list.task) item.checked = /^[xX]$/.test(head.task)
    // PART 11 S6g. `X` folds to `x` - the two spell one state.
    if (list.task && !item.checked && head.task !== ' ') item.taskState = head.task
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
    // The collector also watches a nested list so a flush-left lazy line can
    // resume this item's paragraph when the nested item ends on a closed block.
    // Keep the outer state separate: the nested marker/heading must not turn
    // the heading into a paragraph, nor erase a paragraph that remains open in
    // the enclosing item (carve#1377).
    let paraBeforeSublist = null
    /*
     * THE COLUMN OF A DEFINITION WHOSE BODY MAY STILL FOLLOW, or null.
     *
     * A definition is ONE BLOCK, and its indented continuation lines are that
     * block's own content rather than the item's prose. Every path that ends a
     * paragraph ends the definition's reach too, which is why this is cleared
     * in `closePara` and `startPara` rather than at each branch: a blank line
     * or any other block between the definition and an indented line means the
     * indented line is not that definition's body.
     */
    let defBodyIndent = null
    const closePara = () => { openPara = false; para = []; defBodyIndent = null }
    const startPara = () => { openPara = true; para = []; defBodyIndent = null }
    const openParaWith = (line) => { if (!openPara) para = []; openPara = true; para.push(line); defBodyIndent = null }
    /*
     * §10 I4 FOR A BODY LINE: a code fence interrupts an OPEN paragraph only
     * when a closer follows it. Without one it opens nothing and stays
     * paragraph text, which is what the block reader below already does with
     * the same predicate (`hasCloser`).
     *
     * The closer is searched over the item's own body, dedented to the content
     * column, because that is where this fence's closer has to be written. A
     * blank run is committed only when a later line reaches the content column
     * again: under carve#1379 an unterminated container does not extend the
     * item past a blank followed by a line below the column, so lines after
     * such a blank are not the item's and cannot close its fence.
     */
    const bodyFenceOpens = (idx, dedented, blockBase = contentCol) => {
      const m = FENCE.exec(dedented)
      if (!m || parseFenceInfo(m[2]) === null) return false // INVALID-FENCE FALLBACK
      if (!openPara) return true // at block start it runs to the end of the container
      const body = [dedented]
      let pendingBlanks = 0
      for (let j = idx + 1; j < lines.length; j++) {
        const raw = lines[j] ?? ''
        if (isBlank(raw)) { pendingBlanks++; continue }
        const lm2 = indentCols(raw)
        // A sibling or outer marker ends the item, so nothing from there on is
        // this fence's to close.
        const nm2 = matchMarkerAt(lm2)
        if (nm2 && nm2.indent <= baseIndent) break
        // A blank followed by a line below the content column ends the item too
        // (carve#1379), and the fence does not reach past it.
        if (pendingBlanks > 0 && lm2.col < contentCol) break
        for (; pendingBlanks > 0; pendingBlanks--) body.push('')
        // A line BELOW the column is not outside the search: §24 C3 folds it as
        // lazy text while a paragraph is open, so a closer written after it is
        // still written inside this item. Stopping here instead made the answer
        // circular - the fence opened only if the below-column line folded, and
        // the line folded only if the fence had not opened - and it moved
        // corpus 276-7, which every engine answers the other way.
        body.push(lm2.col >= blockBase
          ? dedentMeasured(lm2, raw, blockBase).text
          : lm2.col >= contentCol
            ? dedentMeasured(lm2, raw, contentCol).text
            : lm2.rest)
      }
      return hasCloser(body, 0)
    }
    // A blank line was seen, and what followed it attached INVISIBLY (a comment,
    // a definition). §17 L1's second clause - an item followed by a blank line
    // before the next sibling marker - still applies when that sibling arrives,
    // so the blank is remembered rather than consumed by the attachment.
    let blankBeforeInvisible = false
    // A blank line was seen, and only invisible lines have followed it so far
    // (§17 L1b). The next PARAGRAPH closes the separation and loosens.
    let pendingSeparation = false
    // §11 N1's hard boundary fired: this item is the list's last. Set where the
    // run is measured, acted on after the item is pushed.
    let hardListBoundary = false
    {
      // The marker line's content is the item's FIRST BLOCK, so it answers S4's
      // question exactly as any other line does. Only the quote spelling was
      // asked before, which left `- # H`, `- | a | b |`, `- ---`, `- %% c`,
      // `- [r]: u`, `- [^f]: t` and `- {.k}` recording an open paragraph they do
      // not have -- and a column-0 line then folded into an item with nothing to
      // fold into (carve#1280).
      //
      // A wrapped attribute block is classified from its complete physical-line
      // span in the body loop below. Its opener is intentionally not guessed
      // from this one-line seed.
      if (!opensParagraph(head.text.trim(), true)) closePara()
    }
    // Content column of the FIRST sub-list opened in this item (-1 = none). A
    // blank followed by content at or past this column belongs to the sub-list,
    // not this item, so a descendant's looseness must not propagate up to this
    // item (carve#322).
    const headSubMarker = matchMarkerAt(indentCols(head.text))
    const headSubCol = headSubMarker
      ? contentCol + headSubMarker.indent + headSubMarker.markerWidth
      : -1
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
    // An over-indented opener establishes #1705's temporary authored base for
    // its whole multi-line block. The canonical item column remains
    // `contentCol`; this is only the source collector's local zero.
    let authoredBlockBase = null
    let authoredBlockLimit = null
    const insideFence = () => fence.opaque !== null || fence.colon.length !== 0
    const trackFence = (line, opens, index) => {
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
        // `opens` is §10 I4's answer for this line. The SPAN is tracked either
        // way, because the interior-blank rule (carve#1383) reads it and a
        // fence-shaped line the paragraph absorbed still runs to the same
        // place; what the flag records is whether a verbatim BODY exists for
        // §24 S2 to want.
        fence.opaque = { kind: 'code', run: code[1], opens }
        return
      }
      const comment = COMMENT_FENCE_BODY.exec(line)
      if (comment) {
        // §28 AGAIN, AND THIS IS WHERE THE SPAN IS DECIDED (carve#1914). A
        // code fence records `opens` because §10 I4 can refuse to let it
        // interrupt while the SPAN still runs; a comment fence has no such
        // split - an opener with no exact-width closer ahead opens NOTHING and
        // is one `%%` line comment, so there is no span to track. Recording one
        // anyway left `opens` undefined, and the collector's
        // `fence.opaque.opens !== false` test is true for undefined, so the
        // item broke on a verbatim body it never had.
        if (!commentFenceCloserAhead(lines, index, comment[1])) return
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
    // A comment closes the leaf paragraph but leaves the item frame available.
    // This flag records that explicit transition for the next ownership step.
    let afterComment = false
    {
      // A fence can open on the MARKER LINE (`- ``` `), where its opener is the
      // marker-line content, not a collected continuation line -- seed from it.
      trackFence(head.text, true, i)
    }
    i++
    // FIRST-BLOCK form (SS17 L4): a bare `+` as the sole marker-line content
    // opens an item whose body is the following flush-left block(s)
    //
    // A TASK MARKER DOES NOT TAKE THE FORM AWAY. The grammar spells the item as
    // `bullet_marker, [item_attributes], space, [task_marker], list_item_content`
    // and `first_block_content` is one of `list_item_content`'s alternatives, so
    // the form sits AFTER the box exactly as every other marker-line opener
    // does: `- [x] > q`, `- [x] # h` and `- [x] ---` all open their block past
    // it, because the box belongs to the ITEM and nothing about its first block
    // reaches it (carve#1381). This reader excluded task lists from the day the
    // form landed, with no rule behind the exclusion, and `head.text` is
    // already the text after the box - so `- [x] +` read the `+` as ITEM TEXT
    // and named the box `aria-label="+"` while carve-js, carve-php and carve-rs
    // all opened the form. Nothing in the corpus pinned the seam, so the only
    // place the disagreement surfaced was the writer side: a canonical writer
    // spells an EMPTY task item `- [x] +`, this reader read a `+` body out of
    // it, and the round-trip ratchet carried the document as declared drift
    // (markup-carve/carve-js#1491).
    let attachNext = false
    if (head.text.trim() === '+') {
      itemLines.length = 0
      itemMeas.length = 0
      attachNext = true
      closePara()
    }
    const attachFlushLeft = () => {
      // The marker names a FLUSH-LEFT block, not merely the next block. Its
      // first line must therefore begin at document column 0. In particular,
      // do not feed an indented line into this item's body: its own column is
      // what selects the enclosing container (markup-carve/carve#1436).
      //
      // The test used to be spelled HERE, and the three other attach sites had
      // none - which is the whole of carve#1814. It is `attachesFlushLeft` now,
      // asked once and shared, and an empty range is the refusal.
      if (i >= n || !attachesFlushLeft(ind(i))) return false
      pushLine('', BLANK_MEAS)
      // ONE block, with the SAME extent rule every other container uses: a
      // fence runs through its closer, so a boundary line written inside one is
      // fence content (SS17 L3, carve#982). This loop used to be the blind
      // spelling - it stopped at the first blank with no fence state consulted,
      // which severed a `+`-attached fence here while a footnote body one
      // container over kept it whole.
      // ONE BLOCK, and the extent is the marker's REACH rather than its count
      // (SS17 L3, carve#1290). `- a` / `+` / `para` / `> q` has both lines
      // inside the extent and they are two blocks; the `+` takes the first, and
      // the second needs a `+` of its own. The item's boundary set adds its
      // sibling marker to the shared one (carve#1782).
      const end = attachedBlockEnd(lines, i, state, (idx) =>
        ind(idx).rest === '' || CONT_MARKER.test(lines[idx]) ||
        matchMarkerAt(ind(idx))?.indent === baseIndent, ind(i))
      for (; i < end; i++) {
        // attached VERBATIM, so the line keeps the measurement it has here
        pushLine(lines[i], ind(i))
      }
      pushLine('', BLANK_MEAS)
      closePara()
      return true
    }
    // ONE block (SS17 L3, carve#1290). When the first-block form has taken its
    // block here, the carry below must not take a SECOND one: `- +` / `para` /
    // `> q` attaches the paragraph and leaves the quote outside the item.
    if (attachNext && attachFlushLeft()) carriesBareContinuation = false
    // End of a wrapped block-attribute line, inclusive. Attribute lines are
    // interrupters whether they occupy one physical line or several; each
    // continuation line therefore leaves no paragraph available for a later
    // below-column lazy continuation.
    let wrappedAttrEnd = -1
    if (head.text.startsWith('{')) {
      const window = [
        head.text,
        ...lines.slice(i).map((candidate) => {
          const measured = indentCols(candidate)
          return dedentMeasured(measured, candidate, contentCol).text
        }),
      ]
      const attributes = tryAttrLine(window, 0)
      if (attributes && attributes.next > 1) {
        wrappedAttrEnd = i + attributes.next - 2
        closePara()
      }
    }
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
          // AND IT ENDS THE OPEN PARAGRAPH, whatever container is holding the
          // blank. This branch used to leave `openPara` set across it, so a
          // following line BELOW the content column found a paragraph to fold
          // into and an unterminated `:::` div took a flush-left line as its
          // second block. PART 1 S4 asks for an OPEN PARAGRAPH, not for a
          // container still waiting on its closer, and this collector already
          // answers the same input the other way for a TERMINATED div (the
          // fence stack is empty, so the branch below decides by column), for
          // an opaque body (`if (fence.opaque) break`), for a quote and for a
          // bare item. Only the unterminated spelling differed - one rule
          // answered two ways by whether a closer had been written, which is
          // the tell that the reader and not the rule was wrong. carve-js,
          // carve-php and carve-rs all end the item (carve#1379).
          //
          // Unconditional rather than gated on `!fence.opaque`: under an
          // opaque body the collector breaks before it ever consults the
          // paragraph, so the two spellings render 5760 generated shapes
          // identically and the gate would only be a claim that decides
          // nothing.
          closePara()
          // AND IT STILL SEPARATES THE ITEMS, if nothing of the item follows
          // it. SS17 L1 asks whether the item is FOLLOWED BY a blank line
          // before the next sibling marker, and that question is asked at the
          // LIST's level: what stands between one item and the next. This
          // branch answered it by what the line was doing INSIDE the item -
          // fence content, so no separator - so an unterminated fence whose
          // last line is a blank before a sibling marker kept the list tight.
          //
          // carve#326 C is the clause that made an interior blank content, and
          // its own stated reason is the discriminator: a sibling after such a
          // fence "stays tight because no blank line actually separates the two
          // items". Here one does. The blank is the last line before the
          // marker, with nothing of the item after it, which is exactly the
          // separation L1 reads - and the TERMINATED spelling of the same
          // document loosens in all four readers, so keeping this one tight
          // makes the closer decide a rule that is not about closers
          // (carve#1379's property, applied to L1). The interior blank
          // carve#326 C pinned is untouched: content follows it before the
          // marker, so the lookahead finds that content and not a marker.
          //
          // carve-js and carve-rs loosen for every fence kind. carve-php
          // loosens for a `:::` div, an admonition, a raw block and a comment
          // fence and stays tight for a code or tilde fence alone
          // (markup-carve/carve-php#1445).
          //
          // ONLY THE LAST BLANK OF A RUN LOOKS AHEAD. Scanning forward over the
          // remaining blanks from EVERY blank is quadratic in the length of the
          // run, and a fence with a large blank payload is ordinary input. The
          // last blank is the one whose next line is content, so testing that
          // line directly reaches the same marker in constant work per line.
          {
            const next = i + 1 < n ? ind(i + 1) : null
            if (next && next.rest !== '') {
              const km = matchMarkerAt(next)
              if (km && km.indent === baseIndent && sameAxes(list, km)) list.tight = false
            }
          }
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
          // §11 N1 HARD BOUNDARY. A run of THREE OR MORE blank lines ends the
          // list: the sibling after it opens a new one instead of joining this
          // one. One or two blank lines stay the ordinary loose separator
          // (§17 L1), so the shape a document actually uses is untouched.
          //
          // `j - i` is the exact run length -- `i` is the first blank and `j`
          // the line that ended the run -- so the test needs no counter.
          // `sameAxes` is what makes it a BOUNDARY rather than a repeat of §11
          // N1's ordinary split: a marker on different axes already opened a
          // different list, and there is nothing for the run to separate.
          if (j - i >= 3 && sameAxes(list, nm)) {
            hardListBoundary = true
            i = j
            break
          }
          // blank line between ITEMS of this list -> loose (SS17 L1); a
          // following DIFFERENT list is a sibling and loosens nothing
          if (sameAxes(list, nm)) list.tight = false
          i = j
          break
        }
        if (col >= contentCol && !(nm && nm.indent >= contentCol)) {
          if ((subCol >= 0 && col >= subCol) || (headSubCol >= 0 && col >= headSubCol)) {
            // Content at or past the first sub-list's content column belongs to
            // the SUB-LIST, not this item -- a blank inside the sub-list must
            // not loosen this (ancestor) item (carve#322). Attach, stay tight;
            // the recursive parse of itemLines decides the sub-list's looseness.
            pushLine('', BLANK_MEAS)
            closePara()
            i = j
            continue
          }
          const authored = opensAuthoredBase(jm.rest) ? jm.col : contentCol
          const dedented = dedent(lines[j], authored)
          /*
           * A BLANK INTERIOR TO A FOOTNOTE DEFINITION'S BODY IS THE
           * DEFINITION'S, NOT THE ITEM'S -- carve#1363.
           *
           * The rule is over the BLOCK, and a footnote definition's block is
           * whatever the footnote parser consumes: it may carry more than one
           * body block, so the blank between them and the indented block after
           * it are interior to the definition. Neither is the item's second
           * paragraph, neither loosens the list, and nothing of the item's
           * reopens across them - the flush-left line below still arrives with
           * nothing to fold into.
           *
           * Without this the blank handed the lines after it back to the item,
           * so ONE definition answered by how its own body was laid out:
           * `- a` / `  [^f]: t` / `    more` / `tail` ended the item and the
           * same definition with a blank before `more` folded `tail` in.
           * carve-rs answers both alike; nothing else did.
           *
           * A LINK reference definition never reaches here: it has no body, so
           * `defBodyIndent` is null for it and the indented line after the
           * blank is the ITEM's own second paragraph, exactly as before. The
           * difference is the body, not the indentation.
           */
          if (defBodyIndent !== null && indentCols(dedented).col > defBodyIndent) {
            const defBody = defBodyIndent
            pushLine('', BLANK_MEAS)
            closePara()
            defBodyIndent = defBody
            i = j
            continue
          }
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
          // THE WHOLE RUN, not one blank standing in for it. §11 N1's boundary
          // applies at every level, and the sub-list is parsed recursively from
          // `itemLines`, so a run collapsed to a single blank here is a run the
          // nested parse can never see: `- o` / `  - a` / three blanks /
          // `  - b` came out as ONE nested list while the same three blanks at
          // the top level split. Attaching still keeps THIS item tight - that
          // is L2 and is unchanged; what the run decides is whether the marker
          // below it joins the sub-list, which is the nested parse's question.
          for (let k = i; k < j; k++) pushLine('', BLANK_MEAS)
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
        // A line at a known descendant item's column belongs to that item.
        // Leave its authored indentation intact here so the recursive list
        // parser, which knows the descendant's content column, rebases it.
        // Rebasing it against this ancestor would hoist the block one level.
        const descendantOwned = (subCol >= 0 && col >= subCol) || (headSubCol >= 0 && col >= headSubCol)
        if (authoredBlockLimit !== null && i >= authoredBlockLimit && !insideFence()) {
          authoredBlockBase = null
          authoredBlockLimit = null
        }
        const insideAuthoredBlock = authoredBlockLimit !== null && i < authoredBlockLimit
        const openerBase = !insideAuthoredBlock && !descendantOwned && !insideFence() && opensAuthoredBase(lm.rest)
          ? col
          : null
        // A LINE THAT OPENS ITS OWN BASE IS MEASURED AT ITS OWN COLUMN. The
        // authored base is "the local `block_base` for THAT ONE BLOCK", so a
        // standing base governs its block's payload and continuations - never
        // the next opener written below it. `openerBase` therefore wins over
        // `authoredBlockBase`, which is only reached by lines that open
        // nothing.
        //
        // The two used to be the other way round, and `authoredBlockBase` is
        // assigned from `openerBase` further down - AFTER this dedent - so a
        // new opener was measured against the PREVIOUS block's base and its own
        // column took effect one line too late. A definition list opening a
        // base at the item's content column then held it over a quote written
        // one column deeper, which arrived at body column 1 instead of 0 and
        // stopped being an opener at all (carve#1772, corpus 422-8).
        const localBase = authoredBlockBase !== null && insideFence() && col < authoredBlockBase
          ? contentCol
          : authoredBlockBase ?? openerBase ?? contentCol
        const dd = dedentMeasured(lm, line, localBase)
        const dedented = dd.text
        // The body line's own measurement, derived from this one rather than
        // re-walked, and handed to the item's parse below (carve#752).
        const dmeas = dd.meas ?? indentCols(dedented)
        if (i > wrappedAttrEnd && dedented.startsWith('{')) {
          const window = lines.slice(i).map((candidate) => {
            const measured = indentCols(candidate)
            return dedentMeasured(measured, candidate, localBase).text
          })
          const attributes = tryAttrLine(window, 0)
          if (attributes && attributes.next > 1) wrappedAttrEnd = i + attributes.next - 1
        }
        if (
          pendingSeparation &&
          !insideFence() &&
          dmeas.rest !== '' &&
          !opensSubBlock(dedented) &&
          !matchMarkerAt(dmeas) &&
          !dmeas.rest.startsWith('%%') &&
          !FOOTNOTE_DEF.test(dedented) &&
          !isLinkDef(dedented) &&
          parseAttrList(dedented) === null
        ) {
          // §17 L1b: a second paragraph, still blank-line-separated.
          list.tight = false
          pendingSeparation = false
        }
        // AN ATTACHED BLOCK CONSUMES THE SEPARATION, WHICHEVER LINE FILLED THE GAP.
        //
        // `blankBeforeInvisible` remembers "a blank line, then something that
        // renders nothing" so the sibling-marker branch below can apply §17 L1's
        // first clause. That is right while the invisible line is the LAST thing
        // in the item - `188-a-floating-attribute-stops-at-the-item-boundary` is
        // exactly that document, and the item really did end at the blank.
        //
        // It stopped being right the moment a visible BLOCK attached after it.
        // §17 L2 says an attached sub-block leaves the item tight, and the
        // attachment consumes the blank the same way it does when no invisible
        // line is there at all: `- a` / blank / `- b` / `- c` is tight
        // (`87-compact-list-blocks-2`), and inserting a comment, a definition or
        // an attribute line into the gap cannot make the item loose - the line
        // produces no output, and a line that outputs nothing must not make a
        // visible difference (the rule carve#625 already applies one branch up).
        //
        // The flag was set and never cleared, so it survived to the sibling and
        // loosened. Every document `323-a-block-attached-after-an-invisible-line-leaves-the-item-tight`
        // pins renders tight in all three engines; the oracle was the lone
        // dissenter (carve#1265). Both spellings of "a block attached here" are
        // cleared: a sub-LIST is a marker at or past the content column,
        // everything else is `opensSubBlock`.
        //
        // A PARAGRAPH is deliberately not in this list. It does not attach - it
        // is §17 L1b's second paragraph, and the branch above has just loosened
        // the item for it.
        if (dmeas.rest !== '' && (opensSubBlock(dedented) || matchMarkerAt(dmeas))) {
          blankBeforeInvisible = false
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
        //
        // Read BEFORE the push, because the push advances the table run past
        // this very line: `isContinuationRow` is asked what was open ABOVE it.
        const contRow = isContinuationRow(dedented, tableOpen)
        // The definition whose body may still be running, as it stood BEFORE
        // this line: the classifier below clears the flag through `closePara`
        // and `startPara`, so the value has to be read first.
        const defBody = defBodyIndent
        pushLine(dedented, dmeas)
        // Advance the incremental three-kind tracker so the blank-line branch
        // above knows whether an interior blank is fence content.
        if (openerBase !== null) {
          authoredBlockBase = openerBase
          authoredBlockLimit = authoredBlockEnd(lines, i, openerBase, state)
        }
        trackFence(dedented, bodyFenceOpens(i, dedented, localBase), i)
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
        if (subCol < 0 && nm && nm.indent >= contentCol) {
          subCol = nm.indent + nm.markerWidth
          paraBeforeSublist = openPara ? [...para] : []
        }
        // does the deepest structure now hold an OPEN paragraph that lazy
        // text may fold into? markers open a sub-item paragraph; quotes an
        // open quoted paragraph; fences/breaks close everything (SS10 I2/I6)
        if (i <= wrappedAttrEnd) closePara()
        else if (COMMENT_LINE.test(dedented)) closePara()
        else if (HR.test(dedented)) closePara()
        // A CODE FENCE CLOSES THE PARAGRAPH ONLY IF IT INTERRUPTED IT -- §10 I4,
        // and the same correction carve#891 already made one construct over for
        // the colon fence. This branch tested the line's SHAPE, so an
        // unterminated fence the paragraph had ABSORBED closed it anyway.
        else if (FENCE.test(dedented)) {
          if (fence.opaque && fence.opaque.kind === 'code' && fence.opaque.opens === false) {
            openParaWith(dedented)
          } else closePara()
        }
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
        // A TABLE ROW closes the paragraph, and so does the continuation row
        // that extends the table it opened. A `+ ...|` line with no table above
        // it is neither: §5 T6 refuses to let a table BEGIN with one, so the
        // line is prose and the paragraph it belongs to stays open. Tested by
        // shape here, `- a` / `  + b |` / `tail` ended the item on a line every
        // engine renders as the second line of the item's paragraph, and `tail`
        // became a document sibling (carve#1345). Same clause, same spelling, as
        // the marker-line seed above.
        else if (dedented[0] === '|' || contRow) closePara()
        // A HEADING AT THE CONTENT COLUMN is a block, not prose. PART 1 S4
        // asks whether the item holds an OPEN paragraph and PART 9 §24 C3
        // says this column is the item body's column 0. Falling through to
        // `openParaWith` below classified the heading correctly in the nested
        // parse but simultaneously recorded a paragraph for the collector, so
        // a later flush-left line folded into an item that held none.
        else if (HEADING.test(dedented)) closePara()
        else if (subCol >= 0 && dmeas.col >= subCol && HEADING.test(dmeas.rest)) {
          openPara = paraBeforeSublist !== null && paraBeforeSublist.length > 0
          para = openPara ? [...paraBeforeSublist] : []
          defBodyIndent = null
        }
        // A SUB-LIST MARKER opens a paragraph only if the item it opens
        // CARRIES one, which is the quote branch's rule one construct over and
        // the same clause. `- a` / `  - # H` / `p` records an open paragraph
        // this way and folds `p` into the OUTER item; carve-js and carve-rs
        // close it. Unconditional `startPara()` was the content-column twin of
        // the marker-line seed carve#1280 fixed, and it survived because that
        // fix reached only the marker line.
        else if (matchMarkerAt(dmeas)) {
          if (opensParagraph(dmeas.rest, true)) startPara()
          else closePara()
        }
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
        // AN ATTRIBUTE LINE IS AN INTERRUPTER, SO IT LEAVES NO PARAGRAPH OPEN.
        // §10 I5 makes a block-attribute line one of the constructs that
        // interrupt a paragraph, and the marker-line seed above already reads
        // it that way through `opensParagraph`. At the CONTENT COLUMN the
        // classifier had no branch for it, so the line fell to the catch-all
        // below and REOPENED a paragraph the interrupter had just closed.
        // A column-0 line then folded into an item holding nothing open, and
        // the floating attribute reached the folded line: `- a` / `  {.x}` /
        // `p` rendered `p` INSIDE the item and gave it `class="x"`, where all
        // three engines close the item and leave `p` a plain top-level
        // paragraph.
        //
        // The blank-separated spelling (`- a` / blank / `  {.x}` / `p`) took
        // the same wrong turn by a longer route: the blank branch above
        // classifies the attribute line as invisible and closes the paragraph,
        // then hands the line back to this loop, which reopened it here. One
        // branch settles both.
        //
        else if (tryAttrLine([dedented], 0)) closePara()
        // A REFERENCE OR FOOTNOTE DEFINITION ENDS THE PARAGRAPH TOO, and for
        // the same reason the attribute line above does: §10 I5 makes it an
        // interrupter, and the marker-line seed already reads it that way
        // through `opensParagraph`. At the CONTENT COLUMN the classifier had no
        // branch for it, so it fell to the catch-all below and REOPENED the
        // paragraph the interrupter had just closed - and `- a` / `  [r]: /u` /
        // `tail` folded `tail` into an item holding nothing open.
        //
        // I5 DECIDES BOTH HALVES AT ONCE, which is what makes closing the item
        // the right answer rather than a lucky one: "A link or footnote
        // definition belongs to an open list item only at that item's
        // `content_column`", so the definition here BELONGS to the item and
        // REGISTERS, and it ends the item's paragraph. An implementation that
        // ends the item while DROPPING the definition gets `tail` right by
        // accident and breaks the moment the column moves. carve-php and
        // carve-rs register it (carve#1350).
        //
        // ABBR_DEF is deliberately absent: §10 I5's list is a link or footnote
        // definition, and an abbreviation definition is recognized at document
        // level only (line 1453), so inside an item the line is paragraph text
        // and reopening the paragraph is the correct answer for it.
        else if (isLinkDef(dedented) || FOOTNOTE_DEF.test(dedented)) {
          closePara()
          // ONLY A FOOTNOTE DEFINITION HAS A BODY. A link reference definition
          // is ONE LINE in Carve: an indented line under it is not its title
          // but ordinary item text, and all three engines render it so
          // (`- a` / `  [r]: /u` / `    "T"` publishes the quoted string). So
          // only the footnote kind opens a body run below.
          if (FOOTNOTE_DEF.test(dedented)) defBodyIndent = dmeas.col
        }
        /*
         * A FOOTNOTE DEFINITION'S OWN BODY LEAVES THE PARAGRAPH CLOSED -- carve#1357.
         *
         * The interrupter above is a BLOCK, and a definition's indented
         * continuation is part of that block: the footnote parser consumes it
         * and permits no lazy continuation into it. So nothing of the item's is
         * open across any of it, and the flush-left line below arrives with
         * nothing to fold into - the same derivation the one-line spelling
         * already gets.
         *
         * Read as ordinary residue it fell to the catch-all below and REOPENED
         * the paragraph the definition had just closed, so the two spellings of
         * one definition answered differently: `- a` / `  [^f]: t` / `tail`
         * ended the item and `- a` / `  [^f]: t` / `    more` / `tail` folded.
         * carve-rs answers both the same; carve-js and carve-php answer neither.
         *
         * `defBodyIndent` is the definition line's own column. The footnote
         * body's column is two columns beyond it, so a line in the intervening
         * band is the item's prose rather than definition content
         * (markup-carve/carve#1376).
         */
        else if (
          defBody !== null &&
          dmeas.col >= defBody + FOOTNOTE_BODY_COLUMN &&
          dmeas.rest !== ''
        ) {
          closePara()
          defBodyIndent = defBody
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
      // ... and only a body that actually OPENED is one S2 can want. A fence
      // §10 I4 refused to let interrupt opened none, so the item's own parse
      // reads the line as paragraph text - and breaking here read it as a
      // verbatim body in the same parse, which is one line answered two ways
      // (carve#1387). The quote and the `dd` spellings of this shape already
      // fold in every reader.
      if (carriesBareContinuation) {
        // The column gate is `attachesFlushLeft`, once, for every container
        // (carve#1814); the `sourceCol === 0` test here was its SECOND
        // spelling, and a rule with two spellings is a rule that drifts. A
        // refusal leaves the end UNSET rather than empty, because this loop
        // asks once per line and the marker stays live for the next one.
        if (nestedAttachmentEnd < 0 && attachesFlushLeft(lm)) {
          nestedAttachmentEnd = attachedBlockEnd(lines, i, state, (idx) =>
            ind(idx).rest === '' || CONT_MARKER.test(lines[idx]) ||
            matchMarkerAt(ind(idx))?.indent === baseIndent, lm)
        }
        if (i < nestedAttachmentEnd) {
          pushLine(line, lm)
          i++
          continue
        }
      }
      if (fence.opaque && fence.opaque.opens !== false) break
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
      // The comment boundary left the frame open even though it closed the
      // paragraph. Classify a below-column nested marker in that surviving
      // frame; this preserves the established #618/#682 ownership result.
      if (nm && nm.indent < contentCol && nm.indent > baseIndent && !openPara &&
          afterComment && itemLines.length > 0) {
        pushLine(lm.rest, { col: 0, rest: lm.rest, tabs: false })
        i++
        continue
      }
      // Comments are recognized before visible ownership, at every column.
      // Keep the token in this collector so the nested parse records its node
      // and source extent, but never frame it as lazy text.
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
      if (!nm && COMMENT_FENCE_BODY.test(lm.rest) && lm.col === 0 && itemLines.length > 0 &&
          commentFenceOpensSpan(lines, i)) {
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
        // The lexical token leaves the frame available. The collector records
        // that ownership fact without turning the invisible line into lazy
        // paragraph text.
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
      if (!nm && lm.col === 0 && (FOOTNOTE_DEF.test(line) || isLinkDef(line) || tryAttrLine([line], 0))) break
      // A surviving frame after a comment can own a nonzero below-column line,
      // which begins a new paragraph rather than continuing the closed one.
      // Document column zero remains owned by the document.
      if (!nm && (openPara || (afterComment && lm.col > 0)) && itemLines.length > 0 && !startsVisibleBlock(line) && !isTableRow(line) && !COLON_FENCE.test(line) && !(FENCE.test(line) && hasCloser(lines, i))) {
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
    // Returning rather than breaking leaves `i` on the marker line, so the
    // caller parses it as the first item of the next list.
    if (hardListBoundary) return i
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
