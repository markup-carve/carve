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

import { parseAttrList, parseBlockAttrList, parseAttrBlock, matchDestination, isImageSource, headingText, bracketScanEnd } from './render.mjs'
import { labelKey } from './label-key.mjs'
import { delimitedRowCount, delimitedRows, delimitedRecords } from './delimited-table.mjs'
import { scanDirective } from './include-directive.mjs'

function standaloneCodeInclude(line) {
  const start = line.search(/\S/)
  if (start < 0 || line.slice(start, start + 2) !== '{{') return null
  const directive = scanDirective(line, start)
  if (!directive || line.slice(directive.end).trim() !== '') return null
  const code = directive.options.find(([key]) => key === 'code')
  return code ? { directive, lang: code[1] ?? '' } : null
}

function includeRange(raw) {
  const match = /^([1-9][0-9]*)-([1-9][0-9]*)$/.exec(raw ?? '')
  if (!match || BigInt(match[1]) > BigInt(match[2])) return null
  return [BigInt(match[1]), BigInt(match[2])]
}

function includeColumns(raw, quote, rows, headerRows) {
  if (raw === undefined) return null
  if (raw === null) return false
  if (headerRows === 0 && quote === null && /^\d+-\d+$/.test(raw)) {
    const range = includeRange(raw)
    if (!range || range[1] > BigInt(rows.reduce((max, row) => Math.max(max, row.length), 0))) return false
    return Array.from({ length: Number(range[1] - range[0] + 1n) }, (_, i) => Number(range[0]) - 1 + i)
  }
  if (headerRows === 0 || quote !== '"' || raw === '') return false
  const names = []
  let name = ''
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '\\' && i + 1 < raw.length) name += raw[++i]
    else if (raw[i] === ',') { names.push(name); name = '' }
    else name += raw[i]
  }
  names.push(name)
  const header = rows[0] ?? []
  const seen = new Set()
  const columns = []
  for (const name of names) {
    if (!name) return false
    const index = header.indexOf(name)
    if (index < 0 || header.indexOf(name, index + 1) >= 0 || seen.has(index)) return false
    seen.add(index)
    columns.push(index)
  }
  return columns
}

function includeRegion(lines, selected) {
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(selected ?? '')) return null
  const seen = new Set()
  const stack = []
  let range = null
  for (const [index, sourceLine] of lines.entries()) {
    const line = sourceLine.replace(/^[ \t]*/, '')
    let body = line
    let closer = ''
    if (line.startsWith('%%') && !line.startsWith('%%%')) body = line.slice(2)
    else if (line.startsWith('//') || line.startsWith('--')) body = line.slice(2)
    else if (line.startsWith('/*')) { body = line.slice(2); closer = '\\*/' }
    else if (line.startsWith('<!--')) { body = line.slice(4); closer = '-->' }
    body = body.replace(/^[ \t]*/, '')
    if (!/^#(?:end)?region(?![A-Za-z0-9_])/.test(body)) continue
    const marker = new RegExp(`^#(end)?region(?:[ \\t]+([A-Za-z_][\\w-]*))?[ \\t]*${closer}[ \\t]*$`).exec(body)
    if (!marker) return null
    const name = marker[2]
    if (marker[1]) {
      const open = stack.pop()
      if (!open || (name !== undefined && name !== open.name)) return null
      if (open.name === selected) range = [open.line + 2, index]
    } else {
      if (!name || seen.has(name)) return null
      seen.add(name)
      stack.push({ name, line: index })
    }
  }
  return stack.length === 0 ? range : null
}
import layoutTransitions from '../../resources/spec/layout-transitions.json' with { type: 'json' }

export { TIER1 }

export function commentLineContent(line) {
  return line.replace(/^[ \t]*%%/, '').replace(/^ /, '').replace(/[ \t]+$/, '')
}

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
/// `forwardSearch` counts the lines `cachedForwardSearch` visits for the marker-note and
/// description closer searches. `commentTail` counts the body lines a note or description
/// re-reads after the last comment it kept.
/// `fenceCloserLookahead` is the one question about a quote's body that no
/// incremental tracker can answer from the line in front of it: SS10 I4 opens a
/// fence under a paragraph only when a closer FOLLOWS. Asking it with a forward
/// scan per opener is quadratic on a body of fenced bodies, which is carve#2509,
/// so the answer comes from an index built once per depth and this counts the
/// lines that index reads. `closerScan` counts the lines `findCloser` reads.
export const layoutWork = { scan: 0, pad: 0, views: 0, quoteStrips: 0, lineVisits: 0, fenceCloserLookahead: 0, forwardSearch: 0, commentTail: 0, ownership: 0, captionHost: 0, closerScan: 0 }

export function resetLayoutWork() {
  layoutWork.scan = 0
  layoutWork.pad = 0
  layoutWork.views = 0
  layoutWork.quoteStrips = 0
  layoutWork.lineVisits = 0
  layoutWork.fenceCloserLookahead = 0
  layoutWork.closerScan = 0
  layoutWork.forwardSearch = 0
  layoutWork.commentTail = 0
  layoutWork.ownership = 0
  layoutWork.captionHost = 0
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
const QUOTE_LINE = /^>(?: ([^\r\n]*)|[ \t]*$)/
const QUOTE = {
  exec(line) {
    return QUOTE_LINE.exec(line)
  },
  test(line) { return this.exec(line) !== null },
}
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
//
// THE TITLE IS `link_title`, BOTH QUOTE FORMS, and the trailing slot is exactly
// one space and then a block the `attributes` production accepts (carve#2122).
// An invalid block is leftover content and the anchor rejects the line
// (CARVE-P3-006). The block is matched as `\{.*\}` and validated by the
// grammar rather than by a brace scan, so a quoted `}` in a value and a `{` or
// quote inside the destination (`/u{x} {.c}`, `it's {.c}`) read correctly. With
// no space the braces are destination (`[a]: /u{.c}`).
const LINK_DEF = /^\[([^\]@][^\]]*)\]: +(\P{White_Space}+)(?: (?:"((?:\\"|[^"])*)"|'((?:\\'|[^'])*)'))?(?: (\{.*\}))?[ \t]*$/u
const EMPTY_LINK_DEF = /^\[([^\]@^][^\]]*)\]:[ \t]*$/u

/*
 * The production's own test, and the only spelling of it. Every place that
 * asks "is this line a definition" (paragraph interruption, lazy continuation,
 * the def-list fold, the container scan, the item fold and the marker scan)
 * calls this, so narrowing the rule changes all of them at once (carve#922).
 */
function matchLinkDef(line) {
  const empty = EMPTY_LINK_DEF.exec(line)
  if (empty) return { label: empty[1], url: '', title: undefined, attrs: undefined }
  const m = LINK_DEF.exec(line)
  if (!m) return null
  const url = matchDestination(m[2])
  const attrs = m[5] === undefined ? undefined : parseAttrList(m[5])
  if (url === null || attrs === null) return null
  const title = m[3] !== undefined ? m[3].replaceAll('\\"', '"') : m[4]?.replaceAll("\\'", "'")
  return { label: m[1], url, title, attrs }
}
const isLinkDef = (line) => matchLinkDef(line) !== null
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
// THE §16 BRACKETED-RUN CLOSE (carve#1197).
//
// `line[open]` is a `[`; the return value is the index just past the `]` that
// closes it, or -1 if the line holds no close. grammar.ebnf states the rule
// beside `link_text` ("SEMANTIC CONSTRAINT: the link text ends at the matching
// `]` -- the close is balanced-bracket, escape- and LITERAL-SPAN-aware ...
// Not expressible context-free"), and PART 3's Images note binds an image to
// the same run: "only the leading `!` and the `<img src>` output differ".
//
// A REGEX CANNOT STATE THIS: the close is BALANCED, so `[^\]]*` stops at the
// first `]` at any depth (carve#1197). An UNCLOSED backtick run opens a
// verbatim span to the end of the block (PART 3 code_span), so the run has no
// close on this line: -1.
// The longest run `codeClosed` in resources/carve-core.ohm pairs; the inline
// pass refuses a longer one, and so does the bracket scan.
export const MAX_CODE_RUN = 8
// PART 7's four whitespace characters (CARVE-P7-003). JS `trim()` and `\s`
// also take a form feed, a vertical tab and the Unicode spaces, all content.
export const trimWs = (s) => s.replace(/^[ \t\n\r]+|[ \t\n\r]+$/g, '')

// What the run skips is `brContent` in resources/carve-core.ohm (`altContent`
// for an image alt), read through the grammar rather than copied here: a copy
// missed the autolink and cross-reference skips of CARVE-P3-001 (carve#3252).
export function bracketRunEnd(line, open, slot = 'label') {
  if (line[open] !== '[') return -1
  const rel = bracketScanEnd(line.slice(open), slot)
  if (rel === -1) return -1
  // The inline pass refuses a run past the tiers wherever it sits; so does this.
  if (line.slice(open, open + rel).includes('`'.repeat(MAX_CODE_RUN + 1))) throw new Refuse('backtick run past the code span tiers')
  return open + rel
}
// THE `[label]` SLOT, read from the two openers that carry it: a colon fence and
// a code fence. Both spelled it `/^ *\[([^\]]*)\]/`, which is the fourth and
// fifth copy of the `[^\]]*` shape the scanner above was written to replace -
// and the close is BALANCED here for the same reason it is on `link_text`, since
// the slot holds an inline run (`CARVE-P9-041`). A label carrying a link matched
// its closer to the LINK's, so the opener never completed: the colon fence
// degraded to a paragraph and lost the container with its children, and the code
// fence lost its payload to an inline `<code>` span (carve#2573).
//
// Returns `{ label, rest }`, or `null` when the slot is absent OR has no close
// on this line. Both answers were one answer before, and they stay one: the
// caller leaves the text unconsumed and its trailing-junk check turns the line
// into an ordinary paragraph either way. An unclosed backtick run reaches that
// path too, because it opens a verbatim span to the end of the block and takes
// the `]` into it - the scanner's own reading of PART 3 `code_span`.
function takeLabelSlot(s) {
  const open = /^ */.exec(s)[0].length
  const end = bracketRunEnd(s, open)
  if (end === -1) return null
  return { label: s.slice(open + 1, end - 1), rest: s.slice(end) }
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
  layoutWork.captionHost += para.length
  const line = para.map(trimLineEnd).join('\n')
  if (line.startsWith('$$`')) {
    const close = line.indexOf('`', 3)
    if (close < 0) return 'math'
    const tail = close < 0 ? null : line.slice(close + 1)
    if (tail === '' || (tail !== null && parseAttrBlock(tail) !== null)) return 'math'
  }
  if (!line.startsWith('![')) return null
  const altEnd = bracketRunEnd(line, 1, 'alt')
  if (altEnd === -1) return null
  // The image itself is matched by the grammar, so a balanced `(...)` in the
  // destination, a `)` in the title and a quoted `}` in the block all count
  // (carve#2122).
  return !line.slice(altEnd).includes('\n') && isImageSource(line) ? 'image' : null
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
// definition lines first (carve#604), then for the two
// markers, and the two table readers were still on the short run (carve#716).
// Matches `{`, a payload of quoted runs and bare characters, then `}`.
const ATTR_PAYLOAD = /(?:[^}'"\\]|\\.|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")*/.source
const ATTR_BLOCK = `\\{${ATTR_PAYLOAD}\\}`
const BULLET = new RegExp(`^([ \\t]*)([-*])(${ATTR_BLOCK})?( +)(?:\\[([ xX_>/!?-])\\] )?(.+)$`)
const TASK_MARKER_SOURCE_WIDTH = 4 // `[x] ` is content on the marker line.
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
const lazyFrame = text => text.startsWith(LAZY) ? text : LAZY + text

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
const stripLazyLead = (line) => {
  const at = line.indexOf(LAZY)
  return at > 0 && line.slice(0, at).trim() === '' ? line.slice(at) : line
}

/// The verbatim payload of a raw block, from its lines between the delimiters.
///
// Raw and code nodes share literal payload characters; rendering adapts raw output.
export const rawPayload = (bodyLines, terminated = true) =>
  bodyLines.map(stripLazy).join('\n') + (bodyLines.length && terminated ? '\n' : '')

// Measurements a collector knows without walking anything (carve#752). A blank
// separator it synthesized stands at column 0 with no content; a lazily-folded
// line is re-materialized behind the LAZY frame, whose first character is not
// whitespace, so it stands at column 0 and IS its own content.
const BLANK_MEAS = { col: 0, rest: '', tabs: false }
const LAZY_MEAS = (rest) => ({ col: 0, rest: lazyFrame(rest), tabs: false })

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
function markerBodyPolicy(contentColumn, markerColumn = 0) {
  return {
    contentColumn,
    markerColumn,
    reaches(line, measured) {
      if (line === undefined) return false
      const { col, rest } = measured ?? indentCols(line)
      return col >= contentColumn && rest !== ''
    },
    blankRunEnd(lines, at, end) {
      while (at < end && isBlank(lines[at])) at++
      return at
    },
    attaches(measured) {
      return !!measured && (measured.L ? measured.L.col : measured.col) === markerColumn
    },
  }
}

function reachesMarkerBody(line, column, measured = undefined) {
  return markerBodyPolicy(column).reaches(line, measured)
}

function isFootnoteContinuationLine(line) {
  return reachesMarkerBody(line, FOOTNOTE_BODY_COLUMN)
}

/*
 * The index just past the blank run starting at `i`, when a footnote
 * continuation line follows it; -1 when nothing does (carve#1620).
 *
 * Spelled once rather than at the two places the definition loop needs it - the
 * test and the advance - because a fix reaching only one of them is the
 * recurring shape catalogued in carve#755.
 */
// Does the last nonblank line above `i` belong to the body by its marker line or its column?
function reachedBefore(lines, i, markerLine, reaches) {
  let k = i - 1
  while (k > markerLine && isBlank(lines[k])) k--
  return k === markerLine || reaches(lines[k], k)
}

function footnoteBlankRunEnd(lines, i, n) {
  const body = markerBodyPolicy(FOOTNOTE_BODY_COLUMN)
  const k = body.blankRunEnd(lines, i, n)
  return body.reaches(lines[k]) ? k : -1
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
function isDefinitionContinuationLine(line, column = DEFINITION_BODY_COLUMN, measured = undefined) {
  return reachesMarkerBody(line, column, measured)
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
  const m = ORDERED.exec(trimLineEnd(line))
  if (!m || classifyOrdered(m[2]).length === 0) return false
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
function splitRow(line, openRun = 0, openRunAt = 0) {
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
      // The closer opens no column, so a run still open there stays open.
      if (cells.length === openRunAt && i !== closerIdx) inCode = openRun
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
    cells.push(cur.trimEnd())
    cur = ''
  }
  // T2: a row CLOSES with a pipe (`standard_row` ends in `'|'`). A line-initial
  // `|` with content dangling after the last pipe is prose, at a block start as
  // much as mid-paragraph -- there is no lenient open form.
  if (trimWs(cur) !== '') return null
  if (cells.length === 0) return null // T2: a lone `|` has no cell slot
  // T2 counts slots, never content (carve#2879, replacing carve#1950): `||` and
  // `| |` are one empty cell, `|||` two, for standard and continuation rows alike.
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
// line-block / hard-break block. Invalid metadata on a recognized named
// container is dropped; an unrecognized prefix stays paragraph text. A bare
// type is a class, so it admits an ASCII digit first.
function parseColonOpener(tail) {
  const valid = parseValidColonOpener(tail)
  if (valid) return valid
  const recovered = /^ +([A-Za-z0-9_][A-Za-z0-9_-]*)(?=$|[\s\u0085"{\[“”])[^\r\n]*$/.exec(tail)
  if (!recovered) return null
  return { type: recovered[1], title: null, label: null, mode: 'div', invalidMetadata: true }
}

const isFigureGroupOpener = (opener) => opener?.type === 'figure' &&
  !opener.invalidMetadata && opener.title === null && opener.label === null

function parseValidColonOpener(tail) {
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
  const lb = s.startsWith(' ') || !out.type ? takeLabelSlot(s) : null
  if (lb) {
    out.label = lb.label
    s = lb.rest
  }
  if (!/^[ \t]*$/.test(s)) return null // trailing junk -> paragraph
  if (!out.type && !out.title && out.label === null && tail.trim() !== '') return null
  return out
}

function findColonCloser(lines, openIdx, len) {
  const first = COLON_FENCE.exec(lines[openIdx] ?? '')
  const stack = [{ length: len, mode: first ? parseColonOpener(first[2])?.mode : 'div' }]
  for (let j = openIdx + 1; j < lines.length; j++) {
    const top = stack.at(-1)
    // A code fence, a raw block and a comment block are OPAQUE: their contents
    // are content, not markup, so a colon fence written inside one closes
    // nothing and opens nothing (carve#450). The span is skipped from the line
    // AFTER its opener, because an opener with no info string is closer-shaped
    // itself and would otherwise end the span where it began.
    const span = top.mode === 'line-block' ? lineBlockSpanEnd(lines, j) : opaqueSpanEnd(lines, j)
    if (span !== -1) {
      j = span
      continue
    }
    if (top.mode === 'line-block') {
      const closer = COLON_CLOSER.exec(lines[j])
      if (closer?.[1].length === top.length) {
        stack.pop()
        if (stack.length === 0) return j
      }
      continue
    }
    // An unclosed fence runs to the end of the input, colon lines included.
    if (isCodeBlockOpener(lines[j])) return -1
    const c = COLON_CLOSER.exec(lines[j])
    if (c) {
      const closeLen = c[1].length
      if (closeLen === top.length) {
        stack.pop()
        if (stack.length === 0) return j
      } else {
        stack.push({ length: closeLen, mode: 'div' })
      }
      continue
    }
    const o = COLON_FENCE.exec(lines[j])
    const opener = o && parseColonOpener(o[2])
    if (opener) stack.push({ length: o[1].length, mode: opener.mode })
  }
  return -1
}

/** Whether lines[idx] leaves a paragraph open for the line below: false, or
 *  the prefixes carrying it ('>' quote, '-<content column>;' item) ahead of
 *  'p'. A quote line always reads its content (a quote interrupts a
 *  paragraph, and a quoted comment or attribute line closes the quoted one);
 *  an item line does after an item's paragraph, where it starts the next item
 *  instead of folding in. A line reaching the open item's content column is
 *  read there (`inItem`, where a marker opens a sublist), so a block at that
 *  column closes the item's paragraph (CARVE-P0-010, CARVE-P0-011). */
const ITEM_PREFIX = /^-(\d+);/
function leavesParagraphOpen(lines, idx, wasOpen, inItem = false) {
  const line = lines[idx]
  // Past an item's content column the authored block base is erased (C3).
  const block = inItem ? line.trimStart() : line
  if (/^[ \t]*$/.test(line) || COMMENT_LINE.test(line) || CONT_MARKER.test(block)) return false
  if (HEADING.test(block) || HR.test(block) || LINK_DEF.test(block) || EMPTY_LINK_DEF.test(block) ||
    isTableRow(block) || (block[0] === '{' && (inItem ? tryAttrLine([block], 0) : tryAttrLine(lines, idx)))) return false
  const quote = QUOTE.exec(block)
  if (quote) {
    const inner = quote[1] !== undefined &&
      leavesParagraphOpen([quote[1]], 0, wasOpen?.[0] === '>' && wasOpen.slice(1))
    return inner && '>' + inner
  }
  const item = wasOpen && ITEM_PREFIX.exec(wasOpen)
  if (item && /^ */.exec(line)[0].length >= Number(item[1])) {
    const inner = leavesParagraphOpen([line.slice(Number(item[1]))], 0, wasOpen.slice(item[0].length), true)
    return inner && item[0] + inner
  }
  const bullet = BULLET.exec(line)
  const marker = bullet ?? ORDERED.exec(line)
  if (wasOpen && (!marker || !(item || inItem))) return wasOpen
  if (!marker) return 'p'
  const text = marker[6]
  const inner = leavesParagraphOpen([text], 0, false)
  // A glued marker attribute and a task box are not columns of the marker (C3).
  const attr = (bullet ? bullet[3] : marker[4]) ?? ''
  return inner && `-${line.length - text.length - attr.length - (bullet?.[5] !== undefined ? 4 : 0)};` + inner
}

/** The last line of the opaque span opening at `idx`, or -1 if none opens
 *  there. A code fence needs a valid info string and a closer ahead to open at
 *  all (PART 9 SS10 I4); a comment block needs an EXACT-length closer ahead
 *  (SS28), and without one it opens nothing and is a line comment instead. An
 *  unterminated span is not a span; the caller decides what its lines are. */
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

// A line-block payload is inline content, so a span in it pairs wherever its
// lines start: indentation is payload, not a column (ruled on carve-php#3137).
// The pure runs are indexed once per body, each row with the widest run at or
// below it, so an opener with no closer ahead costs one lookup.
const payloadRuns = new WeakMap()
function lineBlockSpanEnd(lines, idx) {
  const fence = FENCE.exec((lines[idx] ?? '').replace(/^[ \t]+/, ''))
  if (fence && parseFenceInfo(fence[2]) !== null) {
    let runs = payloadRuns.get(lines)
    if (!runs) {
      runs = { '`': [], '~': [] }
      for (let j = 0; j < lines.length; j++) {
        const c = PURE_FENCE.exec((lines[j] ?? '').replace(/^[ \t]+/, ''))
        if (c) runs[c[1][0]].push({ j, width: c[1].length, widest: 0 })
      }
      for (const rows of Object.values(runs)) {
        let widest = 0
        for (let k = rows.length - 1; k >= 0; k--) widest = rows[k].widest = Math.max(widest, rows[k].width)
      }
      payloadRuns.set(lines, runs)
    }
    const rows = runs[fence[1][0]]
    let lo = 0
    let hi = rows.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (rows[mid].j <= idx) lo = mid + 1
      else hi = mid
    }
    if (lo < rows.length && rows[lo].widest >= fence[1].length) {
      while (rows[lo].width < fence[1].length) lo++
      return rows[lo].j
    }
    return -1
  }
  return opaqueSpanEnd(lines, idx)
}

// A comment closes the paragraph, so only the lines after the last one the
// body kept can hold it open; scanning from there keeps collection linear.
function paragraphOpenSince(bodyLines, from) {
  const tail = commentTailSince(bodyLines, from)
  let last = tail.length - 1
  while (last >= 0 && tail[last].trim() === '') last--
  return last >= 0 && noteBodyParagraphOpen(tail)
}

// A fenced body is not a paragraph (CARVE-P0-013): does the body end inside a
// code fence it opened and did not close?
function bodyEndsInOpenFence(bodyLines) {
  for (let k = 0; k < bodyLines.length; k++) {
    const line = stripLazy(bodyLines[k])
    if (line.trim() === '' || COMMENT_LINE.test(line)) continue
    // A LAZY line is paragraph text, whatever it looks like.
    if (isCodeBlockOpener(line) && line === bodyLines[k]) {
      const closer = findCloser(bodyLines, k, FENCE.exec(line)[1])
      if (closer === -1) return true
      k = closer
    }
  }
  return false
}

function noteBodyParagraphOpen(bodyLines) {
  return bodyLeavesParagraphOpen(bodyLines)
}

function commentTailSince(bodyLines, from) {
  const tail = from === 0 ? bodyLines : bodyLines.slice(from)
  layoutWork.commentTail += tail.length
  return tail
}

function isColonBlockOpener(line) {
  const cf = COLON_FENCE.exec(line)
  return !!(cf && parseColonOpener(cf[2]) !== null)
}

function isColonParagraphInterrupt(line) {
  return isColonBlockOpener(line) && !COLON_CLOSER.test(line)
}

function paraHasInvalidColonOpener(para) {
  return para.some((l) => {
    const cf = COLON_FENCE.exec(l)
    return cf && parseColonOpener(cf[2]) === null
  })
}

/** SS12's interruption rule for one colon-fence LINE, decoupled from where the
 *  line was read; `para` is the paragraph currently open. A bare `:::`
 *  interrupts unless an invalid opener earlier in the paragraph has it absorbed
 *  (CARVE-P9-016) - whether any line follows it does not enter (§10 I4). One
 *  spelling, shared by the block reader and the collectors: the list-item
 *  collector used to carry its own, which closed the paragraph for a fence that
 *  had been ABSORBED into it (carve#891). */
function colonFenceInterrupts(line, para) {
  if (isColonParagraphInterrupt(line)) return true
  return COLON_CLOSER.test(line) && !paraHasInvalidColonOpener(para)
}

function colonInterruptsParagraph(lines, idx, para) {
  return colonFenceInterrupts(lines[idx], para)
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

/**
 * Advance a list collector's after-comment flag from classified line facts.
 * Paragraph closure, prefix availability and span tracking remain with the caller.
 * A span closer preserves its opener's retention decision (CARVE-P9-053).
 * A comment grants no retention (carve#3885).
 */
export function afterCommentTransition(previous, {
  belowCloser = false, spanClosed = false,
  inCommentSpan = false, comment = false, blank = false,
}) {
  if (belowCloser) return true
  if (spanClosed || inCommentSpan) return previous
  if (comment) return false
  return blank ? previous : false
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
  const cell = { header: false, kindMarker: false, align: null, valign: null, attrs: null, content: '' }
  const run = ['<', '^'].includes(padTrim(seg)) ? null : readMarkerRun(seg)
  // `\=` needs no case of its own: it is not `=`, so it opens no run and the
  // inline pass unescapes it into a literal `=` data cell.
  let s = seg
  if (run) {
    cell.header = run.header
    cell.kindMarker = run.header
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

// Syntax readers trim line endings; line-block bodies keep their raw gap columns.
const trimLineEnd = (line) => line.replace(/[ \t]+$/, '')

// PART 9 SS15: try to read one-or-more attribute blocks starting at
// lines[i] (adjacent blocks on one line merge; one block may wrap lines; a
// blank line inside the braces invalidates). Returns { lists, next } or null.
// Lines from `start` dedented on read, so a scan touches only the lines it reaches.
function dedentedWindow(lines, start, column) {
  return new Proxy([], {
    get(_, key) {
      if (key === 'length') return Math.max(0, lines.length - start)
      const index = typeof key === 'string' && /^\d+$/.test(key) ? Number(key) : null
      if (index === null) return undefined
      const line = lines[start + index]
      return line === undefined ? undefined : dedentMeasured(indentCols(line), line, column).text
    },
  })
}

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
    if (text.slice(pos).trim() !== '' && text[pos] !== '{') return null
  }
  if (lists.length === 0) return null
  return { lists, next: li + 1 }
}

// Single-line recognition only; callers supply the column and ownership guards.
// Abbreviations are document-only and remain text in these container contexts.
function isDefinitionOrAttributeLine(line) {
  return FOOTNOTE_DEF.test(line) || isLinkDef(line) || !!tryAttrLine([line], 0)
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
const DEFLIST_TERM = /^:: (?=[ \t]*[^ \t\n\r])/
const DESCRIPTION_LEAD = /^: +(?=[^ \t])/
const DEFLIST_SEPARATOR = /^: +[ \t]*(?=[^ \t\n\r])/
// A nested marker on its parent's first line has no physical-column entry in
// the continuation-marker cache. Keep that column for separator ownership.
const separatorMarkerColumns = new WeakMap()
// A line a term folds at its own column: not blank, not an opener, not a
// definition, list marker, fence, caption, entry or comment.
// Stands for a comment folded into a term; html.mjs splits the term on it.
export const TERM_COMMENT = '\uE0FE'

function isCodeBlockOpener(line) {
  const fence = FENCE.exec(line)
  return !!(fence && parseFenceInfo(fence[2]) !== null)
}

function foldablePlainLine(cur) {
  return !isBlank(cur) && !startsVisibleBlock(cur) && !isTableRow(cur) && !isLinkDef(cur) &&
    !FOOTNOTE_DEF.test(cur) && !BULLET.test(trimLineEnd(cur)) && !isOrderedMarkerLine(cur) &&
    !isCodeBlockOpener(cur) && !isColonBlockOpener(cur) &&
    !CAPTION.test(cur) && !COMMENT_LINE.test(cur) &&
    !/^::? (?=[ \t]*[^ \t\n\r])/.test(cur)
}

function startsVisibleBlock(line) {
  return HEADING.test(line) || HR.test(line) || QUOTE.test(line) || DEFLIST_TERM.test(line)
}

// PART 9 §10: fixed openers in the caller's selected owner coordinates.
// Fence guards, colon absorption, attributes and comments need their own
// body or paragraph context. List markers and captions have separate policy.
function startsParagraphBlock(line, top) {
  return startsVisibleBlock(line) || isTableRow(line) ||
    isLinkDef(line) || FOOTNOTE_DEF.test(line) || (top && ABBR_DEF.test(line))
}

// Descendants share a source line's suffix offsets. Distinct source lines and
// reconstructed lines have separate maps, even when their lengths match.
function prefixMemo(state, lines, index) {
  const arrays = state.prefixMemos ??= new WeakMap()
  let entries = arrays.get(lines)
  if (!entries) arrays.set(lines, entries = new Map())
  let memo = entries.get(index)
  if (!memo) entries.set(index, memo = { paragraph: new Map(), continuation: new Map(), quote: new Map() })
  return memo
}

function carryPrefixMemo(state, source, index, target, targetIndex) {
  const memo = prefixMemo(state, source, index)
  let entries = state.prefixMemos.get(target)
  if (!entries) state.prefixMemos.set(target, entries = new Map())
  entries.set(targetIndex, memo)
}

function markerCarriesContinuation(text, memo) {
  const path = []
  let result = false, steps = 0
  for (; path.length < MAX_NESTING_DEPTH;) {
    const known = memo.get(text.length)
    if (known) {
      if (path.length + known.steps > MAX_NESTING_DEPTH) return false
      result = known.value
      steps = known.steps
      break
    }
    path.push(text.length)
    if (text === '+') { result = true; break }
    const marker = text[0] !== ' ' && text[0] !== '\t'
      ? matchMarkerAt({ col: 0, rest: text }) : null
    if (!marker) {
      const quote = QUOTE.exec(text)
      if (!quote) break
      text = (quote[1] ?? '').trim()
    } else text = marker.text.trim()
    if (path.length === MAX_NESTING_DEPTH) return false
  }
  for (let k = path.length - 1; k >= 0; k--) {
    memo.set(path[k], { value: result, steps: ++steps })
  }
  return result
}

function markerFenceSummary(text, memo) {
  const path = []
  let summary
  for (;;) {
    if (memo.has(text.length)) { summary = memo.get(text.length); break }
    if (path.length >= MAX_NESTING_DEPTH) return null
    const measured = text[0] === ' ' || text[0] === '\t'
      ? indentCols(text) : { col: 0, rest: text }
    const marker = matchMarkerAt(measured)
    if (!marker) {
      const fence = FENCE.exec(measured.rest)
      summary = fence && parseFenceInfo(fence[2]) !== null
        ? { run: fence[1], col: measured.col } : null
      memo.set(text.length, summary)
      break
    }
    path.push({ length: text.length, width: marker.indent + marker.markerWidth })
    text = marker.text
  }
  for (let k = path.length - 1; k >= 0; k--) {
    if (summary) summary = { ...summary, col: summary.col + path[k].width,
      hostCol: summary.hostCol === undefined ? summary.col : summary.hostCol + path[k].width }
    memo.set(path[k].length, summary)
  }
  return summary
}

// The quote a marker-line chain (`- 1. > x`) carries, from its `>` on, or null.
function markerQuoteText(text, memo) {
  const path = []
  let found
  for (;;) {
    if (memo.has(text.length)) { found = memo.get(text.length); break }
    const measured = indentCols(text)
    if (QUOTE.test(measured.rest)) { found = measured.rest; break }
    const marker = path.length < MAX_NESTING_DEPTH ? matchMarkerAt(measured) : null
    if (!marker) { found = null; break }
    path.push(text.length)
    text = marker.text
  }
  for (const length of path) memo.set(length, found)
  return found
}

function quotePrefixSummary(text, memo) {
  const path = []
  let summary
  for (;;) {
    summary = memo.get(text.length)
    if (summary) break
    const quote = QUOTE.exec(text)
    if (!quote) { summary = { depth: 0, tail: text }; break }
    if (path.length >= MAX_NESTING_DEPTH) return null
    path.push(text.length)
    text = quote[1] ?? ''
  }
  for (let k = path.length - 1; k >= 0; k--) {
    summary = { depth: summary.depth + 1, tail: summary.tail }
    memo.set(path[k], summary)
  }
  return summary
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
function opensParagraph(text, atBlockPosition = false, tableOpen = false, memo = null) {
  let budget = MAX_NESTING_DEPTH
  // Only marker-line classification has no incoming table history. Keep its
  // suffix answers in the parse state so child items reuse the parent's walk.
  const cache = atBlockPosition && !tableOpen ? memo : null
  const path = []
  const finish = (value, remaining = 0) => {
    for (let k = 0; k < path.length; k++) {
      cache?.set(path[k], { value, steps: path.length - k + remaining })
    }
    return value
  }
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
  let inQuote = false
  for (;;) {
    // Marker peeling trims the tail; quote peeling preserves it. Keep
    // those two source endpoints separate when their suffix lengths match.
    const key = text.length * 4 + Number(inQuote) * 2 + Number(/\s$/.test(text))
    const known = cache?.get(key)
    if (known && known.steps <= budget) return finish(known.value, known.steps)
    if (text.trim() === '') return finish(false)
    if (budget <= 0) return true
    if (cache) path.push(key)
    // A quote is asked the SAME question about what it carries. An empty quote
    // opens nothing, and neither does `> # H` - the answer is the quote's own
    // last block, not merely whether the quote had any content. This used to
    // test non-emptiness alone, so `- > # H` / `tail` folded the tail into the
    // ITEM with no paragraph open anywhere in the stack. A quote's content is
    // at a block position exactly when the quote itself is, so the flag rides
    // along unchanged.
    if (budget-- <= 0) return true
    if (QUOTE.test(text)) { text = QUOTE.exec(text)[1] ?? ''; openTable = false; inQuote = true; continue }
    if (HEADING.test(text) || HR.test(text)) return finish(false)
    if (inQuote && atBlockPosition && ((FENCE.test(text) && parseFenceInfo(FENCE.exec(text)[2]) !== null) ||
        isColonBlockOpener(text))) return finish(false)
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
        if (text === '+') return finish(false)
        continue
      }
    }
    if (COMMENT_LINE.test(text) || COMMENT_FENCE_BODY.test(text)) return finish(false)
    if (isTableRow(text) || isContinuationRow(text, openTable)) return finish(false)
    // A footnote body's first block answers, as for every container (carve#3885).
    // A definition interrupts wherever it stands (§10 I5).
    const note = FOOTNOTE_DEF.exec(text)
    if (note) {
      text = note[2].trim()
      openTable = false
      atBlockPosition = true
      continue
    }
    if (isDefinitionOrAttributeLine(text)) return finish(false)
    if (atBlockPosition && isColonBlockOpener(text)) return finish(false)
    if (isColonParagraphInterrupt(text)) return finish(false)

    return finish(true)
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
function endsWithAuthoredInterrupter(line) {
  if (line.startsWith(LAZY)) return false
  let leaf = indentCols(line).rest
  let depth = 0
  while (depth < MAX_NESTING_DEPTH && QUOTE.test(leaf)) {
    const content = indentCols(QUOTE.exec(leaf)[1] ?? '')
    if (content.col > 0) return false
    leaf = content.rest
    depth++
  }
  if (QUOTE.test(leaf)) return false
  return isDefinitionOrAttributeLine(leaf) && !FOOTNOTE_DEF.test(leaf)
}

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
  // An attribute-shaped line without its nested quote marker, or short of an
  // item's content column, is a lazy continuation of that host's paragraph.
  // Its braces do not close the paragraph when the description asks whether
  // the next line can still fold into the same host.
  const tail = indentCols(bodyLines[last])
  if (tail.col > 0 && tryAttrLine([tail.rest], 0) !== null) {
    if (quoted) return true
    for (let k = last - 1; k >= 0 && bodyLines[k].trim() !== ''; k--) {
      if (QUOTE.test(bodyLines[k])) return true
      const marker = matchMarkerAt(indentCols(bodyLines[k]))
      if (marker) return tail.col < marker.indent + marker.markerWidth
    }
  }
  if (trailingWrappedAttr(bodyLines, last)) return false

  // A definition at the body or a marked quote's block position closes the
  // deepest paragraph even when authored indentation obscures its opener.
  if (endsWithAuthoredInterrupter(bodyLines[last])) return false

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

  // A footnote body's own last block answers, read at the note's body column.
  if (depth < MAX_NESTING_DEPTH) {
    for (let k = last; k >= 0; k--) {
      const m = indentCols(bodyLines[k])
      if (m.rest === '') continue
      const note = FOOTNOTE_DEF.exec(m.rest)
      if (note) {
        if (k === last) break
        const body = [note[2], ...bodyLines.slice(k + 1, last + 1).map((l) => dedentMeasured(indentCols(l), l, m.col + FOOTNOTE_BODY_COLUMN).text)]
        if (bodyLines.slice(k + 1, last + 1).every((l) => l.trim() === '' || indentCols(l).col >= m.col + FOOTNOTE_BODY_COLUMN)) {
          return !bodyEndsInOpenFence(body) && bodyLeavesParagraphOpen(body, false, depth + 1)
        }
        break
      }
      if (m.col === 0) break
    }
  }

  // A CLOSED FENCE IS NOT AN OPEN PARAGRAPH (carve#1930). `opensParagraph` is
  // handed the body's last LINE and has no fence branch, so a bare ``` or a bare
  // `:::` fell through to its `return true` and reported a paragraph open -
  // folding the flush-left line below into a `dd` whose last block was a closed
  // block. `A FENCED BODY IS NOT A PARAGRAPH` and `FENCE KIND DOES NOT DETERMINE
  // CONTAINER REACH` (both NORMATIVE, resources/spec/01-layout.ebnf) say S4's
  // lazy branch asks for an OPEN paragraph, and that a code fence body cannot
  // hold one at all.
  //
  // An UNTERMINATED fence is the opposite answer and keeps the old one: it opens
  // no block, so the paragraph above it is still open (corpus
  // `367-an-unterminated-fence-at-a-content-column-opens-no-block-so-the-paragraph-stays-open`).
  if (bodyLeavesNoParagraphAt(bodyLines, last, quoted)) return false

  // A TRAILING BARE `:::` OPENS AN EMPTY CONTAINER. It is closer-shaped, so
  // `opensParagraph` cannot tell it from a closer - but the line above says it
  // closes nothing, and a `:::` opener is not guarded (§10 I4). An empty
  // container leaves no paragraph open (carve#1938, carve#2147).
  // Unless an invalid opener earlier in an open paragraph absorbed it (CARVE-P9-016).
  if (COLON_CLOSER.test(bodyLines[last])) {
    let text = last
    while (text >= 0 && COLON_CLOSER.test(bodyLines[text])) text--
    if (text < 0 || bodyLines[text].trim() === '') return false
    let start = text
    while (start > 0 && bodyLines[start - 1].trim() !== '') start--
    return paraHasInvalidColonOpener(bodyLines.slice(start, text + 1)) &&
      bodyLeavesParagraphOpen(bodyLines.slice(0, text + 1), quoted, depth)
  }

  return opensParagraph(bodyLines[last], false, tableOpenAfter(bodyLines.slice(0, last)))
}

// Whether a description body's last block is a footnote definition that absorbed
// its opener - the note marker at body column 0 with every following line
// reaching the note's own body column, `marker + 2` (PART 9 SS16). The only open
// paragraph such a body has is the NOTE's, whose body column column 0 cannot
// reach, so a flush-left line after it is a document sibling and not a lazy
// continuation of the `dd` (markup-carve/carve#1974, carve-js#1667,
// carve-php#1929, carve-rs#1577). `bodyLeavesParagraphOpen` reads the absorbed
// continuation as an open paragraph, which is right for a line at the body's own
// columns and wrong for column 0: PART 0 owner selection gives column 0 to the
// document, so the column-0 test is made here instead.
function descriptionBodyEndsInAbsorbedNote(bodyLines) {
  let last = -1
  for (let k = bodyLines.length - 1; k >= 0; k--) {
    if (!isBlank(bodyLines[k])) { last = k; break }
  }
  if (last < 0) return false
  // Walk back to the note's marker, crossing its own body. A blank run is note
  // content when a continuation follows it, so it is crossed too - a note whose
  // last paragraph sits below an internal blank still ends at the marker, not at
  // the blank (raised by codex review).
  let opener = last
  while (opener >= 0 && (isBlank(bodyLines[opener]) || indentCols(bodyLines[opener]).col > 0)) opener--
  // A bare note marker at the end already ends the body (`opensParagraph`
  // answers false for it); this predicate is for the case the marker owns a
  // continuation run that the marker line no longer terminates.
  if (opener < 0 || opener === last || !FOOTNOTE_DEF.test(bodyLines[opener])) return false
  const bodyCol = indentCols(bodyLines[opener]).col + FOOTNOTE_BODY_COLUMN
  for (let k = opener + 1; k <= last; k++) {
    if (!isBlank(bodyLines[k]) && indentCols(bodyLines[k]).col < bodyCol) return false
  }
  return true
}

// A wrapped attribute block closes the paragraph at every quote depth. Its
// final physical line does not begin with `{`, so the quote's incremental
// single-line tracker cannot recognize that boundary on its own.
function bodyEndsWrappedAttr(bodyLines, depth = 0) {
  let last = bodyLines.length - 1
  while (last >= 0 && bodyLines[last].trim() === '') last--
  if (last < 0) return false
  // A wrapped attribute block's final line is the `}` that closes it, at every
  // quote depth (`#x}`, or `> #x}` one level out). A last line that does not end
  // in `}` cannot be one, so the scan below - and the recursion - is skipped.
  // Without this the predicate rescans the whole trailing paragraph for every
  // lazy line, which is quadratic on a long plain quote (carve#1956).
  if (!bodyLines[last].trimEnd().endsWith('}')) return false
  if (trailingWrappedAttr(bodyLines, last, true, true)) return true
  if (!QUOTE.test(bodyLines[last]) || depth >= MAX_NESTING_DEPTH) return false
  let first = last
  while (first > 0 && QUOTE.test(bodyLines[first - 1])) first--
  const inner = bodyLines.slice(first, last + 1).map((l) => QUOTE.exec(l)[1] ?? '')
  return bodyEndsWrappedAttr(inner, depth + 1)
}

function trailingWrappedAttr(lines, last, wrappedOnly = false, requireHost = false) {
  const hostColumnBefore = []
  if (requireHost) {
    let firstHostColumn = Infinity
    for (let j = 0; j <= last; j++) {
      hostColumnBefore[j] = firstHostColumn
      const marker = matchMarkerAt(indentCols(lines[j]))
      if (marker) firstHostColumn = Math.min(firstHostColumn, marker.indent + marker.markerWidth)
    }
  }
  for (let k = last; k >= 0 && lines[k].trim() !== ''; k--) {
    const opener = indentCols(lines[k])
    if (!opener.rest.startsWith('{')) continue
    if (requireHost && opener.col > 0 && hostColumnBefore[k] > opener.col) continue
    const window = lines.slice(k, last + 1).map((line) =>
      dedentMeasured(indentCols(line), line, opener.col).text)
    const attr = tryAttrLine(window, 0)
    if (attr?.next === window.length && (!wrappedOnly || window.length > 1)) return true
  }
  return false
}

function bodyLeavesNoParagraphAt(bodyLines, last, quoted = false) {
  // CARVE-P0-009 applies to a marker-line fence in a description body too.
  // Track its host column so an unfinished opener still leaves prose open.
  const host = hostLadder()
  let paragraphOpen = false
  // A term is not a paragraph a marker continues (§10 I2).
  let termOpen = false
  for (let index = 0; index <= last; index++) {
    const hadFence = host.fence !== null
    if (hostFenceStep(host, bodyLines[index])) {
      if (index === last && hadFence && host.fence === null) return true
      continue
    }
    const { inner, blockStart } = hostAdvance(host, bodyLines[index], paragraphOpen && !termOpen)
    termOpen = DEFLIST_TERM.test(inner.rest) || (termOpen && !blockStart && opensParagraph(inner.rest))
    const opener = hostFenceOpener(host, inner)
    if (opener) {
      host.fence = { run: opener[1], host: host.columns.at(-1), column: inner.col, markerLine: blockStart }
      paragraphOpen = false
      continue
    }
    paragraphOpen = opensParagraph(inner.rest, blockStart)
  }
  if (quoted && host.fence) return true
  if ((!host.fence || !host.fence.markerLine) && host.kinds.at(-1) === 'item' && !paragraphOpen) return true
  let closedAt = -1
  let k = 0
  while (k <= last) {
    const code = FENCE.exec(bodyLines[k])
    if (code && parseFenceInfo(code[2]) !== null) {
      const end = findCloser(bodyLines, k, code[1])
      // An unterminated fence opens no block, so nothing below it is closed
      // either: the paragraph above stays open and `opensParagraph` answers.
      if (end === -1 || end > last) return false
      closedAt = end
      k = end + 1
      continue
    }
    if (isColonBlockOpener(bodyLines[k]) && !COLON_CLOSER.test(bodyLines[k])) {
      const run = COLON_FENCE.exec(bodyLines[k])[1]
      const end = findColonCloserSkippingCode(bodyLines, k, run, last)
      if (end === -1) return false
      closedAt = end
      k = end + 1
      continue
    }
    k++
  }
  return closedAt === last
}

// Is a VERBATIM payload open at `end`? CARVE-P11-016 keeps a whitespace-only
// line inside one, so a container may not collapse a blank run that lands there.
// `scan` carries the cursor and the open fence between calls, so each body line
// is read once however many times the branch below asks.
function bodyHasOpenCodeFence(lines, scan, end, measurement, hasFutureCommentCloser) {
  let { opaque } = scan
  const columns = scan.columns ??= [0]
  for (let k = scan.index; k < end; k++) {
    const measured = measurement(k) ?? indentCols(lines[k])
    const line = measured.rest
    if (opaque) {
      const close = opaque.kind === 'code' ? PURE_FENCE.exec(line) : COMMENT_FENCE_BODY.exec(line)
      if (close && close[1][0] === opaque.run[0] &&
          (opaque.kind === 'code'
            ? (measured.col === opaque.column || measured.col === opaque.base) && close[1].length >= opaque.run.length
            : close[1].length === opaque.run.length)) opaque = null
      continue
    }
    let body = measured
    let fenceAt = measured
    if (line !== '' && !lines[k].startsWith(LAZY)) {
      while (columns.length > 1 && columns.at(-1) > measured.col) columns.pop()
      if (scan.termColumn !== undefined && measured.col <= scan.termColumn &&
          !(measured.col === scan.termColumn && (DEFLIST_TERM.test(line) || DESCRIPTION_LEAD.test(line)))) scan.termColumn = undefined
      let marker = matchMarkerAt(measured)
      while (marker) {
        const column = marker.indent + marker.markerWidth
        columns.push(column)
        const next = indentCols(marker.text)
        body = { col: column + next.col, rest: next.rest }
        marker = matchMarkerAt(body)
      }
      // PART 0 S2: a description or footnote body is a frame too, so a fence
      // its marker line opens is the body's verbatim payload.
      const description = scan.termColumn === body.col && DESCRIPTION_LEAD.exec(body.rest)
      const note = !description && FOOTNOTE_DEF.exec(body.rest)
      if (DEFLIST_TERM.test(body.rest)) scan.termColumn = body.col
      if (description || note) {
        const column = body.col + (description ? description[0].length : FOOTNOTE_BODY_COLUMN)
        const lead = description ? description[0].length : note[0].length - note[2].length
        columns.push(column)
        fenceAt = { col: body.col + lead, rest: body.rest.slice(lead) }
      }
    }
    const code = FENCE.exec(fenceAt.rest)
    if (!lines[k].startsWith(LAZY) && !scan.foldedFences?.has(k) && code && parseFenceInfo(code[2]) !== null) opaque = { kind: 'code', run: code[1], column: fenceAt.col, base: columns.at(-1) }
    else {
      const comment = COMMENT_FENCE_BODY.exec(line)
      if (comment && (commentFenceCloserAhead(lines, k, comment[1]) || hasFutureCommentCloser(comment[1], columns.at(-1)))) opaque = { kind: 'comment', run: comment[1] }
    }
  }
  scan.index = end
  scan.opaque = opaque
  return opaque !== null && opaque.kind === 'code'
}

/*
 * ONE QUOTE LEVEL'S OWN CONTAINER LADDER (carve#2538).
 *
 * CARVE-P0-013 names no depth and no host, so the question "does this level's
 * last block leave an open paragraph" has to be asked at the column a container
 * inside the level puts its blocks at, not only at the level's column 0. A list
 * item, a footnote body and a description body all move that column, and FENCE
 * is anchored at column 0, so their fences read as prose without this.
 *
 * `columns` is the same ladder the item collector's residue scan walks
 * (`bodyHasOpenCodeFence`), advanced ONE LINE at a time: a scan over the
 * collected body is the rescan carve#2509 ruled out.
 */
function hostLadder() {
  return { columns: [0], markerCols: [], kinds: [], fence: null, unclaimed: null }
}

/*
 * Peel one line's container markers, returning the innermost text with its
 * absolute column and whether the line OPENED a container.
 *
 * A marker only opens one when a paragraph is not in the way: PART 9 SS17 says a
 * list marker does not interrupt a paragraph, so `a` over `- ``` ` is paragraph
 * text and pushes nothing - while `- a` over `- ``` ` opens the list's second
 * item and `- a` over `  - ``` ` opens a sublist, both of them a BLOCK START
 * that SS10 I4 opens a fence at unconditionally.
 */
function hostAdvance(h, line, paraOpen, belowFenceLazy = false) {
  const meas = indentCols(line)
  const term = meas.col === 0 && DEFLIST_TERM.test(meas.rest)
  const description = h.descriptionTerm && meas.col === 0 && /^:( +)(?=[ \t]*[^ \t])(.*)$/.exec(meas.rest)
  if (description && matchMarkerAt(indentCols(description[2]))) {
    const lead = markerFenceSummary(description[2], new Map())
    if (lead) {
      const column = 1 + description[1].length + lead.col
      h.columns.push(column)
      h.markerCols.push(1 + description[1].length)
      h.kinds.push('item')
      return { meas, inner: { col: column, rest: markerFreeContent(description[2]) }, blockStart: true, popped: false }
    }
  }
  if (term) {
    h.descriptionTerm = true
    h.descriptionBlank = false
  } else if (meas.rest === '') {
    h.descriptionBlank = true
  } else if (!description && !h.kinds.includes('description') &&
      (h.descriptionBlank || !foldablePlainLine(line))) {
    h.descriptionTerm = false
  }
  if (meas.rest !== '') h.descriptionBlank = false
  if (h.colons?.at(-1)?.mode === 'line-block' && meas.col >= h.colons.at(-1).base) {
    return { meas, inner: meas, blockStart: false, popped: false }
  }
  if (meas.rest === '' || h.colonComment || COMMENT_LINE.test(meas.rest)) {
    h.descriptionParagraph = false
    if (COMMENT_LINE.test(meas.rest) && !h.colonComment) {
      h.retainedComment = meas.col > 0 && meas.col < h.columns.at(-1)
    }
    return { meas, inner: meas, blockStart: false, popped: false }
  }
  // ONLY A LIST ITEM'S PARAGRAPH GIVES WAY. `- d` / `  - x` opens a sublist, so
  // the marker interrupts; the same marker at a DESCRIPTION or FOOTNOTE body's
  // column under its open paragraph is ordinary text, and both bodies take the
  // list only after a blank. Reading the licence off the ladder's DEPTH instead
  // of its innermost KIND moved a quoted line out of a `dd` that keeps it
  // (raised by codex review).
  const siblingItem = h.markerCols.some((col, k) => col === meas.col && h.kinds[k] === 'item')
  // Plain text below a nested item's column can lazily continue its paragraph.
  // Keep that sublist for the next fence lookup; the lazy line did not close it.
  const retainedFenceText = h.retainedComment && h.kinds.at(-1) === 'item' &&
    meas.col > h.markerCols.at(-1) && meas.col < h.columns.at(-1) && FENCE.test(meas.rest)
  h.retainedComment = false
  const lazyItemLine = retainedFenceText || paraOpen && h.kinds.at(-1) === 'item' &&
    (h.columns.length === 2 || h.colons?.length ||
      h.kinds.at(-2) === 'item') && matchMarkerAt(meas) === null &&
    (!FENCE.test(meas.rest) || belowFenceLazy && meas.col < h.columns.at(-1)) && !isColonBlockOpener(meas.rest) &&
    !DEFLIST_TERM.test(meas.rest) && opensParagraph(meas.rest)
  // A marker at or left of an item's own marker column ends that item and
  // opens a list: it is not text of the paragraph the item held (SS24 C3).
  let leftOfClosedItem = false
  let popped = false
  while (!lazyItemLine && h.columns.length > 1 && h.columns.at(-1) > meas.col) {
    popped = true
    const column = h.columns.pop()
    while (h.colons?.length && h.colons.at(-1).base >= column) h.colons.pop()
    h.colonParagraph = null
    if (h.kinds.at(-1) === 'item' && meas.col <= h.markerCols.at(-1)) leftOfClosedItem = true
    h.markerCols.pop()
    h.kinds.pop()
  }
  if (!h.kinds.includes('description')) h.descriptionParagraph = false
  if (h.kinds.at(-1) === 'description') paraOpen = h.descriptionParagraph ?? paraOpen
  const insideItem = h.kinds.at(-1) === 'item'
  let inner = meas
  let blockStart = false
  // The task box is content on the marker line (CARVE-P0-008): a marker after it stands past it.
  let box = 0
  for (;;) {
    const marker = matchMarkerAt(inner)
    if (marker) {
      if (paraOpen && !insideItem && !siblingItem && !leftOfClosedItem) break
      const column = box + marker.indent + marker.markerWidth
      while (h.colons?.length && h.colons.at(-1).base >= column) h.colons.pop()
      h.markerCols.push(box + marker.indent)
      h.columns.push(column)
      h.kinds.push('item')
      blockStart = true
      box = marker.task === undefined ? 0 : TASK_MARKER_SOURCE_WIDTH
      const next = indentCols(marker.text)
      inner = { col: h.columns.at(-1) + next.col, rest: next.rest }
      continue
    }
    // A footnote body's column is its marker's plus 2 (PART 9 SS16), and the
    // definition itself interrupts a paragraph, so its first block is a start.
    if (FOOTNOTE_DEF.test(inner.rest) && reachesDefinitionSite(h, inner.col)) {
      h.markerCols.push(inner.col)
      h.columns.push(inner.col + 2)
      h.kinds.push('note')
      blockStart = true
      break
    }
    // A description carries its separator column only while its term's list survives.
    if (description && inner === meas) {
      const column = inner.col + 1 + description[1].length
      h.markerCols.push(inner.col)
      h.columns.push(column)
      h.kinds.push('description')
      blockStart = true
      const next = indentCols(description[2])
      inner = { col: column + next.col, rest: next.rest }
      continue
    }
    break
  }
  if (h.kinds.at(-1) === 'description') {
    // A list-shaped line folds into the description's paragraph under section 10 I2.
    h.descriptionMarker = !blockStart && paraOpen && (h.descriptionMarker || matchMarkerAt(inner) !== null)
    h.descriptionParagraph = FENCE.test(inner.rest) && !blockStart
      ? paraOpen : opensParagraph(inner.rest, blockStart)
  }
  return { meas, inner, blockStart, popped }
}

// Is this line a block the innermost container on the ladder reads as one? At
// that container's content column it is read there (SS24 C3), and so is an
// opener past the column on the line that closed a deeper container, where no
// paragraph of the survivor is in the way (CARVE-P0-004). Either leaves the
// level no paragraph (CARVE-P0-009, CARVE-P0-017).
function hostedBlockAt(h, inner, popped) {
  if (h.columns.length < 2) { h.tableColumn = null; h.tableOpen = false; return false }
  const column = h.columns.at(-1)
  if (inner.col < column) return false
  const text = inner.rest
  // Track table rows at the deepest host's content column.
  const continuation = isContinuationRow(text, h.tableColumn === column && h.tableOpen)
  h.tableColumn = column
  h.tableOpen = isTableRow(text) || continuation
  return continuation || HEADING.test(text) || HR.test(text) || text[0] === '|' ||
    isDefinitionOrAttributeLine(text)
}

// A quote does not rebase (CARVE-P0-004): a definition or attribute line in
// it is one only at the quote's own column or at or past a column it hosts.
function reachesDefinitionSite(h, col) {
  return col === 0 || h.columns.slice(1).some(column => col >= column)
}

function hostedDefinitionAt(h, inner) {
  return isDefinitionOrAttributeLine(inner.rest) && reachesDefinitionSite(h, inner.col)
}

function hostColonStep(h, inner, commentCloses = () => false, markerLine = false, paragraph = [], remainingDepth = MAX_NESTING_DEPTH, codeCloses = () => false) {
  if (!h.colonComment && !h.colons?.length && !inner.rest.startsWith(':::') && !inner.rest.startsWith('%%')) return false
  const comment = COMMENT_FENCE_BODY.exec(inner.rest)
  if (h.colonComment) {
    if (comment && comment[1].length === h.colonComment) h.colonComment = null
    return true
  }
  const stack = h.colons ??= []
  while (stack.length && inner.rest !== '' && inner.col < stack.at(-1).base) stack.pop()
  const colon = COLON_FENCE.exec(inner.rest)
  const top = stack.at(-1)
  if (top?.mode === 'line-block') {
    if (comment && commentCloses(comment[1].length, top.base)) h.colonComment = comment[1].length
    // Payload is inline, so its span pairs at any column past the host's
    // (ruled on carve-php#3137).
    const fence = FENCE.exec(inner.rest)
    if (inner.col >= top.column && fence && parseFenceInfo(fence[2]) !== null && codeCloses(fence[1], top.base, true)) {
      h.payloadSpan = { run: fence[1], column: inner.col, host: top.base }
    }
  }
  const bare = COLON_CLOSER.test(inner.rest)
  if (top && bare && colon?.[1].length === top.length &&
      (inner.col === top.base || inner.col === top.column)) {
    stack.pop()
    return true
  }
  if (top?.mode === 'line-block') return true
  if (COMMENT_LINE.test(inner.rest)) {
    if (comment && commentCloses(comment[1].length)) h.colonComment = comment[1].length
    return false
  }
  const base = h.columns.at(-1)
  // A quote line past its content column is paragraph text until a nested
  // host claims it. Its apparent colon opener cannot end that paragraph.
  if (!top && h.columns.length === 1 && inner.col > base) return false
  // An opener past a hosted container establishes its own base and may
  // interrupt its paragraph (CARVE-P0-004, CARVE-P9-083).
  if (top && base === top.base && inner.col > top.column &&
      !(!bare && opensHostedColonBlock(inner.rest))) return false
  if (top && bare && inner.col !== top.base && inner.col !== top.column) return false
  if (stack.length >= remainingDepth) return false
  const opener = colon && parseColonOpener(colon[2])
  if (opener && (base > 0 || opener.mode === 'line-block')) {
    let absorbed = false
    if (COLON_CLOSER.test(inner.rest)) {
      let held = h.colonParagraph
      if (!held || held.lines !== paragraph || held.index > paragraph.length) {
        held = h.colonParagraph = { lines: paragraph, index: 0, invalid: false }
      }
      while (!held.invalid && held.index < paragraph.length) {
        let measured = indentCols(paragraph[held.index++])
        for (let marker = matchMarkerAt(measured); marker; marker = matchMarkerAt(measured)) measured = indentCols(marker.text)
        const prior = COLON_FENCE.exec(measured.rest)
        held.invalid = !!(prior && parseColonOpener(prior[2]) === null)
      }
      held.index = paragraph.length
      absorbed = held.invalid
    }
    if (!absorbed) {
      stack.push({ length: colon[1].length, column: inner.col, base, mode: opener.mode })
      return true
    }
  }
  return false
}

/*
 * Is this level verbatim on this line because a container in it holds a fence
 * open? Answers before the ladder moves, because the payload's own markers open
 * nothing.
 *
 * A closer ends the payload at the host's content column or the opener's
 * column. Intermediate and deeper runs stay payload. A nonblank line below
 * the host's column ends the host and its fence; a blank ends neither.
 */
function hostFenceStep(h, line) {
  // Inline spans shield delimiters without claiming code-fence ownership.
  const slot = h.payloadSpan ? 'payloadSpan' : 'fence'
  const span = h[slot]
  if (!span) return false
  const meas = indentCols(line)
  if (meas.rest !== '' && meas.col < span.host) {
    h[slot] = null
    return false
  }
  const c = PURE_FENCE.exec(meas.rest)
  if (c && c[1][0] === span.run[0] && c[1].length >= span.run.length &&
      (slot === 'payloadSpan' || meas.col === span.host || meas.col === span.column)) h[slot] = null
  return true
}

// A host permits an opener at or past its content column. At the quote's own
// column, the opener must stay at column zero. A shifted run that cannot open
// under the current paragraph still leaves a possible closer to account for.
function hostFenceOpener(h, inner) {
  if (h.colons?.at(-1)?.mode === 'line-block') return null
  const column = h.columns.at(-1)
  if (inner.col < column) return null
  if (h.unclaimed !== null && h.unclaimed.host > column) h.unclaimed = null
  const f = FENCE.exec(inner.rest)
  const opener = f && parseFenceInfo(f[2]) !== null ? f : null
  if (inner.col !== column) {
    if (h.kinds.at(-1) === 'description' && h.descriptionParagraph &&
        !(h.descriptionMarker && opener)) return null
    // An absorbed run of the other fence character is not waiting for this one.
    const awaited = h.unclaimed !== null && (opener === null || opener[1][0] === h.unclaimed.run[0])
    if (opener !== null && column > 0 && !awaited) return opener
    // AN OVER-INDENTED RUN INSIDE A CONTAINER DID OPEN SOMETHING. The host's
    // reader takes it (SS24 C3 reads "at or past"), and the run at the host's own
    // column below it is that fence's CLOSER. Untracked, that closer read as a
    // fresh opener and the line under it left a quote that keeps it. At the
    // level's own column there is nothing to remember: column 0 is strict, so a
    // run further in opened nothing at all (raised by codex review).
    // TWO OVER-INDENTED RUNS PAIR WITH EACH OTHER, so the second CLOSES the
    // expectation rather than replacing it. Overwriting left a closer nothing was
    // waiting for, and it then suppressed the real opener at the content column
    // below (raised by codex review).
    if (opener !== null && column > 0) {
      h.unclaimed = h.unclaimed !== null && opener[1][0] === h.unclaimed.run[0] &&
        opener[1].length >= h.unclaimed.run.length
        ? null
        : { run: opener[1], host: column }
    }
    return null
  }
  if (h.unclaimed !== null && opener !== null && opener[1][0] === h.unclaimed.run[0] &&
      opener[1].length >= h.unclaimed.run.length) {
    h.unclaimed = null
    return null
  }
  return opener
}

// The body index of a code fence a description body OPENED and has not closed,
// or -1. A FENCED BODY IS NOT A PARAGRAPH (CARVE-P0-013), so a line below the
// body's column cannot fold into it and ends the body. A valid opener always
// opens (§10 I4), under a paragraph too.
function descriptionOpenFenceAt(bodyLines, lines, from, bodyColumn, endsBodyAt) {
  for (let k = 0; k < bodyLines.length; k++) {
    const f = FENCE.exec(bodyLines[k])
    if (!f || parseFenceInfo(f[2]) === null) continue
    const end = findCloser(bodyLines, k, f[1])
    if (end !== -1) {
      k = end
      continue
    }
    return k
  }
  return -1
}

/*
 * DOES THE BODY HOLD AN OPEN COMMENT SPAN? -- §28, carve#2488.
 *
 * A body's collector ends at a comment written below its content column, which
 * is right for an OPENER and for the `%%` line form (carve#1930) and wrong
 * INSIDE a span the body already holds: §28 pairs the delimiters, indentation is
 * part of neither (carve#2471), and everything between them is payload. Ending
 * there split the span, and the body's own parse then read an opener with no
 * closer - one `%%` line comment - and PUBLISHED the payload while dropping both
 * delimiters.
 *
 * The caller still asks the SHAPE. Only a comment-shaped line is exempt, which
 * is carve#2487's half of the same rule: a payload line below the column is not
 * comment-shaped, so §24 C3 still hands it to the enclosing parse.
 *
 * ONE COLUMN of the authored indentation is kept when the caller pushes the
 * line, as the item collector keeps it, so the body's parse cannot read a
 * delimiter written below the column back as an authored column-0 one.
 *
 * A code fence's payload is opaque, so a `%%%` written inside one is content.
 */
function bodyHoldsOpenCommentSpan(bodyLines, closerAhead = null) {
  return bodyOpenCommentRun(bodyLines, closerAhead) !== null
}

const keptCommentDelimiter = (line) => {
  const { col, rest } = indentCols(line)
  return col > 0 ? ' ' + rest : rest
}

// `closerAhead(run)` says whether an exact-width closer is still to come past
// the body. With it, an opener that has none in the body or ahead is the line
// form and opens no span (CARVE-P9-053).
function bodyOpenCommentRun(bodyLines, closerAhead = null) {
  let opaque = null
  let lastCloser = null
  if (closerAhead) {
    lastCloser = new Map()
    bodyLines.forEach((raw, k) => {
      const c = COMMENT_FENCE.exec(stripLazy(raw))
      if (c) lastCloser.set(c[1].length, k)
    })
  }
  let k = -1
  // §10 I2: a list marker never interrupts, so it opens a container only where a
  // block may begin. Both directions of getting this wrong publish a payload -
  // an invented opaque body hides a real opener, and a missed one invents a span
  // - so the flag is carried rather than assumed.
  let atBlockStart = true
  for (const raw of bodyLines) {
    // Indentation is part of neither delimiter (§28, carve#2471), so the body's
    // lines are read at their own content. A collector hands them down at
    // whatever column its dedent left them at, and the answer may not turn on
    // that: it is the same question asked of the same span either way.
    const line = indentCols(stripLazy(raw)).rest
    k++
    if (opaque) {
      const c = opaque.kind === 'code' ? PURE_FENCE.exec(line) : COMMENT_FENCE.exec(line)
      if (c && c[1][0] === opaque.run[0] &&
          (opaque.kind === 'code' ? c[1].length >= opaque.run.length : c[1].length === opaque.run.length)) {
        opaque = null
        atBlockStart = true
      }
      continue
    }
    if (line === '') {
      atBlockStart = true
      continue
    }
    // AN OPENER MAY BE WRITTEN ON A CONTAINER'S MARKER LINE, so at a block start
    // the markers are walked off before the shape test: `- ``` ` opens a code
    // block whose payload is opaque, and reading a `%%%` inside that payload as a
    // comment opener left a span open that no author wrote, which then claimed a
    // real delimiter below as its closer and published the span it broke.
    //
    // Mid-paragraph the same line is TEXT, and stripping there invented the
    // opaque body instead, which hid a real opener one line down.
    //
    // A CLOSER is read from the line as written either way. §28 and §10 I4 put
    // the delimiter at the start of the line's content, and a marker line starts
    // a fresh item rather than closing the block already open.
    const opener = atBlockStart ? markerFreeContent(line) : line
    atBlockStart = false
    const code = FENCE.exec(opener)
    if (code && parseFenceInfo(code[2]) !== null) {
      opaque = { kind: 'code', run: code[1] }
      continue
    }
    const comment = COMMENT_FENCE.exec(opener)
    if (comment && (!closerAhead || (lastCloser.get(comment[1].length) ?? -1) > k || closerAhead(comment[1]))) {
      opaque = { kind: 'comment', run: comment[1] }
    }
  }
  return opaque !== null && opaque.kind === 'comment' ? opaque.run : null
}

/** A line's content with every leading list marker walked off. */
function markerFreeContent(line) {
  let measured = { col: 0, rest: line, tabs: false }
  for (let marker = matchMarkerAt(measured); marker; marker = matchMarkerAt(measured)) {
    measured = indentCols(marker.text)
  }
  return measured.rest
}

function descriptionLeadHasUnterminatedNestedFence(line, lines, start, bodyColumn, endsBodyAt) {
  let text = line
  let contentColumn = bodyColumn
  let nested = false
  for (;;) {
    const marker = matchMarkerAt(indentCols(text))
    if (!marker || marker.indent !== 0) break
    nested = true
    contentColumn += marker.markerWidth
    text = marker.text
  }
  if (!nested) return false
  const fence = FENCE.exec(text)
  if (!fence || parseFenceInfo(fence[2]) === null) return false
  for (let k = start; k < lines.length; k++) {
    if (endsBodyAt(k)) break
    const measured = indentCols(lines[k] ?? '')
    if (measured.col < contentColumn) continue
    const candidate = dedentMeasured(measured, lines[k], contentColumn).text
    const closer = PURE_FENCE.exec(candidate)
    if (closer && closer[1][0] === fence[1][0] && closer[1].length >= fence[1].length) return false
  }
  return true
}

// The colon fence opened at `openIdx` closes on a BARE run of its own length
// (PART 2). Code-fence payloads in between are opaque and are stepped over.
function findColonCloserSkippingCode(bodyLines, openIdx, run, last) {
  let j = openIdx + 1
  while (j <= last) {
    const code = FENCE.exec(bodyLines[j])
    if (code && parseFenceInfo(code[2]) !== null) {
      const inner = findCloser(bodyLines, j, code[1])
      if (inner === -1 || inner > last) return -1
      j = inner + 1
      continue
    }
    const closer = COLON_CLOSER.exec(bodyLines[j])
    if (closer && closer[1].length === run.length) return j
    j++
  }
  return -1
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

function opensHostedColonBlock(line) {
  if (FOOTNOTE_DEF.test(line) || isLinkDef(line) || parseAttrList(trimLineEnd(line)) !== null) return true
  if (QUOTE.test(line) || HEADING.test(line) || HR.test(line) || isTableRow(line) || DEFLIST_TERM.test(line)) return true
  const fence = FENCE.exec(line)
  if (fence) return parseFenceInfo(fence[2]) !== null
  const colon = COLON_FENCE.exec(line)
  const opener = colon && parseColonOpener(colon[2])
  return !!(opener && (opener.type || opener.mode === 'line-block'))
}

const opensAuthoredBase = (line) => opensSubBlock(line) || isLinkDef(line) ||
  FOOTNOTE_DEF.test(line) || COMMENT_LINE.test(line) ||
  parseAttrList(trimLineEnd(line)) !== null || isCaptionableParagraph([line])

// Reuse forward searches while their starting point remains inside the searched range.
function cachedForwardSearch(cache, key, from, length, visit) {
  const prior = cache.get(key)
  if (prior && from >= prior.from && from <= prior.end) return prior.result
  let end = from
  let result = -1
  for (; end < length; end++) {
    layoutWork.forwardSearch++
    const outcome = visit(end)
    if (outcome === null) break
    if (outcome) { result = end; break }
  }
  cache.set(key, { from, end, result })
  return result
}

// The ownership walk's one linear pass, counted apart from `scan` so the
// rescan guards still measure only the block readers.
// One line of a quote run at a container's content column: whether the run
// now ends in an open paragraph. `run` carries the run's state between lines.
function advanceQuoteRun(run, text, idx) {
  const continues = run.at === idx - 1
  if (!continues) run.hosts = []
  let depth = 0
  let opaque = false
  let stanza = false
  while (QUOTE.test(text) && depth < MAX_NESTING_DEPTH) {
    text = QUOTE.exec(text)[1] ?? ''
    const host = run.hosts[depth] ??= hostLadder()
    if (hostFenceStep(host, text)) { opaque = true; break }
    const { inner, blockStart, popped } = hostAdvance(host, text, continues && run.open)
    const opener = hostFenceOpener(host, inner)
    if (opener) {
      host.fence = { run: opener[1], column: inner.col, host: host.columns.at(-1) }
      opaque = true
      break
    }
    if (hostedBlockAt(host, inner, popped) ||
        (hostedDefinitionAt(host, inner) && !FOOTNOTE_DEF.test(inner.rest))) { opaque = true; break }
    // A colon fence line of a hosted container leaves no paragraph open, except
    // in a line block's payload.
    if (hostColonStep(host, inner, () => false, blockStart, run.para ?? [])) {
      if (host.colons?.at(-1)?.mode === 'line-block' && text.trim() !== '') stanza = true
      opaque = true
      break
    }
    // A quote at a hosted container's column is that container's own block.
    if (host.columns.length > 1 && inner.col >= host.columns.at(-1) && QUOTE.test(inner.rest)) text = inner.rest
    depth++
  }
  run.hosts.length = depth + Number(opaque)
  const rowOpen = continues && run.table
  const wasOpen = continues && run.open
  // A bare colon run closes a div unless the open paragraph absorbs it (CARVE-P9-016).
  const colonCloses = COLON_CLOSER.test(text) && !(wasOpen && !colonFenceInterrupts(text, run.para))
  run.open = stanza || (!opaque && !colonCloses && text.trim() !== '' && opensParagraph(text, !wasOpen, rowOpen))
  if (!run.open || !wasOpen) run.para = []
  if (run.open) run.para.push(text)
  run.table = !opaque && tableRunStep(rowOpen, text)
  run.at = idx
  return run.open
}

// Whether a quote's content, past any further `>` markers, is indented: such a
// line may belong to a container the quote hosts, which one line cannot tell.
function hostsIndentedContent(text) {
  for (let depth = 0; QUOTE.test(text) && depth < MAX_NESTING_DEPTH; depth++) text = QUOTE.exec(text)[1] ?? ''
  return text[0] === ' '
}

// `line` past `depth` quote prefixes, or null when it lacks one.
function stripQuotes(line, depth) {
  let rest = line
  for (let d = 0; d < depth; d++) {
    const m = QUOTE.exec(walkIndent(rest).rest)
    if (!m) return null
    rest = m[1] ?? ''
  }
  return { rest }
}

// How many lines from `at` the block starting there holds, each line read
// through `view`; a null view left its quote level and ends the block. The
// window doubles only while the block reaches its edge, so a pull stays local.
function pulledBlockLength(lines, at, view) {
  for (let size = 16; ; size *= 2) {
    const own = []
    for (let j = at; j < Math.min(lines.length, at + size); j++) {
      const line = view(lines[j])
      if (line === null) break
      own.push(line)
    }
    const next = takeOneBlock(own, 0, {}, indentCols(own[0]), 0).next
    if (next < own.length || own.length < size) return Math.max(1, next)
  }
}

function walkIndent(line) {
  let col = 0
  let i = 0
  for (; i < line.length; i++) {
    if (line[i] === ' ') col += 1
    else if (line[i] === '\t') col = (Math.floor(col / 4) + 1) * 4
    else break
  }
  layoutWork.ownership += i
  return { col, rest: i === 0 ? line : line.slice(i) }
}

// Decision trace vocabulary (resources/spec/decision-trace.schema.json).
const TRACE_FRAME = { quote: 'quote', item: 'item', note: 'footnote', dd: 'dd', colon: 'div' }
const TRACE_FORM = { 'colon-close': 'closer', colon: 'div', note: 'footnote' }
const TRACE_OPENS = new Set(['quote', 'item', 'note', 'dd', 'term', 'colon', 'fence'])
const TRACE_RULE = { blank: 'CARVE-P0-003', leaf: 'CARVE-P0-011' }

/*
 * Block ownership, rule A (carve#3885). One walk decides the owner of every
 * line: a line belongs to the deepest open container whose content column it
 * reaches, a quote is reached by its marker, and otherwise the line folds into
 * the deepest open paragraph or closes containers. An opener past its owner's
 * content column still opens there and is measured from its own line, so the
 * walk moves it, and every line its block owns, onto the owner's content
 * column. A fence's payload loses at most the indentation it has. The block
 * readers below therefore only meet openers at a content column.
 */
function ownLines(lines, trace = null) {
  const result = []
  const frames = [{ kind: 'doc', col: 0, canon: 0, cut: 0, para: false, last: null }]
  const top = () => frames[frames.length - 1]
  let reach = 0
  let runs = null
  // Fence-shaped lines the walk read as paragraph text.
  const textFences = []
  // The line after an accepted `+` keeps its column: the marker reads it.
  let afterPlus = false
  // Lines moved to a note's marker column for its first-block `+`.
  const replaced = new Set()
  // Quote first-block `+` lines whose follower stands at an ineligible column.
  const refusedPlus = new Set()
  let start = 0
  if (lines[0] !== undefined && FRONTMATTER_OPENER.test(lines[0])) {
    const close = lines.findIndex((line, k) => k > 0 && /^---[ \t]*$/.test(line))
    if (close > 0) {
      result.push(...lines.slice(0, close + 1))
      start = close + 1
      if (trace) for (let k = 0; k < start; k++) emit(k, 'INPUT', 'doc', null, 'frontmatter')
    }
  }
  for (let at = start; at < lines.length; at++) {
    let src = lines[at]
    let out = ''
    let m = walkIndent(src)
    // The leading run of the current segment, written at `col`.
    const lead = (target, spaces = false) => {
      // Ownership only ever removes indentation. `spaces` writes a leading tab
      // as the columns it reaches, so a term and its body read alike in both
      // spellings; a post-marker tab stays as written.
      const col = Math.min(target, m.col)
      const authored = src.slice(0, src.length - m.rest.length)
      out += col === m.col && !(spaces && out === '' && authored.includes('\t')) ? authored : ' '.repeat(col)
      src = m.rest
    }
    const take = (count) => {
      out += src.slice(0, count)
      src = src.slice(count)
    }
    let reached = 0
    let plus = null
    // A quote's first-block `+` reads a follower by its raw column (CARVE-P9-067).
    const quotePlus = top().kind === 'quote' && top().plus === at - 1 ? top() : null
    const baseAt = quotePlus ? frames.findIndex((f) => f.line === at - 1) : -1
    // `zero` is column 0 of the follower's own quote level, past host quote prefixes.
    let stack = null
    let zero = 0
    for (let k = 1; k < frames.length; k++) {
      const f = frames[k]
      if (quotePlus && !stack && f.line === at - 1) stack = { base: f, col: -1 }
      // A lone `+` reaches the marker column of an open marker container. A
      // marker body takes only a block at that column (§17 L3, L4).
      if (f.markerCol !== undefined && CONT_MARKER.test(m.rest) && m.col === f.markerCol &&
          (f.kind === 'quote' || (m.col < f.col && attachesAt(at + 1, f.markerCol, frames.slice(1, k).filter((q) => q.kind === 'quote').length)))) {
        plus = f
        break
      }
      if (f.kind === 'quote') {
        if (!QUOTE.test(m.rest)) break
        if (stack && stack.col < 0) stack.col = docColumn(lines[at], m.rest)
        lead(frames[k - 1].canon)
        take(src.length - (QUOTE.exec(src)[1] ?? '').length)
        if (k < baseAt) zero = docColumn(lines[at], src)
        m = walkIndent(src)
        reached = k
        continue
      }
      if (m.rest !== '' && m.col < f.col) break
      reached = k
    }
    if (plus) {
      frames.length = frames.indexOf(plus) + 1
      plus.para = false
      lead(plus.markerCanon)
      result.push(out + src)
      afterPlus = true
      if (trace) emit(at, 'S2', ownerPath(), 'CARVE-P9-067', 'plus', { cell: 'B-plus-start' })
      continue
    }
    const plusFollower = afterPlus
    afterPlus = false
    const missed = reached < frames.length - 1
    // A follower carrying the prefix of a quote opened on the `+` line loses
    // its raw column to the walk, so the walk refuses it here; the readers
    // take every other such follower.
    // A follower at an ineligible raw column refuses the `+` whatever block it
    // starts; one at column 0 that would close the host moves into the quote
    // holding the `+`, which it attaches to (CARVE-P9-067, carve#3421).
    if (quotePlus && (missed || stack?.col >= 0) && m.rest !== '' && !CONT_MARKER.test(m.rest)) {
      const base = frames[baseAt]
      const col = stack?.col >= 0 ? stack.col : docColumn(lines[at], m.rest)
      if (col !== 0 && col !== zero && col !== base.docMarker && col !== quotePlus.docMarker) refusedPlus.add(at - 1)
      else if (!(stack?.col >= 0) && !replaced.has(at) && classify(m.rest, frames[reached], at, m.col).kind !== 'item' &&
          ((col === 0 || col === zero) && reached < baseAt - 1 && base.kind === 'quote' ||
            col === quotePlus.docMarker && frames.slice(baseAt, -1).some((f) => f.kind === 'quote'))) {
        const depth = frames.slice(1, reached + 1).filter((f) => f.kind === 'quote').length
        const shift = col - zero
        const cut = (line) => {
          const rest = stripQuotes(line, depth)?.rest
          if (rest === undefined) return null
          const ind = indentCols(rest)
          return ' '.repeat(Math.max(0, ind.col - shift)) + ind.rest
        }
        const end = at + pulledBlockLength(lines, at, cut)
        // The `+` line's continuation prefix: its quote markers, every other mark as a space.
        const opener = stripQuotes(lines[at - 1], depth).rest.replace(/\+[ \t]*$/, '').replace(/[^>\t]/g, ' ')
        for (let j = at; j < end; j++) {
          const rest = stripQuotes(lines[j], depth).rest
          replaced.add(j)
          lines[j] = lines[j].slice(0, lines[j].length - rest.length) + opener + cut(lines[j])
        }
        result[result.length - 1] = result.at(-1).replace(/\+[ \t]*$/, '')
        quotePlus.para = false
        quotePlus.plus = undefined
        at--
        continue
      }
    }
    reach = reached
    const inner = top()
    if (inner.kind === 'fence' && !missed) {
      // Step 1: an open payload tests its closer first.
      const payloadPath = trace ? ownerPath() : null
      let payloadForm = 'payload'
      lead(Math.max(m.col - inner.cut, inner.canon))
      if (m.rest !== '' && inner.span) {
        const c = inner.span[0] === '%' ? COMMENT_FENCE_BODY.exec(m.rest) : PURE_FENCE.exec(m.rest)
        if (c && c[1][0] === inner.span[0] &&
            (inner.span[0] === '%' ? c[1].length === inner.span.length : c[1].length >= inner.span.length)) inner.span = null
      } else if (m.rest !== '' && inner.closes(m.rest, m.col)) {
        frames.pop()
        top().last = 'block'
        payloadForm = 'closer'
      } else if (inner.lineBlock) {
        // A span in a line-block payload pairs past the column too (carve-php#3137).
        const f = FENCE.exec(m.rest)
        const comment = COMMENT_FENCE_BODY.exec(m.rest)
        if (f && parseFenceInfo(f[2]) !== null && (closerRuns().widest[f[1][0]][at + 1] ?? 0) >= f[1].length) inner.span = f[1]
        else if (comment && (closerRuns().lastComment.get(comment[1].length) ?? -1) > at) inner.span = comment[1]
      }
      result.push(out + src)
      if (trace) emit(at, 'S1', payloadPath, 'CARVE-P0-005', payloadForm,
        { cell: `B-${inner.family}-${payloadForm === 'closer' ? 'end' : 'keep'}` })
      continue
    }
    if (inner.kind === 'fence') frames.pop()
    let owner = frames[reached]
    const form = classify(m.rest, owner, at, m.col)
    // A note's first-block `+` takes a non-list block at document column zero
    // as at its marker column (CARVE-P9-067): read the line again there.
    const plusNote = top().kind === 'note' && top().plus === at - 1 ? top() : null
    const docCol = plusNote ? docColumn(lines[at], m.rest) : -1
    // Stacked on an item's marker line, the `+` already reads column zero there.
    const host = plusNote ? frames[frames.length - 2] : null
    if (plusNote && !(host.kind !== 'quote' && host.line === plusNote.line) && missed && m.rest !== '' && docCol === 0 && form.kind !== 'item' && !CONT_MARKER.test(m.rest) && !replaced.has(at)) {
      replaced.add(at)
      let prefix = out
      for (let k = reached + 1; k < frames.length; k++) {
        if (frames[k].kind === 'quote') prefix += ' '.repeat(frames[k - 1].reader ?? frames[k - 1].canon) + '> '
      }
      const moved = prefix + ' '.repeat(plusNote.reader - FOOTNOTE_BODY_COLUMN)
      // An attached code or comment fence moves whole: its payload is never
      // read again as lines of the note's host.
      const fence = FENCE.exec(m.rest)
      if (fence && parseFenceInfo(fence[2]) !== null || COMMENT_FENCE_BODY.test(m.rest)) {
        const end = at + pulledBlockLength(lines, at, (line) => line)
        result.push(moved + m.rest, ...lines.slice(at + 1, end).map((line) => isBlank(line) ? line : moved + line))
        if (trace) {
          const family = fence ? 'code' : 'comment'
          const path = ownerPath()
          emit(at, 'S5', path, 'CARVE-P9-067', family, { cell: `B-${family}-start`, plus: at })
          for (let j = at + 1; j < end; j++) {
            const form = j === end - 1 && !leavesFenceOpen(lines.slice(at, end)) ? 'closer' : 'payload'
            emit(j, 'S1', `${path}/${family}:${at + 1}`, 'CARVE-P0-005', form, { cell: `B-${family}-${form === 'closer' ? 'end' : 'keep'}` })
          }
        }
        plusNote.para = false
        plusNote.last = 'block'
        plusNote.plus = undefined
        at = end - 1
        continue
      }
      // A colon fence's lines move with it and are read again in the note.
      // Under a quote prefix a blank line moves too, or it would end the quote.
      const end = COLON_FENCE.test(m.rest) ? at + pulledBlockLength(lines, at, (line) => line) : at + 1
      for (let j = at + 1; j < end; j++) {
        replaced.add(j)
        if (!isBlank(lines[j])) lines[j] = moved + lines[j]
        else if (prefix !== '') lines[j] = prefix.trimEnd()
      }
      lines[at] = moved + m.rest
      at--
      continue
    }
    // Past a missed note a marker opens where an item or a description body
    // owns it (§10 I2), or beside a missed list.
    const missedNote = missed && frames.slice(reached + 1).some((f) => f.kind === 'note')
    // A list item interrupts the one-line paragraph a note's refused `+` forms (§10 I2).
    const interruptsPlus = plusNote && form.kind === 'item'
    if (missed && m.rest !== '' && top().para && !form.interrupts && !interruptsPlus &&
        !(form.kind === 'item' && frames[reached + 1]?.kind === 'item' && frames[reached + 1].axes === form.axes) &&
        !(missedNote && form.kind === 'item' && (owner.kind === 'item' || owner.kind === 'dd' || frames.slice(reached + 1).some((f) => f.kind === 'item'))) &&
        !(missedNote && form.kind === 'dd' && m.col - owner.cut === owner.canon)) {
      // Step 4: a lazy line, read as text where it stands, and still short of
      // the frame it missed. Past a missed note it is framed LAZY in the
      // deepest container, so every reader folds it there (carve#3885).
      // A refused `+` stays a line of text the follower folds into (CARVE-P9-067).
      if (missedNote && (top().plus !== at - 1 || (plusNote && docCol !== 0 && docCol !== plusNote.docMarker))) {
        lead(0)
        for (let k = reached + 1; k < frames.length; k++) {
          if (frames[k].kind === 'quote') out += ' '.repeat(frames[k - 1].reader ?? frames[k - 1].canon) + '> '
        }
        const leaf = top()
        result.push(out + ' '.repeat(leaf.kind === 'quote' ? 0 : leaf.reader) + LAZY + src)
        if (trace) emit(at, 'S4', ownerPath(), 'CARVE-P0-006', 'lazy', { reached: ownerPath(reached) })
        continue
      }
      const next = frames[reached + 1]
      const limit = next.kind === 'quote' ? Infinity : next.canon - 1
      // A description separator is measured from its term's own column (CARVE-P0-008).
      const cut = form.kind === 'dd' && owner.termShift !== undefined ? owner.termShift : owner.cut
      lead(Math.min(Math.max(m.col - cut, owner.canon), limit))
      if (FENCE.test(m.rest)) textFences.push({ at: result.length, col: owner.canon })
      result.push(out + src)
      if (trace) emit(at, 'S4', ownerPath(), 'CARVE-P0-006', 'lazy', { reached: ownerPath(reached) })
      continue
    }
    const closed = frames.length - 1 - reached
    const reachedPath = trace && closed > 0 ? ownerPath(reached) : undefined
    const closedColumn = frames.slice(reached + 1).some((f) => f.kind !== 'quote')
    frames.length = reached + 1
    owner = top()
    let applied = trace ? ownerPath() : null
    if (m.rest === '') {
      owner.para = false
      lead(m.col)
    } else if (form.kind === 'colon-close') {
      lead(frames[form.frame].canon)
      if (trace) applied = ownerPath(form.frame)
      frames.length = form.frame
      top().para = false
      top().last = 'block'
    } else if (form.kind === 'text') {
      // A new paragraph starts at the owner's column, never inside a frame
      // that line did not reach.
      // A term's continuation moves with the term, so a later `:` body still follows it.
      const term = owner.para && owner.last === 'term'
      // A separator after a `+` moved onto the owner meets it where its term stood.
      const afterPlus = owner.para && owner.plusLine === at - 1 && owner.termShift !== undefined && DESCRIPTION_LEAD.test(m.rest)
      const cut = term ? owner.termCut : afterPlus ? owner.termShift : owner.cut
      const moved = !(owner.para || !closedColumn || plusFollower)
      lead(moved ? owner.canon : Math.max(m.col - cut, owner.canon), term)
      owner.plusLine = moved && CONT_MARKER.test(m.rest) ? at : undefined
      if (owner.para && FENCE.test(m.rest)) textFences.push({ at: result.length, col: owner.canon })
      owner.absorbs = (owner.para && owner.absorbs) || absorbsColon(m.rest)
      owner.para = true
      if (!term) owner.last = 'para'
    } else {
      lead(owner.canon, form.kind === 'term' || form.kind === 'dd')
      apply(owner, m.col, form)
      if (trace) applied = ownerPath()
    }
    result.push(out + src)
    if (trace) {
      const kind = TRACE_FORM[form.kind] ?? form.family ?? form.kind
      const cell = form.kind === 'colon-close' ? 'B-div-end' : TRACE_OPENS.has(form.kind) ? `B-${form.family ?? kind}-start` : undefined
      emit(at, 'S5', applied, TRACE_RULE[form.kind] ?? 'CARVE-P0-024', kind,
        { cell, closed: closed > 0 ? closed : undefined, reached: reachedPath, plus: plusFollower ? at : undefined })
    }

    // `col` is where the opener starts in the source, `canon` where it lands.
    // `reader` is the column the block readers measure the opener at: a note's
    // marker-line content starts at its body column.
    function apply(owner, col, form, canon = owner.canon, reader = owner.reader ?? owner.canon) {
      // A caption spills onto following lines like a paragraph (CARVE-P2-021).
      owner.para = !!form.caption
      owner.last = form.kind
      if (form.kind === 'term') {
        owner.para = true
        owner.termCut = col - canon
        owner.termShift = col - owner.canon
      }
      if (form.kind === 'fence' || form.kind === 'colon') {
        frames.push({ kind: form.kind, family: form.family ?? 'div', line: at, col: owner.col, canon: owner.canon, reader, cut: col - canon,
          closes: form.closes, run: form.run, lineBlock: form.lineBlock, span: null, para: false, last: null })
        return
      }
      if (form.kind === 'quote') {
        const quote = { kind: 'quote', col: 0, canon: 0, cut: 0, para: false, last: null, markerCol: col, markerCanon: canon,
          docMarker: docColumn(lines[at], src), line: at }
        frames.push(quote)
        take(src.length - (QUOTE.exec(src)[1] ?? '').length)
        m = walkIndent(src)
        return content(quote, 0, 0)
      }
      if (form.kind === 'item' || form.kind === 'note' || form.kind === 'dd') {
        const frame = { kind: form.kind, col: col + form.width, canon: canon + form.width, reader: reader + form.width,
          docMarker: docColumn(lines[at], src), line: at,
          cut: col - canon, para: false, last: null, markerCol: col, markerCanon: canon, axes: form.axes }
        frames.push(frame)
        take(form.head)
        m = walkIndent(src)
        return content(frame, col + form.head, canon + form.head)
      }
    }

    // The rest of a marker line. Only a quote starts new coordinates, so only
    // there can its content be moved.
    function content(frame, start, canon) {
      if (m.rest === '' || frames.length > MAX_NESTING_DEPTH) return
      const form = classify(m.rest, frame, at, frame.kind === 'quote' ? m.col : start + m.col)
      if (form.kind === 'text') {
        lead(m.col)
        frame.absorbs = absorbsColon(m.rest)
        frame.para = true
        // A lone `+` may attach the next line instead (§17 L3).
        if (CONT_MARKER.test(m.rest)) frame.plus = at
        frame.last = 'para'
        return
      }
      if (frame.kind === 'quote') {
        const col = m.col
        lead(0)
        return apply(frame, col, form, 0)
      }
      const col = start + m.col
      lead(m.col)
      apply(frame, col, form, canon + m.col, frame.kind === 'note' ? frame.reader : frame.reader + canon + m.col - frame.canon)
    }
  }
  const walked = frameTextFences(result, textFences)
  walked.refusedPlus = refusedPlus
  return walked

  // A decision trace record (docs/decision-trace.md). `depth` cuts the path at a frame.
  function emit(index, step, owner, rule, form, extra = {}) {
    // The empty string after a final newline is not a line.
    if (index === lines.length - 1 && lines[index] === '') return
    const record = { line: index + 1, step, owner, rule, form }
    for (const [key, value] of Object.entries(extra)) if (value !== undefined) record[key] = value
    trace.push(record)
  }

  function ownerPath(depth = frames.length - 1) {
    let path = 'doc'
    for (let k = 1; k <= depth; k++) path += `/${TRACE_FRAME[frames[k].kind] ?? frames[k].family}:${frames[k].line + 1}`
    return path
  }

  // The document column where `rest`, a suffix of `line`, starts.
  function docColumn(line, rest) {
    let col = 0
    for (const ch of line.slice(0, line.length - rest.length)) col = ch === '\t' ? (Math.floor(col / 4) + 1) * 4 : col + 1
    return col
  }

  // Whether line `next` holds a block at `col` under `depth` quote levels.
  function attachesAt(next, col, depth) {
    if (next >= lines.length) return false
    let m = walkIndent(lines[next])
    for (let d = 0; d < depth; d++) {
      if (!QUOTE.test(m.rest)) return false
      m = walkIndent(QUOTE.exec(m.rest)[1] ?? '')
    }
    return m.rest.trim() !== '' && m.col === col
  }

  function absorbsColon(rest) {
    const colon = COLON_FENCE.exec(trimLineEnd(rest))
    return !!colon && parseColonOpener(colon[2]) === null
  }

  function classify(rest, owner, at, col) {
    // Line-final whitespace is trimmed before a line is read, so heads are measured without it.
    rest = trimLineEnd(rest)
    if (rest === '') return { kind: 'blank', interrupts: true }
    if (QUOTE.test(rest)) return { kind: 'quote', interrupts: true }
    const colon = COLON_FENCE.exec(rest)
    if (colon && COLON_CLOSER.test(rest)) {
      // A closer is read in its owner: only a colon body at the reached depth,
      // or holding it directly, can take it.
      for (let k = reach; k > 0 && frames[k].kind === 'colon'; k--) {
        if (frames[k].run === colon[1].length) return { kind: 'colon-close', frame: k, interrupts: true }
      }
    }
    if (colon && parseColonOpener(colon[2]) !== null) {
      const run = colon[1].length
      // A bare `:::` interrupts unless the paragraph's own lines absorbed an
      // invalid opener (§10 I4, CARVE-P9-016, CARVE-P9-017).
      const interrupts = isColonParagraphInterrupt(rest) ||
        (COLON_CLOSER.test(rest) && !(owner === top() && owner.para && owner.absorbs))
      if (owner.para && !interrupts) return { kind: 'text', interrupts: false }
      if (parseColonOpener(colon[2]).mode === 'line-block') {
        return { kind: 'fence', family: 'div', interrupts, lineBlock: true, closes: (r) => COLON_CLOSER.exec(r)?.[1].length === run }
      }
      return { kind: 'colon', run, interrupts }
    }
    const fence = FENCE.exec(rest)
    if (fence && parseFenceInfo(fence[2]) !== null) {
      const run = fence[1]
      // A run indented past its opener is code content (CARVE-P2-006).
      const closes = (r, closerCol) => {
        const c = closerCol <= col && PURE_FENCE.exec(r)
        return !!(c && c[1][0] === run[0] && c[1].length >= run.length)
      }
      return { kind: 'fence', family: 'code', interrupts: true, closes }
    }
    const comment = COMMENT_FENCE_BODY.exec(rest)
    if (comment) {
      const run = comment[1].length
      const closes = (r) => COMMENT_FENCE_BODY.exec(r)?.[1].length === run
      if ((closerRuns().lastComment.get(run) ?? -1) > at) return { kind: 'fence', family: 'comment', interrupts: true, closes }
    }
    if (COMMENT_LINE.test(rest)) return { kind: 'leaf', interrupts: true }
    const note = /^\[\^[^\]]+\]: +/.exec(rest)
    if (note && FOOTNOTE_DEF.test(rest)) return { kind: 'note', width: FOOTNOTE_BODY_COLUMN, head: note[0].length, interrupts: true }
    const marker = matchMarkerAt({ col: 0, rest })
    // §10 I2: under an open paragraph a marker opens only in a list item.
    // A term is not a paragraph a marker continues.
    if (marker && owner.para && owner.kind !== 'item' && owner.last !== 'term') return { kind: 'text', interrupts: false }
    if (marker) {
      return { kind: 'item', width: marker.markerWidth, head: rest.length - marker.text.length, interrupts: false,
        axes: marker.isOrdered ? `${marker.delim}` : marker.bullet }
    }
    if (DEFLIST_TERM.test(rest)) return { kind: 'term', interrupts: true }
    const dd = /^:( +)(?=[ \t]*[^ \t])/.exec(rest)
    if (dd && (owner.last === 'term' || owner.last === 'dd')) {
      return { kind: 'dd', width: 1 + dd[1].length, head: 1 + dd[1].length, interrupts: false }
    }
    if (HEADING.test(rest) || HR.test(rest) || isTableRow(rest) || isLinkDef(rest) ||
        FOOTNOTE_DEF.test(rest) || ABBR_DEF.test(rest) || (rest[0] === '{' && tryAttrLine([rest], 0))) {
      return { kind: 'leaf', interrupts: true }
    }
    if (CAPTION.test(rest)) return { kind: 'leaf', interrupts: false, caption: true }
    return { kind: 'text', interrupts: false }
  }

  // Closer lookahead in one pass: the widest pure fence run of each character
  // at or after every line, and the last line of each comment run length.
  function closerRuns() {
    if (runs) return runs
    runs = { widest: { '`': new Array(lines.length + 1).fill(0), '~': new Array(lines.length + 1).fill(0) }, lastComment: new Map() }
    for (let j = lines.length - 1; j >= 0; j--) {
      const rest = quotedRest(lines[j])
      runs.widest['`'][j] = runs.widest['`'][j + 1]
      runs.widest['~'][j] = runs.widest['~'][j + 1]
      const c = PURE_FENCE.exec(rest)
      if (c) runs.widest[c[1][0]][j] = Math.max(runs.widest[c[1][0]][j], c[1].length)
      const comment = COMMENT_FENCE_BODY.exec(rest)
      if (comment && !runs.lastComment.has(comment[1].length)) runs.lastComment.set(comment[1].length, j)
    }
    return runs
  }

  function quotedRest(line) {
    return quotedMeasure(line).rest
  }

  function quotedMeasure(line) {
    let m = walkIndent(line)
    while (QUOTE.test(m.rest)) m = walkIndent(QUOTE.exec(m.rest)[1] ?? '')
    return m
  }

}

// The readers re-derive a fence line's reading from the walk's output, where
// moved lines can supply a closer the source did not have (CARVE-P2-006). A
// fence-shaped line the walk read as paragraph text is framed LAZY, which every
// reader takes as text, when a closer-shaped run lies below it at its column or
// deeper. The frame sits at the owner's content column, so the line stays in
// its container. One reverse pass; a max Fenwick tree per character over columns.
function frameTextFences(result, textFences) {
  if (textFences.length === 0) return result
  const segments = result.map((line) => {
    let s = line
    let m = walkIndent(s)
    while (QUOTE.test(m.rest)) {
      s = QUOTE.exec(m.rest)[1] ?? ''
      m = walkIndent(s)
    }
    return { prefix: line.slice(0, line.length - s.length), m }
  })
  const size = segments.reduce((max, { m }) => Math.max(max, m.col), 0) + 2
  const trees = { '`': new Array(size).fill(0), '~': new Array(size).fill(0) }
  // Index `size - 1 - col`, so a prefix holds every column at or past `col`.
  const add = (tree, col, run) => { for (let k = size - 1 - col; k < size; k |= k + 1) tree[k] = Math.max(tree[k], run) }
  const widest = (tree, col) => {
    let best = 0
    for (let k = size - 1 - col; k >= 0; k = (k & (k + 1)) - 1) best = Math.max(best, tree[k])
    return best
  }
  let next = textFences.length - 1
  for (let j = result.length - 1; j >= 0 && next >= 0; j--) {
    const { prefix, m } = segments[j]
    if (textFences[next]?.at === j) {
      const f = FENCE.exec(m.rest)
      if (f && widest(trees[f[1][0]], m.col) >= f[1].length) result[j] = prefix + ' '.repeat(textFences[next].col) + LAZY + m.rest
      next--
    }
    const c = PURE_FENCE.exec(m.rest)
    if (c) add(trees[c[1][0]], m.col, c[1].length)
  }
  return result
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

/**
 * The frontmatter OPENER line, bare or typed. Exported so the one artifact that
 * asks this question outside the layout keeps asking it the same way.
 */
export const FRONTMATTER_OPENER = /^---(?:[ \t]*$|(?! *[^\S ])( (?! )|[A-Za-z0-9]+[ \t]*$))/

/**
 * Whether a SOURCE opens frontmatter at all: an opener line AND a closing dash
 * run below it.
 *
 * The closer is half the rule, and the conformance oracle's own copy of this
 * test had only `/^---\r?\n/` - so a document that is a lone `---`, an ordinary
 * thematic break, was reported as frontmatter the tree failed to carry. That
 * finding class is UNGATED by design, with no ledger to declare it in, so the
 * oracle alone failed `AST full-corpus verdict` against all three engines at
 * once - and all three were right (carve#2881).
 */
export function sourceOpensFrontmatter(source) {
  const lines = String(source).split('\n').map((line) => line.replace(/\r$/, ''))
  if (lines[0] === undefined || !FRONTMATTER_OPENER.test(lines[0])) return false
  return lines.slice(1).some((line) => /^---[ \t]*$/.test(line))
}

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
  // A lone surrogate becomes U+FFFD too (CARVE-P0-023), one code unit for
  // one, so no offset moves. A file's invalid bytes never reach here: the
  // UTF-8 decode that produced this string already replaced them.
  src = src.toWellFormed()
  // `newline = '\n' | '\r\n' | '\r'` - all three end a line, and splitting on
  // '\n' alone left the carriage return as ordinary text at the end of every
  // line, which the inline grammar then refused outright. So the oracle could
  // not read a CRLF document at all, while the production says it is one
  // (carve#872).
  src = src.replace(/\r\n?/g, '\n')
  return src
}

function restoreOrdinaryPlus(value, sentinel) {
  if (typeof value === 'string') return value.replaceAll(sentinel, '+')
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = restoreOrdinaryPlus(value[i], sentinel)
  } else if (value instanceof Map) {
    for (const [key, entry] of value) value.set(key, restoreOrdinaryPlus(entry, sentinel))
  } else if (value && typeof value === 'object' && !(value instanceof WeakMap) && !(value instanceof WeakSet)) {
    for (const key of Object.keys(value)) value[key] = restoreOrdinaryPlus(value[key], sentinel)
  }
  return value
}

/*
 * `stateSink` is an OBSERVABILITY parameter and nothing else: the collector's
 * cross-container channel (`state`) is internal, so a lifecycle published onto
 * it could not otherwise be checked by a test. Passing one changes no answer.
 * Introduced with the per-descendant question-1 state (carve#2746).
 */
export function parse(src, { stateSink = null, includeFiles = null, trace = null } = {}) {
  src = normalizeSource(src)
  const walked = ownLines(src.split('\n'), trace)
  src = walked.join('\n')
  // A private character keeps indented plus lines ordinary through recursive dedents.
  let hasOrdinaryPlus = false
  let sentinel = '\uE100'
  while (src.includes(sentinel)) sentinel = String.fromCharCode(sentinel.charCodeAt(0) + 1)
  let refusedSiblingSentinel = String.fromCharCode(sentinel.charCodeAt(0) + 1)
  while (src.includes(refusedSiblingSentinel)) refusedSiblingSentinel = String.fromCharCode(refusedSiblingSentinel.charCodeAt(0) + 1)
  const sourceLines = src.split('\n')
  const refusedPlusLines = []
  const markerColumns = []
  const quotedMarkerColumns = new Map()
  let quoteColumn = -1
  let sourceFenceScanAt = 0
  let sourceFenceOpen = null
  let sourceFenceQuoteDepth = 0
  const sourceFenceLine = line => {
    const quoted = quoteLeaf(line)
    let rest = quoted.measured.rest
    let depth = quoted.depth
    const marker = matchMarkerAt(quoted.measured)
    if (marker) {
      rest = marker.text.trimStart()
      while (QUOTE.test(rest)) { rest = QUOTE.exec(rest)[1] ?? ''; depth++ }
    }
    return { rest, depth }
  }
  const sourceFenceOpenBefore = at => {
    for (let row = sourceFenceScanAt; row < at; row++) {
      const { rest, depth } = sourceFenceLine(sourceLines[row])
      if (sourceFenceOpen && depth < sourceFenceQuoteDepth) sourceFenceOpen = null
      const run = PURE_FENCE.exec(rest)?.[1]
      if (sourceFenceOpen && run && run[0] === sourceFenceOpen[0] && run.length >= sourceFenceOpen.length) sourceFenceOpen = null
      else if (!sourceFenceOpen) {
        const fence = FENCE.exec(rest)
        if (fence && parseFenceInfo(fence[2]) !== null &&
            !(liveQuoteDepth > 0 && depth === 0 && indentCols(sourceLines[row]).col > 0)) {
          sourceFenceOpen = fence[1]
          sourceFenceQuoteDepth = depth
        }
      }
    }
    sourceFenceScanAt = at
    if (sourceFenceOpen && sourceFenceLine(sourceLines[at]).depth < sourceFenceQuoteDepth) sourceFenceOpen = null
    return sourceFenceOpen !== null
  }
  const quoteLeaf = line => {
    let rest = indentCols(line).rest
    let depth = 0
    while (QUOTE.test(rest)) { rest = QUOTE.exec(rest)[1] ?? ''; depth++ }
    return { depth, leaf: rest, measured: indentCols(rest) }
  }
  const sourceHasLonePlus = sourceLines.some(line =>
    /^[ \t]*(?:>[ \t]*)*\+[ \t]*$/.test(line) ||
    /^[ \t]*(?:(?:[-*]|(?:\d+|[a-z]+|[A-Z]+)[.)])[ \t]+)+(?:\[[ xX_-]\][ \t]+)?\+[ \t]*$/.test(line) ||
    (line.includes('>') && /\+[ \t]*$/.test(line) &&
      markerCarriesContinuation(indentCols(line).rest, new Map())))
  const quotePathBefore = []
  const sourceFenceBefore = []
  let liveQuoteDepth = 0
  let hostedQuoteColumn = null
  let hostedMarkerQuote = false
  let hostedMarkerDepth = 0
  let hostedMarkerSourceColumn = null
  let liveQuoteItem = false
  // A closer owned by an outer div cannot be the block attached after `+`.
  // Record those boundaries before classifying plus lines inside quotes.
  const enclosingColonClosers = new Set()
  const enclosingColonStack = []
  if (sourceHasLonePlus) for (const [index, line] of sourceLines.entries()) {
    quotePathBefore.push({ depth: liveQuoteDepth, hostedColumn: hostedQuoteColumn, hostedMarker: hostedMarkerQuote,
      hostedDepth: hostedMarkerDepth, hostedSourceColumn: hostedMarkerSourceColumn, item: liveQuoteItem })
    const inFence = sourceFenceOpenBefore(index)
    sourceFenceBefore.push(inFence)
    if (inFence) continue
    const measuredColon = indentCols(line)
    const colonRun = COLON_FENCE.exec(measuredColon.rest)
    if (colonRun && COLON_CLOSER.test(measuredColon.rest)) {
      const top = enclosingColonStack.at(-1)
      if (top?.length === colonRun[1].length && top.column === measuredColon.col) {
        enclosingColonClosers.add(index)
        enclosingColonStack.pop()
      } else {
        enclosingColonStack.push({ length: colonRun[1].length, column: measuredColon.col })
      }
    } else if (colonRun && parseColonOpener(colonRun[2]) !== null) {
      enclosingColonStack.push({ length: colonRun[1].length, column: measuredColon.col })
    }
    const quoted = quoteLeaf(line)
    const rest = quoted.measured.rest
    const marker = matchMarkerAt(quoted.measured)
    if (rest === '' || marker ||
        ((startsVisibleBlock(rest) || FENCE.test(rest)) &&
          !(liveQuoteDepth > 0 && quoted.depth === 0 && indentCols(line).col > 0))) {
      liveQuoteDepth = quoted.depth
      hostedQuoteColumn = null
      hostedMarkerQuote = false
      hostedMarkerDepth = 0
      liveQuoteItem = !!marker
    } else if (quoted.depth > liveQuoteDepth) {
      liveQuoteDepth = quoted.depth
      hostedQuoteColumn = null
      hostedMarkerQuote = false
      hostedMarkerDepth = 0
      liveQuoteItem = false
    }
    if (QUOTE.test(rest)) { hostedQuoteColumn = quoted.measured.col; hostedMarkerQuote = false; hostedMarkerDepth = 0 }
    let host = marker
    let hostColumn = marker?.indent ?? 0
    for (let depth = 0; host && depth < MAX_NESTING_DEPTH; depth++) {
      hostColumn += host.markerWidth
      const nested = indentCols(host.text)
      hostColumn += nested.col
      const hostedQuote = quoteLeaf(host.text)
      if (hostedQuote.depth > 0) {
        hostedQuoteColumn = hostColumn
        hostedMarkerQuote = true
        hostedMarkerDepth = hostedQuote.depth
        hostedMarkerSourceColumn = hostColumn
        liveQuoteDepth = hostedMarkerDepth
        break
      }
      host = matchMarkerAt(nested)
    }
    const bodyLead = quoted.depth === 0 && !marker ? /^(?::|\[\^[^\]]+\]:) +(?=> )/.exec(rest) : null
    if (bodyLead) {
      hostedMarkerDepth = quoteLeaf(rest.slice(bodyLead[0].length)).depth
      hostedMarkerSourceColumn = indentCols(line).col + bodyLead[0].length
    }
  }
  const openSiblingList = (index, col, depth) => {
    let sawPlainLine = false
    for (let row = index - 1; row >= 0; row--) {
      const leaf = quoteLeaf(sourceLines[row])
      if (leaf.depth !== depth) {
        const quotedCol = indentCols(sourceLines[row]).col
        if (depth === 0 && leaf.depth > 0 && (quotedCol > col || col > 0 && quotedCol === col)) continue
        const host = depth === 1 ? matchMarkerAt(indentCols(sourceLines[row])) : null
        const hosted = host ? quoteLeaf(host.text) : null
        return hosted?.depth === depth && hosted.measured.col === col && !!matchMarkerAt(hosted.measured)
      }
      const measured = depth === 0 ? indentCols(sourceLines[row]) : leaf.measured
      if (measured.rest === '') {
        if (sawPlainLine) return false
        continue
      }
      if (measured.col > col) continue
      if (matchMarkerAt(measured)) return measured.col === col
      if (CONT_MARKER.test(measured.rest)) continue
      // A plain line at this column can be a lazy continuation of the item.
      // Keep looking for its marker, but a blank between them ends that claim.
      if (measured.col === col && foldablePlainLine(measured.rest)) {
        sawPlainLine = true
        continue
      }
      return false
    }
    return false
  }
  const lines = sourceHasLonePlus ? sourceLines.map((line, index) => {
    const stackedFollower = sourceLines[index + 1] === undefined
      ? null : indentCols(sourceLines[index + 1])
    if (/^[ \t]*(?:>[ \t]*)?(?:(?:[-*]|(?:\d+|[a-z]+|[A-Z]+)[.)])[ \t]+)+>[ \t]+\+[ \t]*$/.test(line) &&
        (!stackedFollower?.rest || matchMarkerAt(stackedFollower))) {
      hasOrdinaryPlus = true
      return line.replace(/\+(?=[ \t]*$)/, sentinel)
    }
    const measured = indentCols(line)
    const barePlus = CONT_MARKER.test(measured.rest)
    const quoted = quoteLeaf(line)
    if (quoted.depth > 0 && index + 1 < sourceLines.length) {
      let tail = quoted.leaf
      for (let depth = 0; depth < MAX_NESTING_DEPTH; depth++) {
        const marker = matchMarkerAt(indentCols(tail))
        if (!marker) break
        tail = marker.text
      }
      const innerQuote = quoteLeaf(tail)
      const follower = quoteLeaf(sourceLines[index + 1])
      const followerColumn = sourceLines[index + 1].length - follower.leaf.length
      const innerQuoteColumn = line.lastIndexOf('>')
      if (innerQuote.depth > 0 && CONT_MARKER.test(innerQuote.leaf) &&
          follower.depth > 0 && follower.depth < quoted.depth &&
          followerColumn < innerQuoteColumn) {
        refusedPlusLines.push(index)
        hasOrdinaryPlus = true
        return line.replace(/\+(?=[ \t]*$)/, sentinel)
      }
    }
    if (quoted.depth > 0) {
      quoteColumn = measured.col
      const stack = quotedMarkerColumns.get(quoted.depth) ?? []
      const next = sourceLines[index + 1] === undefined ? null : quoteLeaf(sourceLines[index + 1])
      if (next?.depth === 0) next.measured = indentCols(sourceLines[index + 1])
      if (CONT_MARKER.test(quoted.measured.rest)) {
        const sameLevel = next?.depth === quoted.depth
        const owner = quotePathBefore[index]
        const prior = index === 0 ? null : quoteLeaf(sourceLines[index - 1])
        const quoteOpenedHere = index === 0 || prior.depth < quoted.depth
        // A quote opened on an item's marker line is as deep as its `>` run (CARVE-P9-033).
        const hostedDeeper = !!next && owner.hostedDepth > quoted.depth &&
          measured.col === owner.hostedSourceColumn && indentCols(sourceLines[index + 1]).col === measured.col
        const quoteFollower = next?.depth > quoted.depth &&
          (owner.depth > quoted.depth || hostedDeeper || stack.includes(quoted.measured.col))
        const missingInnerPrefix = sameLevel && !sourceFenceBefore[index] &&
          (quoted.measured.col > 0 && owner.depth > quoted.depth &&
            (owner.item || prior?.depth > quoted.depth && startsVisibleBlock(prior.measured.rest)) ||
            owner.depth === quoted.depth &&
            owner.hostedColumn !== null && quoted.measured.col >= owner.hostedColumn &&
            (!owner.hostedMarker || !!matchMarkerAt(next.measured) || FENCE.test(next.measured.rest)))
        const sibling = sameLevel && stack.includes(quoted.measured.col) &&
          openSiblingList(index, quoted.measured.col, quoted.depth) &&
          next.measured.col === quoted.measured.col && matchMarkerAt(next.measured)
        const firstBlockFollower = next?.depth < quoted.depth &&
          (next.measured.col === 0 || next.depth === 0 && next.measured.col === measured.col) &&
          quoted.measured.col === 0 && !matchMarkerAt(next.measured) && quoteOpenedHere
        const refused = (!sameLevel && !quoteFollower && !firstBlockFollower) ||
          !next.measured.rest || (!firstBlockFollower && next.measured.col !== quoted.measured.col)
        if (sibling) { refusedPlusLines.push(index); hasOrdinaryPlus = true; return line.replace(/\+(?=[ \t]*$)/, refusedSiblingSentinel) }
        if (refused || missingInnerPrefix) { refusedPlusLines.push(index); hasOrdinaryPlus = true; return line.replace(/\+(?=[ \t]*$)/, sentinel) }
        return line
      }
      let opener = matchMarkerAt(quoted.measured)
      if (opener) while (stack.length && stack.at(-1) >= quoted.measured.col) stack.pop()
      let openerCol = quoted.measured.col
      for (let depth = 0; opener && depth < MAX_NESTING_DEPTH; depth++) {
        stack.push(openerCol)
        const nested = indentCols(opener.text)
        openerCol += opener.markerWidth + nested.col
        opener = matchMarkerAt(nested)
      }
      if (FOOTNOTE_DEF.test(quoted.measured.rest) || /^:{1,2} /.test(quoted.measured.rest)) stack.push(quoted.measured.col)
      quotedMarkerColumns.set(quoted.depth, stack)
      return line
    }
    if (barePlus) {
      const next = sourceLines[index + 1] === undefined ? null : indentCols(sourceLines[index + 1])
      const sibling = markerColumns.includes(measured.col) && openSiblingList(index, measured.col, 0) &&
        next && next.col === measured.col && matchMarkerAt(next)
      const refused = !next || !next.rest || next.col !== measured.col || enclosingColonClosers.has(index + 1)
      const owner = quotePathBefore[index]
      const missingQuotePrefix = !sourceFenceBefore[index] &&
        (owner.hostedColumn !== null && measured.col >= owner.hostedColumn &&
          (!owner.hostedMarker || !!next && (!!matchMarkerAt(next) || FENCE.test(next.rest))) ||
          owner.depth > 0 && markerColumns.length > 0 && !!next && !!matchMarkerAt(next))
      if (sibling || refused || missingQuotePrefix || !markerColumns.includes(measured.col) && quoteColumn !== measured.col) {
        refusedPlusLines.push(index)
        hasOrdinaryPlus = true
        return line.replace(/\+(?=[ \t]*$)/, sibling ? refusedSiblingSentinel : sentinel)
      }
      return line
    }
    if (measured.rest === '') {
      quoteColumn = -1
      return line
    }
    let opener = matchMarkerAt(measured)
    if (opener) while (markerColumns.length && markerColumns.at(-1) >= measured.col) markerColumns.pop()
    let openerCol = measured.col
    for (let depth = 0; opener && depth < MAX_NESTING_DEPTH; depth++) {
      markerColumns.push(openerCol)
      const nested = indentCols(opener.text)
      const hosted = quoteLeaf(opener.text)
      if (hosted.depth > 0 && matchMarkerAt(hosted.measured)) {
        const stack = quotedMarkerColumns.get(hosted.depth) ?? []
        stack.push(hosted.measured.col)
        quotedMarkerColumns.set(hosted.depth, stack)
      }
      openerCol += opener.markerWidth + nested.col
      if (hosted.depth > 0) quoteColumn = openerCol
      opener = matchMarkerAt(nested)
    }
    if (FOOTNOTE_DEF.test(measured.rest) || /^:{1,2} /.test(measured.rest)) markerColumns.push(measured.col)
    if (QUOTE.test(measured.rest)) quoteColumn = measured.col
    return line
  }) : sourceLines
  for (const index of walked.refusedPlus) {
    if (refusedPlusLines.includes(index)) continue
    refusedPlusLines.push(index)
    hasOrdinaryPlus = true
    lines[index] = lines[index].replace(/\+(?=[ \t]*$)/, sentinel)
  }
  if (lines[lines.length - 1] === '') lines.pop()
  const state = {
    linkDefs: new Map(),
    footnoteDefs: new Map(),
    abbrDefs: new Map(),
    includeFiles,
    prefixMemos: new WeakMap(),
    markerLineColumns: new WeakMap(),
    sourceHasLonePlus,
    unterminatedLines: new WeakSet(src.endsWith('\n') ? [] : [lines]),
  }
  if (hasOrdinaryPlus) state.ordinaryPlusSentinel = sentinel
  if (hasOrdinaryPlus) state.refusedSiblingSentinel = refusedSiblingSentinel
  // Only when a sink is passed. An always-present key would change the state
  // object's own shape, which a structural test deep-compares.
  if (stateSink) state.descendantQ1Log = (stateSink.descendantQ1 = [])
  if (stateSink) stateSink.refusedPlusLines = refusedPlusLines
  if (stateSink) state.markerFenceProbeSteps = 0
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
  if (lines[0] !== undefined && FRONTMATTER_OPENER.test(lines[0])) {
    for (let j = 1; j < lines.length; j++) {
      if (/^---[ \t]*$/.test(lines[j])) {
        lines.splice(0, j + 1)
        break
      }
    }
  }
  const blocks = parseBlocks(lines, state, true)
  if (hasOrdinaryPlus) {
    restoreOrdinaryPlus(blocks, sentinel)
    restoreOrdinaryPlus(blocks, refusedSiblingSentinel)
    restoreOrdinaryPlus(state.linkDefs, sentinel)
    restoreOrdinaryPlus(state.linkDefs, refusedSiblingSentinel)
    restoreOrdinaryPlus(state.footnoteDefs, sentinel)
    restoreOrdinaryPlus(state.footnoteDefs, refusedSiblingSentinel)
    restoreOrdinaryPlus(state.abbrDefs, sentinel)
    restoreOrdinaryPlus(state.abbrDefs, refusedSiblingSentinel)
    if (stateSink) {
      restoreOrdinaryPlus(state.descendantQ1Log, sentinel)
      restoreOrdinaryPlus(state.descendantQ1Log, refusedSiblingSentinel)
    }
  }
  // blockDepth is transient recursion bookkeeping (see parseBlocks); it must
  // not leak into the parse-result contract { blocks, linkDefs, footnoteDefs,
  // abbrDefs }. It is back to 0 here, so drop it before spreading state.
  delete state.blockDepth
  // inFigureGroup is the same kind of transient recursion bookkeeping (the
  // PART 9 SS4c no-nesting demotion); it is false again here, so drop it too.
  delete state.inFigureGroup
  delete state.includeFiles
  delete state.markerCommentClosers
  delete state.prefixMemos
  delete state.attachmentBoundaries
  delete state.quoteAttachmentOrigins
  delete state.markerLineColumns
  delete state.sourceHasLonePlus
  if (stateSink) stateSink.markerFenceProbeSteps = state.markerFenceProbeSteps
  delete state.markerFenceProbeSteps
  delete state.ordinaryPlusSentinel
  delete state.refusedSiblingSentinel
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
  for (const raw of lines) {
    const line = stripLazy(raw)
    if (line.trim() === '') { flush(); continue }
    run.push(line)
  }
  flush()
  return blocks
}

// A child reaching its parent's final source row inherits that row's line ending.
function inheritFinalBreak(parent, child, end, state) {
  if (end === parent.length && state.unterminatedLines?.has(parent)) {
    state.unterminatedLines.add(child)
  }
  return child
}

// Depth-guarded entry: every block-container recursion re-enters here, so a
// single counter on `state` bounds the nesting uniformly (PART 26). The
// counter is incremented on entry and decremented on exit (try/finally) so
// sibling containers never accumulate depth.
function parseBlocks(lines, state, top, inItem = false, meas = undefined, stop = undefined, descriptionOwnerColumn = null) {
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
    return parseBlocksImpl(lines, state, top, inItem, meas, stop, descriptionOwnerColumn)
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

function parseBlocksImpl(lines, state, top, inItem = false, seeded = undefined, stop = undefined, descriptionOwnerColumn = null) {
  const blocks = []
  let i = 0
  const n = lines.length
  const sourceColumns = state.descriptionSourceColumns?.get(lines)
  const relativeTermColumns = state.itemRelativeTermColumns?.has(lines) ?? false
  layoutWork.lineVisits += n

  // Measurements for these lines, memoized per index and SEEDED by the
  // enclosing container where it could derive them (carve#752). Without the
  // seed each level re-walks the same leading whitespace, which is what made a
  // nested document cost more than its bytes; with it the walk happens once
  // per line for the whole document. A seeded entry of `null` means the
  // container could not derive that one - a tab in the run, or a line it
  // synthesized - so it is walked here, once.
  const meas = seeded ?? new Array(n)
  // Fence lines the enclosing collector already found to open, whose closer
  // lies past these lines (§10 I4).
  const fenceOpens = state.fenceOpensAt?.get(lines)
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
    if (startsParagraphBlock(line, top)) return true
    if (fenceOpens?.has(idx)) return true
    if (isColonParagraphInterrupt(line) || COLON_CLOSER.test(line)) return true
    if (opensFence(lines, idx)) return true // I4: a valid opener interrupts
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
  const push = (node) => {
    const attrs = pending.flat()
    const tableFlag = attrs.some((a) => a[1] === 'table' && (a[0] === 'bool' || (a[0] === 'kv' && a[2] === '')))
    if (tableFlag && node.t === 'code' && !node.forceCode && (node.lang === 'csv' || node.lang === 'tsv')) {
      const rows = node.tableRows ?? delimitedRows(node.text, node.lang === 'csv' ? ',' : '\t')
      if (rows !== null) {
        const width = rows.reduce((width, row) => Math.max(width, row.length), 0)
        const headerAttr = attrs.findLast((a) => a[1] === 'header-rows' && (a[0] === 'kv' || a[0] === 'bool'))
        const footerAttr = attrs.findLast((a) => a[1] === 'footer-rows' && (a[0] === 'kv' || a[0] === 'bool'))
        const footerRows = delimitedRowCount(footerAttr?.[0] === 'bool' ? '' : footerAttr?.[2]) ?? 0
        const headerRows = node.tableHeaderRows ?? delimitedRowCount(headerAttr?.[0] === 'bool' ? '' : headerAttr?.[2])
          ?? Math.min(1, Math.max(0, rows.length - footerRows))
        node = {
          t: 'table', sourceFormat: node.lang, caption: node.caption,
          rows: rows.map((row, index) => ({
            cells: Array.from({ length: width }, (_, column) => ({
              content: row[column] ?? '', header: index < headerRows, literal: true,
              align: null, valign: null, attrs: null,
            })),
          })),
        }
        for (const list of pending) {
          for (let at = list.length - 1; at >= 0; at--) {
            const attr = list[at]
            if (attr[1] === 'table' && (attr[0] === 'bool' || (attr[0] === 'kv' && attr[2] === ''))) list.splice(at, 1)
          }
        }
      }
    }
    if (node.forceCode) delete node.forceCode
    blocks.push(flushAttrs(node))
  }

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
      if (CAPTION.test(lines[k])) break // item 4: no repeated marker
      if (ind(k).rest.startsWith('%%')) break // §10 I5
      if (peekInterrupts(k)) break // §10 I1/I4/I5
      if (inItem && matchMarkerAt(ind(k))) break // §10 I2, as for a paragraph
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
    const line = trimLineEnd(lines[i])
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
    // PART 10 I2: the source spelling closes a standalone code include line.
    // Resolution changes its block, never the boundary before a caption.
    const codeInclude = standaloneCodeInclude(line)
    if (codeInclude) {
      const { directive, lang } = codeInclude
      const file = state.includeFiles instanceof Map
        ? state.includeFiles.get(directive.path)
        : state.includeFiles?.[directive.path]
      const options = new Map(directive.options)
      const attrs = pending.flat()
      const tableFlag = attrs.some(a => a[1] === 'table' && (a[0] === 'bool' || (a[0] === 'kv' && a[2] === '')))
      const tableInclude = tableFlag && (lang === 'csv' || lang === 'tsv')
      const range = options.has('rows') ? includeRange(options.get('rows')) : null
      const linesRange = options.has('lines') ? includeRange(options.get('lines')) : null
      const selections = Number(Boolean(directive.section)) + Number(options.has('rows'))
        + Number(options.has('lines')) + Number(options.has('region'))
      const invalid = selections > 1 || (options.has('rows') && (!tableInclude || !range))
        || (options.has('cols') && !tableInclude)
        || (options.has('lines') && !linesRange)
        || (options.has('shift') && options.get('shift') !== 'auto' && !/^[+-]?\d+$/.test(options.get('shift') ?? ''))
        || directive.options.length !== options.size
        || [...options.keys()].some(key => !['code', 'rows', 'cols', 'lines', 'region', 'shift'].includes(key))
      if (typeof file === 'string' && !directive.section && !invalid) {
        const content = file.replace(/^\uFEFF/, '').replace(/\r\n?|\n/g, '\n')
        const physicalLines = content === '' ? [] : content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n')
        const regionRange = options.has('region') ? includeRegion(physicalLines, options.get('region')) : undefined
        const selectedLines = linesRange
          ? physicalLines.slice(Number(linesRange[0] - 1n), Number(linesRange[1]))
          : regionRange ? physicalLines.slice(regionRange[0] - 1, regionRange[1]) : physicalLines
        const selectedText = linesRange || regionRange ? selectedLines.map(value => `${value}\n`).join('') : content
        const node = { t: 'code', lang, text: selectedText === '' ? '' : selectedText.endsWith('\n') ? selectedText : `${selectedText}\n` }
        let valid = (!linesRange || linesRange[0] <= BigInt(physicalLines.length)) && (!options.has('region') || regionRange !== null)
        if (tableInclude && valid) {
          const separator = lang === 'csv' ? ',' : '\t'
          const records = delimitedRecords(content, separator)
          const selectedRecords = linesRange || regionRange ? delimitedRecords(selectedText, separator) : records
          const headerAttr = attrs.findLast(a => a[1] === 'header-rows' && (a[0] === 'kv' || a[0] === 'bool'))
          const headerRows = delimitedRowCount(headerAttr?.[0] === 'bool' ? '' : headerAttr?.[2]) ?? 1
          const allRows = records?.map(record => record.cells) ?? null
          if (records && selectedRecords) {
            valid = valid && (!range || range[0] <= BigInt(records.length))
            if (linesRange && records.some(record =>
              record.line <= Number(linesRange[1]) && record.endLine >= Number(linesRange[0]) &&
              (record.line < Number(linesRange[0]) || record.endLine > Number(linesRange[1])))) node.forceCode = true
            const columns = includeColumns(options.get('cols'), directive.options.find(([key]) => key === 'cols')?.[2] ?? null, allRows, headerRows)
            valid = valid && columns !== false
            if (valid && !node.forceCode) {
              const body = records.filter((record, index) => index >= headerRows && (
                range ? BigInt(index + 1) >= range[0] && BigInt(index + 1) <= range[1]
                  : linesRange ? record.line >= Number(linesRange[0]) && record.line <= Number(linesRange[1])
                    : true
              )).map(record => record.cells)
              const header = allRows.slice(0, headerRows)
              const project = row => columns === null ? row : columns.map(column => row[column] ?? '')
              node.tableRows = [...header, ...(regionRange ? selectedRecords.map(record => record.cells) : body)].map(project)
              node.tableHeaderRows = header.length
            }
          } else if (options.has('rows') || options.has('cols')) {
            // Malformed delimited data retains the ordinary code fallback.
          }
        }
        i++
        if (valid) {
          const cap = captionSlot(i)
          if (cap) {
            node.caption = cap.text
            i = cap.next
          }
          push(node)
        }
        else push(top
          ? { t: 'includeLiteral', text: line.trim(), quotedPath: directive.quoted }
          : { t: 'para', lines: [line.trim()] })
      } else {
        i++
        push(top
          ? { t: 'includeLiteral', text: line.trim(), quotedPath: directive.quoted }
          : { t: 'para', lines: [line.trim()] })
      }
      continue
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
      const sourceDefCol = ind(i).L?.col ?? ind(i).col
      const bodyLines = [m[2]]
      const inheritedFenceOpens = new Set()
      const defLine = i
      i++
      if (CONT_MARKER.test(m[2]) && i < n && !isBlank(lines[i]) &&
          !matchMarkerAt(ind(i)) && attachesFlushLeft(ind(i), sourceDefCol)) {
        const attached = takeOneBlock(lines, i, state, ind(i), sourceDefCol)
        // An attached paragraph ends at an opener that reaches the body column: that line is the body's.
        let next = attached.next
        if (foldablePlainLine(ind(i).rest)) {
          for (let k = i + 1; k < next; k++) {
            const measured = ind(k)
            if ((measured.L?.col ?? measured.col) >= sourceDefCol + FOOTNOTE_BODY_COLUMN && startsParagraphBlock(measured.rest, false)) {
              next = k
              break
            }
          }
        }
        bodyLines[0] = ''
        // A follower the frame pass framed LAZY stands at the note's reader
        // column; the body reads it from column 0 like every other body line.
        const taken = lines.slice(i, next).map(stripLazyLead)
        bodyLines.push(...taken)
        if (!leavesFenceOpen(taken)) bodyLines.push('')
        i = next
      }
      // `pullPending` is set by a `+` marker: the NEXT flush-left line begins a
      // pulled-in block (SS17 L4). It is a distinct signal from an empty body
      // line, so an empty note (`[^a]:`) never swallows the following block.
      let pullPending = false
      let afterComment = false
      let commentScanFrom = 0
      let retainedParagraph = false
      let lazyParagraphOpen = null
      let openFence = -1
      const endsNoteAt = (at) => (ind(at)?.col === 0 && FOOTNOTE_DEF.test(ind(at).rest)) ||
        (isBlank(lines[at]) && footnoteBlankRunEnd(lines, at, n) === -1)
      // Lazy lines open no fence and only shorten the closer search, so a
      // "no open fence" answer holds until a non-lazy line joins the body.
      let fenceKnownShut = 0
      let fenceSeen = false
      const noteOpenFence = (at) => {
        for (; fenceKnownShut < bodyLines.length; fenceKnownShut++) {
          const l = bodyLines[fenceKnownShut]
          if (l.startsWith(LAZY)) continue
          if (FENCE.test(l)) fenceSeen = true
          if (fenceSeen) break
        }
        if (fenceKnownShut === bodyLines.length) return -1
        const k = descriptionOpenFenceAt(bodyLines, lines, at, FOOTNOTE_BODY_COLUMN, endsNoteAt)
        if (k === -1) fenceKnownShut = bodyLines.length
        return k
      }
      // Indented continuation: the line's leading run must reach COLUMN 2
      // (PART 9 SS24 C1 column arithmetic), not two literal space characters.
      // A tab from column 0 already reaches column 4, so a bare tab or a
      // space-then-tab both satisfy the floor; a single space (column 1) does
      // not. A blank RUN of any length is allowed between continuation lines.
      while (i < n) {
        const measured = ind(i)
        if (measured.col === 0 && FOOTNOTE_DEF.test(measured.rest)) break
        // A marker short of the note body floor returns to a surviving item
        // or description owner, where it opens a list instead of extending
        // the note's paragraph.
        if ((inItem || descriptionOwnerColumn !== null) &&
            measured.col < FOOTNOTE_BODY_COLUMN && matchMarkerAt(measured)) break
        if (CONT_MARKER.test(m[2]) && bodyLines.length === 1 &&
            measured.col === 0 && matchMarkerAt(measured)) break
        if (isBlank(lines[i])) afterComment = false
        if (measured.col >= FOOTNOTE_BODY_COLUMN || isBlank(lines[i])) {
          retainedParagraph = false
          lazyParagraphOpen = null
        }
        if (isFootnoteContinuationLine(lines[i])) {
          afterComment = afterCommentTransition(false, {})
          const content = dedent(lines[i], FOOTNOTE_BODY_COLUMN)
          // An ancestor already answered §10 I4 for this line (CARVE-P0-014).
          if (state.fenceOpensAt?.get(lines)?.has(i)) inheritedFenceOpens.add(bodyLines.length)
          bodyLines.push(content)
          // The body reader can rebase this line before recognizing its block.
          // Check the claim only when a below-column follower asks for it.
          lazyParagraphOpen = null
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
          for (let k = i; k < end; k++) bodyLines.push(dedent(lines[k], FOOTNOTE_BODY_COLUMN))
          lazyParagraphOpen = false
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
          if (!attachesFlushLeft(ind(i), sourceDefCol)) break
          bodyLines.push('')
          lazyParagraphOpen = false
          pullPending = true
        } else if (pullPending && !isBlank(lines[i] ?? '')) {
          // the whole flush-left block pulled in by the preceding `+` marker
          const end = attachedBlockEnd(lines, i, state, attachmentBoundary(lines), ind(i), sourceDefCol)
          for (let k = i; k < end; k++) bodyLines.push(lines[k])
          lazyParagraphOpen = null
          pullPending = false
          i = end
        } else if (COMMENT_LINE.test(lines[i] ?? '') && bodyHoldsOpenCommentSpan(commentTailSince(bodyLines, commentScanFrom))) {
          // carve#2488, the same arm the `dd` carries. This body ends at a
          // comment below column 2, and a comment INSIDE a span the body already
          // holds is not one - see `bodyHoldsOpenCommentSpan`. carve#2488 reads
          // this host as already hiding the payload: it does at a delimiter
          // REACHING column 2, and it did not at column 0 or 1, which is the
          // band this covers.
          bodyLines.push(keptCommentDelimiter(lines[i]))
          lazyParagraphOpen = false
          pullPending = false
          i++
        } else if (measured.col < FOOTNOTE_BODY_COLUMN && COMMENT_LINE.test(measured.rest)) {
          // Rule A: a comment is an ordinary line, so below the body column it ends the body.
          break
        } else if (afterComment &&
            !startsVisibleBlock(lines[i]) && !isTableRow(lines[i]) &&
            !isColonBlockOpener(lines[i]) && !opensFence(lines, i)) {
          // A retained marker is paragraph text and opens no list (PART 0 X1).
          bodyLines.push(BULLET.test(trimLineEnd(measured.rest)) || isOrderedMarkerLine(measured.rest) ? lazyFrame(measured.rest) : measured.rest)
          afterComment = afterCommentTransition(afterComment, {})
          lazyParagraphOpen = true
          retainedParagraph = true
          i++
        } else if (!isBlank(lines[i]) && measured.col < FOOTNOTE_BODY_COLUMN &&
            (openFence = noteOpenFence(i)) !== -1) {
          // Rule A: a payload line below the body column ends the fence and the body.
          break
        } else if (!isBlank(lines[i]) && measured.col < FOOTNOTE_BODY_COLUMN &&
            (lazyParagraphOpen ??= paragraphOpenSince(bodyLines, commentScanFrom)) &&
            !startsVisibleBlock(lines[i]) && !isTableRow(lines[i]) &&
            !isColonBlockOpener(lines[i]) && !COLON_CLOSER.test(lines[i]) &&
            !opensFence(lines, i) &&
            !(measured.col === 0 && commentFenceOpensSpan(lines, i)) &&
            !(measured.col === 0 && (isDefinitionOrAttributeLine(measured.rest) ||
              tryAttrLine(lines, i)))) {
          bodyLines.push(lazyFrame(measured.rest))
          lazyParagraphOpen = true
          i++
        } else break
      }
      // PART 0 S2: a blank run reaches the body, so it is payload of a fence the
      // body leaves open. A block a `+` attached is bounded by §17, not by the run.
      if (i < n && isBlank(lines[i]) && reachedBefore(lines, i, defLine, isFootnoteContinuationLine)) {
        const end = markerBodyPolicy(FOOTNOTE_BODY_COLUMN).blankRunEnd(lines, i, n)
        for (let k = i; k < end; k++) bodyLines.push(dedent(lines[k], FOOTNOTE_BODY_COLUMN))
      }
      if (openFence !== -1) inheritedFenceOpens.add(openFence)
      if (inheritedFenceOpens.size) (state.fenceOpensAt ??= new WeakMap()).set(bodyLines, inheritedFenceOpens)
      const key = labelKey(label)
      if (!state.footnoteDefs.has(key)) {
        // FIRST definition wins (PART 9R state)
        // A `holdsAnInvisibleBlock` flag used to be set here, so that a body
        // whose only content was a comment could be told apart from an empty
        // one and spelled with an extra line. CARVE-P9-077 says the two ARE the
        // same body: neither reaches the reader, so nothing distinguishes them
        // downstream and the renderer needs no answer carried from the source.
        state.footnoteDefs.set(key, parseBlocks(inheritFinalBreak(lines, bodyLines, i, state), state, false))
      } else {
        // A losing note is invisible, so definitions in its body must still register.
        const losingBody = bodyLines.map(stripIndent)
        parseBlocks(inheritFinalBreak(lines, losingBody, i, state), state, false)
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
    const def = matchLinkDef(line)
    if (def) {
      // LAST definition wins (PART 9R state)
      state.linkDefs.set(labelKey(def.label), {
        rawLabel: def.label,
        url: def.url,
        title: def.title,
        // Raw list, not a rendered string: R1 merges it with the link site's
        // own attributes per SS15 A3, which needs both lists (carve#604).
        attrs: def.attrs,
      })
      i++
      continue
    }

    // --- headings ---
    if ((m = HEADING.exec(line))) {
      const level = m[1].length
      i++
      // SINGLE-LINE HEADINGS (PART 2): a heading ends at the newline. Nothing
      // folds into it, so whatever follows simply begins its own block - which
      // is why this is a plain read rather than a loop with a boundary test.
      push({ t: 'heading', level, text: headingText(m[2]) })
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
      const boundary = state.attachmentBoundaries?.get(lines)?.find(index => index > i) ?? n
      const fenceLines = boundary < n ? lines.slice(0, boundary) : lines
      const run = m[1]
      const info = parseFenceInfo(m[2])
      if (info && info.lang.startsWith('=')) {
        const close = findCloser(fenceLines, i, run)
        if (close !== -1) {
          markMeasuredOpaque(state, lines, i, close + 1)
          push({
            t: 'raw',
            format: info.lang.slice(1),
            text: rawPayload(lines.slice(i + 1, close)),
          })
          i = close + 1
          continue
        }
      }
      const close = info ? findCloser(fenceLines, i, run) : -1
      if (close !== -1) {
        markMeasuredOpaque(state, lines, i, close + 1)
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
        markMeasuredOpaque(state, lines, i, boundary)
        if (info.lang.startsWith('=')) {
          push({
            t: 'raw',
            format: info.lang.slice(1),
            text: rawPayload(fenceLines.slice(i + 1), !(boundary === n && state.unterminatedLines?.has(lines))),
          })
          i = boundary
          continue
        }
        push({
          t: 'code',
          lang: info.lang,
          title: info.title,
          text: fenceLines.slice(i + 1).map(stripLazy).join('\n') +
            (fenceLines.length > i + 1 && !(boundary === n && state.unterminatedLines?.has(lines)) ? '\n' : ''),
        })
        i = boundary
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
      let sourceTermCol = sourceColumns?.[i] ?? ind(i).L?.col ?? ind(i).col
      // A plain line that folds (as a lazy continuation) into an open term or
      // the open paragraph of a definition (SS17): not blank, not a visible
      // block, not a definition/list/fence/caption opener.
      const foldablePlain = (cur) =>
        !isBlank(cur) &&
        !startsVisibleBlock(cur) &&
        !isLinkDef(cur) &&
        !FOOTNOTE_DEF.test(cur) &&
        !BULLET.test(trimLineEnd(cur)) &&
        !isOrderedMarkerLine(cur) &&
        !isCodeBlockOpener(cur) &&
        !CAPTION.test(cur)
      const isEntry = (s) => /^::?[ ](?=[ \t]*[^ \t\n\r])/.test(s) && !/^:::/.test(s)
      // A line folded into an open item below its content column arrives
      // LAZY-framed. Its authored column still decides whether `:  def`
      // reaches the term's column; a separator below it remains term text.
      // Strip the frame only when testing an entry that reaches that column.
      const unlazy = (s) => (s.startsWith(LAZY) ? s.slice(LAZY.length) : s)
      while (i < n) {
        const cur0 = unlazy(lines[i] ?? '')
        let dm
        if ((dm = /^:: (?=[ \t]*[^ \t\n\r])(.*)$/.exec(cur0))) {
          sourceTermCol = sourceColumns?.[i] ?? ind(i).L?.col ?? ind(i).col
          // term (dt): folds plain wrapped continuation lines so a wrapped term
          // line does not strand its definition. (This used to say "like a
          // heading". A heading ends at its newline and folds nothing; the term
          // is the key half of a key-value entry, and keeps its fold.)
          let dt = trimWs(dm[1])
          i++
          while (i < n) {
            const cur = lines[i] ?? ''
            // A term has no content column, so no indentation ends it: a line
            // past the column folds whatever it would open (carve#2411).
            // A lone `+` is no marker here: a term holds no blocks for it to
            // attach, so it is a plain line and folds (CARVE-P2-028, carve#3145).
            if (isEntry(cur) && (!relativeTermColumns ||
                (sourceColumns?.[i] ?? ind(i).L?.col ?? ind(i).col) >= sourceTermCol) || isBlank(cur) || cur.startsWith(LAZY) &&
                /^: (?=[ \t]*[^ \t])/.test(unlazy(cur)) &&
                // A lazy line past a missed note lies below the term it folds into.
                (sourceColumns?.[i] ?? -1) >= sourceTermCol) break
            // A comment at the container's column ends the term. Past it the
            // comment stays a comment, fence body included, and the term goes
            // on (carve#2411). Inline content never reaches across it, so it
            // splits the term into runs rendered on their own.
            if (/^%%/.test(cur)) break
            if (/^[ \t]+%%/.test(cur)) {
              const fence = COMMENT_FENCE.exec(cur)
              if (fence && commentFenceCloserAhead(lines, i, fence[1])) {
                i++
                while (i < n) {
                  const close = COMMENT_FENCE.exec(lines[i] ?? '')
                  i++
                  if (close && close[1].length === fence[1].length) break
                }
              } else {
                i++
              }
              dt += '\n' + TERM_COMMENT
              continue
            }
            const sourceColumn = sourceColumns?.[i] ?? ind(i).L?.col ?? ind(i).col
            const pastColumnDefinition = sourceColumn > (descriptionOwnerColumn ?? sourceTermCol) &&
              (isLinkDef(indentCols(cur).rest) || FOOTNOTE_DEF.test(indentCols(cur).rest))
            if (!foldablePlain(cur) && !pastColumnDefinition && !/^: +[ \t]*$/.test(cur)) break
            if (isTableRow(cur) || colonFenceInterrupts(cur, [dt]) || (cur[0] === '{' && tryAttrLine(lines, i))) break
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
            const sourceIndent = sourceColumns && descriptionOwnerColumn !== null &&
              !cur.startsWith(LAZY) && sourceColumn > sourceTermCol
              ? Math.max(0, sourceColumn - sourceTermCol - indentCols(cc).col) : 0
            dt += '\n' + ' '.repeat(sourceIndent) + cc.replace(/[ \t]+$/, '')
            i++
          }
          node.items.push({ dt })
          continue
        }
        if ((dm = /^:( +)(?=[ \t]*[^ \t])(.*)$/.exec(cur0))) {
          const sourceDescriptionCol = sourceColumns?.[i] ?? ind(i).L?.col ?? ind(i).col
          if (sourceDescriptionCol < sourceTermCol) break
          const bodyColumn = ind(i).col + 1 + dm[1].length
          // CARVE-P0-004: normalization can shift the line without shifting its owner.
          const sourceBodyColumn = sourceDescriptionCol + 1 + dm[1].length
          const descriptionStart = i
          const reachesBody = (at) => lines[at] !== undefined &&
            isDefinitionContinuationLine(lines[at], sourceBodyColumn, {
              col: sourceColumns?.[at] ?? ind(at).L?.col ?? ind(at).col, rest: ind(at).rest,
            })
          const blankRunEnds = new Map()
          const afterBlankRun = (at) => {
            if (blankRunEnds.has(at)) return blankRunEnds.get(at)
            const end = markerBodyPolicy(sourceBodyColumn, sourceDescriptionCol).blankRunEnd(lines, at, n)
            for (let row = at; row < end; row++) blankRunEnds.set(row, end)
            return end
          }
          const entryAtOwner = (at) => isEntry(lines[at] ?? '') && !reachesBody(at)
          // definition (dd): collect its full body, then parse it to blocks. A
          // definition body continues like a list item (SS17): lazy
          // continuations, a blank-separated indented paragraph, and a `+`
          // pull-left block (including the first-block `:  +` form) all fold
          // into the <dd>. Feeding the assembled lines to parseBlocks keeps a
          // single paragraph tight and yields a loose multi-block <dd> for the
          // rest -- matching the real output the corpus pins for all engines.
          // (`:  \+` stays a literal `+`, never a marker.)
          const bodyLines = []
          const bodySourceColumns = []
          let bodyHasFenceCandidate = false
          const measurement = state.opaqueMeasurement
          const parentOrigins = measurement?.origins.get(lines)
          const markerLead = matchMarkerAt(indentCols(dm[2])) && markerFenceSummary(dm[2], new Map())
          const bodyOrigins = parentOrigins === undefined || !markerLead ? undefined : []
          if (bodyOrigins) measurement.origins.set(bodyLines, bodyOrigins)
          // X2: lazy prose keeps the quote's claim until a block closes it.
          let quoteParagraphClaim = false
          let openBodyTermColumn = null
          let noteBodyReach = null
          let noteBodyQuoted = false
          const pushBody = (text, row = i) => {
            bodyLines.push(text)
            const source = ind(row)
            bodySourceColumns.push(sourceColumns?.[row] ?? source.L?.col ?? source.col)
            const raw = stripLazy(text)
            let quoted = stripIndent(raw)
            let quoteWidth = 0
            while (QUOTE.test(quoted)) {
              const prefix = QUOTE.exec(quoted)
              quoteWidth += quoted.length - (prefix[1] ?? '').length
              quoted = prefix[1] ?? ''
            }
            const quotedContent = indentCols(quoted)
            const sourceContentCol = source.col + quoteWidth + quotedContent.col
            const bodyLine = indentCols(raw)
            const quoteIsTermText = openBodyTermColumn !== null &&
              bodyLine.col > openBodyTermColumn
            if (!text.startsWith(LAZY) && FOOTNOTE_DEF.test(quotedContent.rest)) {
              noteBodyReach = (row === descriptionStart ? sourceBodyColumn : sourceContentCol) + FOOTNOTE_BODY_COLUMN
              noteBodyQuoted = quoteWidth > 0
              quoteParagraphClaim = false
            } else if (source.rest !== '' && noteBodyReach !== null &&
                (noteBodyQuoted ? sourceContentCol : source.col) < noteBodyReach) {
              noteBodyReach = null
              noteBodyQuoted = false
            }
            if (QUOTE.test(stripIndent(raw)) && noteBodyReach === null && !quoteIsTermText) quoteParagraphClaim = bodyLeavesParagraphOpen(bodyLines)
            else if (isBlank(raw) || !text.startsWith(LAZY) &&
                (startsVisibleBlock(raw) || isDefinitionOrAttributeLine(raw))) quoteParagraphClaim = false
            // A quote folded into a term has no paragraph claim of its own.
            if (DEFLIST_TERM.test(bodyLine.rest)) {
              if (openBodyTermColumn === null || bodyLine.col <= openBodyTermColumn) openBodyTermColumn = bodyLine.col
            } else if (isBlank(raw) || matchMarkerAt(bodyLine) ||
                openBodyTermColumn !== null && bodyLine.col <= openBodyTermColumn &&
                (startsVisibleBlock(bodyLine.rest) || DEFLIST_SEPARATOR.test(bodyLine.rest) ||
                 isDefinitionOrAttributeLine(bodyLine.rest) || COMMENT_LINE.test(bodyLine.rest))) {
              openBodyTermColumn = null
            }
            // Rebasing can expose an indented fence. Keep the full scan for
            // any candidate, but skip it for bodies containing none.
            if (!bodyHasFenceCandidate && FENCE.test(stripIndent(text))) bodyHasFenceCandidate = true
            if (bodyOrigins) bodyOrigins.push(typeof parentOrigins === 'number' ? parentOrigins + row : parentOrigins[row])
          }
          // The fold question is asked of the body AS IT WILL BE READ (§10 I5,
          // carve#1911): a block opener past the body's column is rebased to
          // the body's own column 0 before the body is parsed, so asking the
          // authored lines reported an open paragraph the body does not have.
          i++
          // `pullPending` marks that a `+` marker (bare or the first-block `:  +`
          // form) opened a pulled-in block: the NEXT flush-left line begins it.
          // This is a distinct signal from an empty definition body, so an empty
          // `:  ` never swallows the following flush-left block.
          let pullPending = CONT_MARKER.test(trimWs(dm[2]))
          const nestedFirstBlock = markerCarriesContinuation(dm[2].trim(), new Map())
          if (!pullPending) {
            pushBody(stripIndent(dm[2]).replace(/[ \t]+$/, ''), i - 1)
          }
          const endsBodyAt = (at) => {
            const cur = lines[at] ?? ''
            return entryAtOwner(at) ||
              (isBlank(cur) && !reachesBody(afterBlankRun(at)))
          }
          let afterComment = false
          // Lines before the last comment this arm kept cannot hold a paragraph or a
          // span open, so the fold questions below read the tail only.
          let ddScanFrom = 0
          let retainedParagraph = false
          const sinceComment = () => commentTailSince(bodyLines, ddScanFrom)
          let openFence = -1
          const nestedLeadFenceUnterminated = descriptionLeadHasUnterminatedNestedFence(
            bodyLines[0] ?? '', lines, i, bodyColumn, endsBodyAt,
          )
          while (i < n) {
            const cur = lines[i] ?? ''
            if (reachesBody(i) || isBlank(cur)) retainedParagraph = false
            if (nestedLeadFenceUnterminated) {
              if (endsBodyAt(i)) break
              const measured = indentCols(cur)
              if (measured.rest !== '' && measured.col < bodyColumn) break
              pushBody(dedentMeasured(measured, cur, bodyColumn).text)
              i++
              continue
            }
            if (entryAtOwner(i)) break
            const followerColumn = sourceColumns?.[i] ?? ind(i).L?.col ?? ind(i).col
            if (nestedFirstBlock && bodyLines.length === 1 &&
                followerColumn < sourceBodyColumn &&
                !isBlank(cur)) break
            if (isBlank(cur)) {
              afterComment = false
              // The whole blank run belongs to a continuation at the body column.
              if (reachesBody(afterBlankRun(i))) { pushBody(dedent(cur, bodyColumn)); i++; continue }
              // PART 0 S2, as for a footnote body.
              if (reachedBefore(lines, i, descriptionStart, (_, at) => reachesBody(at))) {
                for (let k = i; k < afterBlankRun(i); k++) pushBody(dedent(lines[k], bodyColumn), k)
              }
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
              // A nested description was rebased to column zero. Its marker
              // and follower still meet at their authored column (carve#3482).
              if ((sourceColumns?.[i] ?? ind(i).L?.col ?? ind(i).col) !== sourceDescriptionCol) break
              pushBody('')
              pullPending = true
              continue
            }
            if (reachesBody(i)) {
              afterComment = afterCommentTransition(false, {})
              // indented continuation block, dedented by the content margin.
              // `dedent` carries a tab that STRADDLES the margin back as the
              // spaces it bought past column 3, so `<TAB>x` (column 4) arrives
              // one column in, exactly as ` x` after three spaces would.
              pushBody(dedent(cur, bodyColumn))
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
              // The first-block form takes one non-list block. A list at the
              // description's marker column begins after the empty <dd>.
              // A separate `+` after content attaches a list (§17 L3).
              if (bodyLines.length === 0 && matchMarkerAt(ind(i))) break
              const sourceColumn = sourceColumns?.[i] ?? ind(i).L?.col ?? ind(i).col
              const end = attachedBlockEnd(lines, i, state, attachmentBoundary(lines), { col: sourceColumn }, sourceDescriptionCol)
              for (let k = i; k < end; k++) pushBody(lines[k], k)
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
            // A block closed inside a nested description, item or marked quote
            // leaves no paragraph for a column-zero continuation (CARVE-P0-011).
            // An unmarked quote follower stays paragraph text under X2.
            if (authoredCol === 0 && bodyLines.length > 1) {
              const lead = bodyLines[0]
              const lastLine = indentCols(bodyLines.at(-1))
              const nestedDefinition = DEFLIST_TERM.test(lead)
                ? /^:( +)/.exec(bodyLines.find((line) => /^: +/.test(line)) ?? '')
                : null
              const nestedDescriptionClosed = DEFLIST_TERM.test(lead) &&
                nestedDefinition && lastLine.col >= 1 + nestedDefinition[1].length &&
                (HEADING.test(lastLine.rest) || HR.test(lastLine.rest) ||
                  isTableRow(lastLine.rest) || isDefinitionOrAttributeLine(lastLine.rest))
              const nestedItemClosed = matchMarkerAt(indentCols(lead)) &&
                lastLine.col >= matchMarkerAt(indentCols(lead)).markerWidth &&
                isDefinitionOrAttributeLine(lastLine.rest)
              const quotedLead = QUOTE.exec(lead)?.[1] ?? null
              const quotedLast = QUOTE.exec(lastLine.rest)?.[1] ?? null
              const quotedLeadItem = quotedLead === null ? null : matchMarkerAt(indentCols(quotedLead))
              const nestedQuoteClosed = quotedLast !== null &&
                ((quotedLead !== null && FOOTNOTE_DEF.test(quotedLead) &&
                  indentCols(quotedLast).col >= FOOTNOTE_BODY_COLUMN) ||
                 (quotedLeadItem && indentCols(quotedLast).col >= quotedLeadItem.markerWidth &&
                  isDefinitionOrAttributeLine(indentCols(quotedLast).rest)))
              if (nestedDescriptionClosed || nestedItemClosed || nestedQuoteClosed) break
            }
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
            // The item owns an attribute below the description body column;
            // it ends the paragraph there and cannot fold into the description.
            if (inItem && authoredCol > 0 && tryAttrLine([dedented], 0)) break
            if (authoredCol === 0 && (isDefinitionOrAttributeLine(dedented) || !!tryAttrLine(lines, i))) break
            // CARVE-P9-083: a surviving description can own a marker below this nested body.
            if ((inItem || descriptionOwnerColumn !== null &&
                (sourceColumns?.[i] ?? ind(i).L?.col ?? ind(i).col) >= descriptionOwnerColumn) &&
                !reachesBody(i) &&
                matchMarkerAt(indentCols(dedented)) &&
                !quoteParagraphClaim) break
            if (COMMENT_LINE.test(dedented) && !bodyHoldsOpenCommentSpan(sinceComment())) {
              openFence = bodyHasFenceCandidate
                ? descriptionOpenFenceAt(bodyLines, lines, i, bodyColumn, endsBodyAt)
                : -1
              if (openFence !== -1) break
            }
            // carve#2488: a comment inside a span this body already holds is not
            // "a comment below the column" - see `bodyHoldsOpenCommentSpan`.
            if (COMMENT_LINE.test(dedented) && bodyHoldsOpenCommentSpan(sinceComment())) {
              pushBody(keptCommentDelimiter(cur))
              i++
              continue
            }
            // Rule A: a comment is an ordinary line, so below the body column it ends the body.
            if (classifyLayoutComment(lines, i) !== null) break
            if (afterComment && !startsVisibleBlock(cur) &&
                !isTableRow(cur) && !isColonBlockOpener(cur) &&
                !opensFence(lines, i)) {
              pushBody(BULLET.test(trimLineEnd(dedented)) || isOrderedMarkerLine(dedented) ? lazyFrame(dedented) : dedented)
              afterComment = afterCommentTransition(afterComment, {})
              retainedParagraph = true
              i++
              continue
            }
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
            // Below the body's column an opener folds into the open paragraph
            // (PART 0 O3, CARVE-P0-021); in an item it opens there unless a quote holds the band (X2).
            const lastBlock = stripIndent([...bodyLines].reverse().find((l) => !l.startsWith(LAZY)) ?? '')
            if (authoredCol > 0 && authoredCol < bodyColumn && (!inItem || QUOTE.test(lastBlock)) &&
                descriptionOpenFenceAt(bodyLines, lines, i, bodyColumn, endsBodyAt) === -1 &&
                bodyLeavesParagraphOpen(bodyLines) &&
                (HEADING.test(dedented) || HR.test(dedented) || isTableRow(dedented) ||
                 QUOTE.test(dedented) || (QUOTE.test(lastBlock) && isCodeBlockOpener(dedented)))) {
              pushBody(lazyFrame(dedented))
              i++
              continue
            }
            openFence = descriptionOpenFenceAt(bodyLines, lines, i, bodyColumn, endsBodyAt)
            if (openFence !== -1) break
            if (authoredCol > 0 && bodyLeavesParagraphOpen(bodyLines) &&
                !startsVisibleBlock(dedented) &&
                (isLinkDef(dedented) || FOOTNOTE_DEF.test(dedented) ||
                 ABBR_DEF.test(dedented) || tryAttrLine([dedented], 0) !== null)) {
              pushBody(lazyFrame(dedented))
              i++
              continue
            }
            // §10 I4: a fence line interrupts only when a closer follows it, so
            // one without is paragraph text and folds - the item collector's
            // test, asked of the authored line the same way. It is framed LAZY,
            // as the item frames it, so the body's own parse cannot read it
            // back as a closer.
            /*
             * A COLON FENCE LINE ENDS THE BODY, IT DOES NOT FOLD (carve#2486).
             * The line is read as the body would read it, dedented to the body's
             * column 0 (carve#1772's rule for this collector), and at that
             * column a valid `:::` opener or closer is a BLOCK: §10 I4's colon
             * half makes an opener an interrupter, and a closer belongs to a
             * container this body does not hold. Either way S4's lazy branch is
             * not reached, so the reach question falls to its otherwise and the
             * body ends - CARVE-P0-014's "the reach of a container is not
             * extended by what its innermost block happens to be".
             *
             * `foldablePlain` here tests neither, so a `:::` below the column
             * folded and the `dd` kept a column-zero run its list-item twin ends
             * at. Both collectors use the validated opener test so malformed
             * colon lines remain ordinary prose in the open paragraph.
             */
            if (isColonBlockOpener(dedented) || COLON_CLOSER.test(dedented)) break
            if (!top && authoredCol > 0 && isCodeBlockOpener(dedented)) break
            const lazyFence = !foldablePlain(dedented) && FENCE.test(dedented) &&
              !opensFence(lines, i)
            // A table row interrupts the paragraph (PART 9 §10 I1), so below
            // the body's column it ends the body rather than folding (carve#3145).
            if (isTableRow(dedented)) break
            if ((foldablePlain(dedented) || lazyFence || CAPTION.test(dedented) || BULLET.test(trimLineEnd(dedented)) || isOrderedMarkerLine(dedented)) && bodyLeavesParagraphOpen(bodyLines)) {
              // The marker is below the lead item's content column, so it
              // continues that paragraph even when the description dedents it.
              const leadItem = matchMarkerAt(indentCols(bodyLines[0] ?? ''))
              const belowLeadItem = leadItem && authoredCol > 0 && authoredCol < bodyColumn + leadItem.markerWidth &&
                matchMarkerAt(indentCols(dedented))
              pushBody(lazyFence || belowLeadItem || CAPTION.test(dedented) ? lazyFrame(dedented) : dedented)
              i++
              continue
            }
            break
          }
          if (bodyLines.length > 1 && markerCarriesContinuation(bodyLines[0], new Map())) {
            const firstMarker = matchMarkerAt(indentCols(bodyLines[0]))
            const firstContentColumn = sourceBodyColumn + (firstMarker?.markerWidth ?? 0)
            const follower = bodySourceColumns[1]
            if (follower > 0 && follower < firstContentColumn && bodyLines[1] !== '' &&
                !matchMarkerAt(indentCols(bodyLines[1]))) {
              bodyLines.splice(1, 0, '')
              bodySourceColumns.splice(1, 0, follower)
              if (follower > sourceBodyColumn) bodyLines[2] = lazyFrame(stripIndent(bodyLines[2]))
            }
          }
          // CARVE-P0-004: normalization must not make an inner body claim its outer owner's column.
          if (bodyLines.length === bodySourceColumns.length) {
            (state.descriptionSourceColumns ??= new WeakMap()).set(bodyLines, bodySourceColumns)
          }
          if (openFence !== -1) (state.fenceOpensAt ??= new WeakMap()).set(bodyLines, new Set([openFence]))
          node.items.push({ ddBlocks: bodyLines.length ? parseBlocks(inheritFinalBreak(lines, bodyLines, i, state), state, false, undefined, undefined, undefined, descriptionOwnerColumn ?? sourceBodyColumn) : [] })
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
          const boundary = state.attachmentBoundaries?.get(lines)?.find(index => index > i) ?? n
          const attachedOrigin = state.quoteAttachmentOrigins?.get(lines)?.get(boundary)
          const extent = attachedOrigin === undefined ? boundary : n
          const close = findColonCloser(lines.slice(0, extent), i, cf[1].length)
          const end = close === -1 ? extent : close
          const body = lines.slice(i + 1, end)
          markMeasuredContainerText(state, lines, i + 1, end, ind)
          i = close === -1 ? extent : close + 1
          inheritFinalBreak(lines, body, end, state)
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
            push({
              t: 'footnotes-placement',
              title: opener.title,
              label: opener.label,
              children: parseBlocks(body, state, false),
            })
          } else if (opener.type === 'toc') {
            throw new Refuse('::: toc directive')
          } else if (
            isFigureGroupOpener(opener) && !state.inFigureGroup
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
          const sr = splitRow('|' + l.slice(1), openRun, openRunAt)
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
          !afterDelimiterRow && node.rows.length === 1 && sr.cells.every((c) => DELIM_CELL.test(c)) &&
          !node.rows[0].rawCells.every((c) => DELIM_CELL.test(c))
        ) {
          node.rows[0].cells.forEach((c) => (c.header = true))
          node.rows[0].isHead = true
          node.rows[0].gfmHead = true
          sr.cells.forEach((seg, ci) => {
            // Equivalent to `trim()` here, and spelled `padTrim` for the same
            // reason as the span fallback above: every cell that reached this
            // loop matched DELIM_CELL, which admits only spaces, `:` and `-`.
            const s = padTrim(seg)
            const left = s.startsWith(':')
            const right = s.endsWith(':')
            const col = node.rows[0].cells[ci]
            // CARVE-P12-039: a head-row marker sets the column before delimiter colons.
            if (!col || col.align !== null) return
            if (left && right) col.align = 'center'
            else if (left) col.align = 'left'
            else if (right) col.align = 'right'
            col.delimiterAlign = col.align
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
      for (const row of node.rows) {
        if (row.cells.every((c) => c.header)) row.isHead = true
        else break
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
      const sourceQuoteCol = ind(i).L?.col ?? ind(i).col
      // The quote's own container ladder and the fence a container in it holds
      // open (carve#2538). `qHost.fence` replaces the run string this used to
      // carry, because the column it was written at is what answers.
      const qHost = hostLadder()
      let openComment = null // exact-width comment fence opened inside the quote
      let qOpenPara = false // does the quote currently end in an open paragraph?
      let qItemPara = false // and is that paragraph an item's?
      let qTermOpen = false
      let qDescriptionBodyCol = null
      let qNoteBodyCol = null
      let qPara = [] // its lines, for SS12's absorption test below
      const qColonRuns = []
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
      let qLastMarked = -1 // the last marked line collected, for the first-block test
      let hostedFirstBlockPending = false
      /*
       * The same run, one level down and per depth: a nested quote's own table
       * state. `opensParagraph` is handed ONE line and cannot see it, so the
       * outer tracker carries it here and hands it back in - which is what
       * lets `> > | a |` / `> > + b |` be read as the table it is rather than
       * as prose.
       */
      const qNestedTable = []
      /*
       * The verbatim payload a nested level has open, and whether that level
       * ends in an open paragraph, both per depth. `opensParagraph` reads one
       * line, so a fence run one level down is invisible to it: a fence opener
       * with no closer after it read as paragraph text, and the unmarked line
       * below kept a continuation claim PART 1 owner selection gives it none
       * (carve#2513).
       */
      // One ladder per depth, for the same reason the table run is per depth: a
      // fence a list item inside a NESTED quote holds open is written at that
      // item's content column, and CARVE-P0-013 names no depth (carve#2538).
      const qNestedHost = []
      let qHostedUntracked = []
      const qNestedPara = []
      const qNestedParaLines = []
      const qNestedColon = []
      /*
       * Does a pure closer for `run` follow, `markers` quote markers in?
       *
       * PART 9 SS10 I4 opens a fence at block start unconditionally and under a
       * paragraph only when a closer follows, and the tracker below asked
       * neither question - it read whether the PREVIOUS line was blank, which
       * is a third thing. The index is built once per depth by one pass over
       * the marked run, because a forward scan per opener is the rescan
       * carve#2509 ruled out.
       */
      const qPureFences = []
      const closerFollows = (idx, markers, run, column, past = false) => {
        // A level's container ends where a line stops supplying its marker, so
        // the index covers one RUN of lines that reach `markers` and is rebuilt
        // when a query lands past it: a pure fence in a LATER quote at the same
        // depth is not this one's closer.
        //
        // PER FENCE CHARACTER, each row carrying the WIDEST run still ahead of
        // it. Searching the rows instead made a body of `x`-tagged backtick
        // openers over a run of `~~~` lines quadratic: every opener walked every
        // row and matched none of them (raised by codex review).
        let st = qPureFences[markers]
        if (!st || idx >= st.end) {
          const chars = new Map()
          let j = idx
          for (; j < n; j++) {
            let text = lines[j]
            let k = 0
            // A nested quote's marker may stand at a hosted container's column.
            while (k < markers && QUOTE.test(k > 0 ? text.trimStart() : text)) {
              layoutWork.quoteStrips += 1
              text = QUOTE.exec(k > 0 ? text.trimStart() : text)[1] ?? ''
              k++
            }
            if (k < markers) break
            const measured = indentCols(text)
            const c = PURE_FENCE.exec(measured.rest)
            if (!c) continue
            // Index by column and character so each opener's lookahead is a
            // single bucket read, including openers past the host's column.
            const key = `${c[1][0]}${measured.col}`
            const rows = chars.get(key) ?? { at: [], cursor: 0 }
            rows.at.push({ j, width: c[1].length })
            chars.set(key, rows)
          }
          for (const rows of chars.values()) {
            let widest = 0
            for (let k = rows.at.length - 1; k >= 0; k--) {
              widest = Math.max(widest, rows.at[k].width)
              rows.at[k].widest = widest
              layoutWork.fenceCloserLookahead += 1
            }
          }
          layoutWork.fenceCloserLookahead += j - idx
          st = qPureFences[markers] = { chars, end: j }
        }
        // `past`: a closer at the column or any column past it.
        if (past) {
          for (const [key, rows] of st.chars) {
            if (key[0] === run[0] && Number(key.slice(1)) >= column && closerIn(rows, idx, run)) return true
          }
          return false
        }
        const rows = st.chars.get(`${run[0]}${column}`)
        if (!rows) return false
        return closerIn(rows, idx, run)
      }
      const closerIn = (rows, idx, run) => {
        // Queries arrive in line order, so the cursor only moves forward and its
        // total travel is the row count however many openers ask.
        while (rows.cursor < rows.at.length && rows.at[rows.cursor].j <= idx) {
          rows.cursor++
          layoutWork.fenceCloserLookahead += 1
        }
        layoutWork.fenceCloserLookahead += 1
        return rows.cursor < rows.at.length && rows.at[rows.cursor].widest >= run.length
      }
      /*
       * DOES THE NESTED QUOTE ON THIS LINE LEAVE A PARAGRAPH OPEN?
       *
       * Peels one marker per level, advancing that level's table run as it
       * goes, and asks `opensParagraph` about the innermost text with the run
       * as it stood BEFORE that text - a continuation row is a row relative to
       * what is above it, never to itself, which is the same order the outer
       * loop uses for its own rows.
       */
      const nestedQuoteOpensParagraph = (line, atStart, idx) => {
        const levelLines = []
        let text = line
        let depth = 0
        // A run this line does not reach has ENDED, so its state is not a run
        // any more. Keeping it let a later quote at the same depth inherit a
        // table that closed before it: `> > | a |` / `> # H` / `> > + b |`
        // opens a NEW inner quote whose first line is prose, and the stale run
        // read it as a continuation row and ended the quote.
        //
        // Every level on the path ends on what the innermost one ends on, so
        // the answer is stored at each of them: a fence written at one level is
        // at block start when the level below it left no paragraph open.
        const settle = (ans, reached) => {
          if (ans && reached > 0 && reached < qNestedPara.length && qNestedPara[reached - 1]) {
            const lazyLine = levelLines[reached - 1]
            for (let d = reached; d < qNestedPara.length; d++) levelLines[d] = lazyLine
            reached = qNestedPara.length
          }
          qNestedColon.length = reached
          qNestedTable.length = reached
          qNestedHost.length = reached
          qNestedPara.length = reached
          qNestedParaLines.length = reached
          for (let d = 0; d < reached; d++) {
            if (!ans || !qNestedPara[d]) qNestedParaLines[d] = []
            if (ans && levelLines[d] !== undefined) qNestedParaLines[d].push(levelLines[d])
            qNestedPara[d] = ans
          }
          return ans
        }
        if (atStart && qNestedTable.length === 0) {
          const summary = quotePrefixSummary(line, prefixMemo(state, lines, idx).quote)
          if (summary && markerQuoteText(summary.tail, prefixMemo(state, lines, idx).markerQuote ??= new Map()) === null && !isColonBlockOpener(summary.tail) && !(FENCE.test(summary.tail) && parseFenceInfo(FENCE.exec(summary.tail)[2]) !== null)) {
            const { depth, tail } = summary
            if (state.blockDepth + depth >= MAX_NESTING_DEPTH) {
              const remaining = MAX_NESTING_DEPTH - state.blockDepth
              if (depth > remaining) return true
              return tail.trim() !== ''
            }
            levelLines[depth - 1] = tail
            qNestedTable.length = depth
            qNestedHost.length = depth
            if (depth > 0) {
              qNestedTable[depth - 1] = tableRunStep(false, tail)
              // The innermost level is the only one holding anything but a
              // quote, so it is the only ladder this path advances - and it asks
              // the fence question too. The guard above sends a COLUMN-0 fence to
              // the loop below; one a container on this line holds open never
              // reaches it, so `> > - ``` ` answered differently from `> - ``` `
              // (its own depth-invariance row).
              const host = qNestedHost[depth - 1] ??= hostLadder()
              const { inner } = hostAdvance(host, tail, false)
              if (state.blockDepth + depth + (host.columns.length - 1) < MAX_NESTING_DEPTH && hostColonStep(host, inner, (width, floor) => quotedCommentCloser(idx, depth + 1, width, floor), true, [], MAX_NESTING_DEPTH - state.blockDepth - depth - (host.columns.length - 1), (run, column, past) => closerFollows(idx, depth + 1, run, column, past))) {
                qNestedTable[depth - 1] = false
                return settle(false, depth)
              }
              const opener = hostFenceOpener(host, inner)
              if (opener && state.blockDepth + depth + (host.columns.length - 1) < MAX_NESTING_DEPTH) {
                host.fence = { run: opener[1], column: inner.col, host: host.columns.at(-1) }
                qNestedTable[depth - 1] = false
                return settle(false, depth)
              }
            }
            return settle(!isColonBlockOpener(tail) && opensParagraph(tail, true, false, prefixMemo(state, lines, idx).paragraph), depth)
          }
        }
        while (QUOTE.test(text)) {
          // At the parser's depth limit the remaining line is literal text.
          // Inspecting markers below it both misclassifies that text and walks
          // an arbitrarily deep suffix for every enclosing quote.
          if (state.blockDepth + depth >= MAX_NESTING_DEPTH) return settle(text.trim() !== '', depth)
          text = QUOTE.exec(text)[1] ?? ''
          levelLines[depth] = text
          // S2: an open payload makes this level's line verbatim, so a marker
          // on it is literal and A FENCED BODY IS NOT A PARAGRAPH.
          const host = qNestedHost[depth] ??= hostLadder()
          if (hostFenceStep(host, text)) return settle(host.colons?.at(-1)?.mode === 'line-block', depth + 1)
          const before = qNestedTable[depth] ?? false
          qNestedTable[depth] = tableRunStep(before, text)
          const { inner, blockStart, popped } = hostAdvance(host, text, qNestedPara[depth] ?? false)
          if (host.kinds.at(-1) === 'description') qNestedPara[depth] = host.descriptionParagraph
          if (blockStart) qNestedParaLines[depth] = []
          const inLineBlock = host.colons?.at(-1)?.mode === 'line-block'
          if (state.blockDepth + depth + 1 + (host.columns.length - 1) < MAX_NESTING_DEPTH && hostColonStep(host, inner, (width, floor) => quotedCommentCloser(idx, depth + 2, width, floor), blockStart, qNestedParaLines[depth] ?? [], MAX_NESTING_DEPTH - state.blockDepth - depth - 1 - (host.columns.length - 1), (run, column, past) => closerFollows(idx, depth + 2, run, column, past))) {
            qNestedTable[depth] = false
            return settle(inLineBlock && host.colons?.at(-1)?.mode === 'line-block' && !isBlank(text), depth + 1)
          }
          const f = hostFenceOpener(host, inner)
          // SS25 FIRST: past the cap an opener DEGRADES to literal paragraph
          // text, so a fence recognized here would open a block the block reader
          // does not. The cap is the POST-STRIP one the branch below asks, moved
          // ahead of the fence rather than after it (raised by codex review).
          if (state.blockDepth + depth + 1 + (host.columns.length - 1) < MAX_NESTING_DEPTH && f) {
            host.fence = { run: f[1], column: inner.col, host: host.columns.at(-1) }
            qNestedTable[depth] = false
            return settle(false, depth + 1)
          }
          depth++
          if (QUOTE.test(inner.rest)) text = inner.rest
          if (!QUOTE.test(text)) {
            if (state.blockDepth + depth >= MAX_NESTING_DEPTH) return settle(text.trim() !== '', depth)
            if (hostedBlockAt(host, inner, popped) ||
                (hostedDefinitionAt(host, inner) && !FOOTNOTE_DEF.test(inner.rest))) return settle(false, depth)
            // A bare colon run closes the claim unless this level's own
            // paragraph absorbs it under CARVE-P9-016.
            const colon = COLON_FENCE.exec(text)
            const stack = qNestedColon[depth - 1] ??= []
            const closesColon = COLON_CLOSER.test(text) && stack.at(-1) === colon?.[1].length
            if (closesColon) stack.pop()
            const absorbedColon = !closesColon && qNestedPara[depth - 1] && COLON_CLOSER.test(text) &&
              !colonFenceInterrupts(text, qNestedParaLines[depth - 1] ?? [])
            if (colon && !closesColon && !absorbedColon && parseColonOpener(colon[2]) !== null) {
              stack.push(colon[1].length)
            }
            return settle(absorbedColon || (!COLON_CLOSER.test(text) &&
              !(atStart && isColonBlockOpener(text)) &&
              opensParagraph(text, atStart, before, prefixMemo(state, lines, idx).paragraph)), depth)
          }
        }
        return settle(opensParagraph(text), depth)
      }
      // Every nested level ends where a line stops reaching it, and a VERBATIM
      // line reaches none however it is spelled: a `> >` inside the outer
      // level's fenced body is literal bytes. Without this the ladder's state
      // outlived its quote and the first line of the NEXT nested quote was read
      // as the old one's fence payload.
      const clearNested = () => {
        qNestedTable.length = 0
        qNestedHost.length = 0
        qNestedPara.length = 0
        qNestedParaLines.length = 0
        qNestedColon.length = 0
      }
      let qCommentClosers
      const quotedCommentCloser = (idx, markers, width, floor) => {
        let indexed = qCommentClosers?.get(markers)
        if (!indexed || idx >= indexed.end) {
          const byWidth = new Map()
          const columns = []
          let j = idx + 1
          for (; j < n; j++) {
            let text = lines[j]
            let k = 0
            for (; k < markers; k++) {
              const quoted = QUOTE.exec(k > 0 ? text.trimStart() : text)
              if (!quoted) break
              text = quoted[1] ?? ''
            }
            if (k < markers) break
            columns.push(isBlank(text) || COMMENT_LINE.test(text) ? Infinity : indentCols(text).col)
            const comment = COMMENT_FENCE.exec(text)
            if (comment) {
              const run = comment[1].length
              let rows = byWidth.get(run)
              if (!rows) byWidth.set(run, rows = [])
              rows.push(j)
            }
          }
          let size = 1
          while (size < columns.length) size *= 2
          const minimums = new Array(size * 2).fill(Infinity)
          for (let k = 0; k < columns.length; k++) minimums[size + k] = columns[k]
          for (let k = size - 1; k > 0; k--) minimums[k] = Math.min(minimums[k * 2], minimums[k * 2 + 1])
          indexed = { end: j, byWidth, columnStart: idx + 1, size, minimums }
          qCommentClosers ??= new Map()
          qCommentClosers.set(markers, indexed)
        }
        const rows = indexed.byWidth.get(width)
        if (!rows) return false
        let low = 0, high = rows.length
        while (low < high) {
          const middle = (low + high) >>> 1
          if (rows[middle] <= idx) low = middle + 1
          else high = middle
        }
        if (low >= rows.length) return false
        if (floor === undefined) return true
        let left = indexed.size + idx + 1 - indexed.columnStart
        let right = indexed.size + rows[low] - indexed.columnStart
        let minimum = Infinity
        while (left < right) {
          if (left % 2) minimum = Math.min(minimum, indexed.minimums[left++])
          if (right % 2) minimum = Math.min(minimum, indexed.minimums[--right])
          left = Math.floor(left / 2)
          right = Math.floor(right / 2)
        }
        return minimum >= floor
      }
      const trackFence = (l, idx) => {
        const sourceLine = indentCols(l)
        if (DEFLIST_TERM.test(sourceLine.rest) && sourceLine.col === 0) qDescriptionBodyCol = null
        const description = /^:( +)(?=[ \t]*[^ \t])/.exec(sourceLine.rest)
        if (sourceLine.col === 0 && sourceLine.rest !== '' && !description &&
            !DEFLIST_TERM.test(sourceLine.rest)) qDescriptionBodyCol = null
        if (description && sourceLine.col === 0 && qHost.descriptionTerm) qDescriptionBodyCol = 1 + description[1].length
        if (qNoteBodyCol !== null && sourceLine.rest !== '' && sourceLine.col < qNoteBodyCol) qNoteBodyCol = null
        if (qDescriptionBodyCol !== null && sourceLine.col >= qDescriptionBodyCol &&
            FOOTNOTE_DEF.test(sourceLine.rest)) qNoteBodyCol = sourceLine.col + FOOTNOTE_BODY_COLUMN
        // The quote body is literal beyond the same limit used by parseBlocks.
        // Its apparent headings, fences, and tables cannot end a paragraph.
        if (state.blockDepth >= MAX_NESTING_DEPTH) {
          qOpenPara = !isBlank(l)
          qTableOpen = false
          clearNested()
          qPara = qOpenPara ? [l] : []
          qItemPara = false
          return
        }
        if (openComment !== null) {
          const c = COMMENT_FENCE_BODY.exec(l)
          if (c && c[1].length === openComment) openComment = null
          qOpenPara = false
          qTermOpen = false
          qTableOpen = false
          clearNested()
          qPara = []
          qItemPara = false
          return
        }
        // A HOST THAT ENDED ENDS ITS FENCE, and the line is then classified
        // normally: `> - a` / `>` / `>   ``` ` / `>   x` / `> after` leaves the
        // item at `after`, so the quote's own paragraph opens there and stores
        // the claim again (carve#2538). Only a closer used to clear this, so the
        // ordinary line read as payload.
        if (hostFenceStep(qHost, l)) {
          qOpenPara = qHost.colons?.at(-1)?.mode === 'line-block'
          qTermOpen = false
          qTableOpen = false
          clearNested()
          qPara = []
          qItemPara = false
          return
        }
        const comment = COMMENT_FENCE_BODY.exec(l)
        if (comment && qHost.colons?.at(-1)?.mode !== 'line-block') {
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
        const belowRun = FENCE.exec(indentCols(l).rest)
        const belowFenceLazy = !!(belowRun && parseFenceInfo(belowRun[2]) === null)
        const { meas, inner: inner0, blockStart, popped } = hostAdvance(qHost, l, qOpenPara, belowFenceLazy)
        if (qHost.kinds.at(-1) === 'description') qOpenPara = qHost.descriptionParagraph
        if (blockStart) qPara = []
        const inLineBlock = qHost.colons?.at(-1)?.mode === 'line-block'
        if (state.blockDepth + (qHost.columns.length - 1) < MAX_NESTING_DEPTH && hostColonStep(qHost, inner0, (width, floor) => openComment === null && quotedCommentCloser(idx, 1, width, floor), blockStart, qPara, MAX_NESTING_DEPTH - state.blockDepth - (qHost.columns.length - 1), (run, column, past) => closerFollows(idx, 1, run, column, past))) {
          // Inline payload keeps the stanza open whatever block shape it has
          // (carve-php#3237). The opener itself contains no payload yet.
          qOpenPara = inLineBlock && qHost.colons?.at(-1)?.mode === 'line-block' && !isBlank(l)
          qTermOpen = false
          qTableOpen = false
          clearNested()
          qPara = qOpenPara ? [l] : []
          qItemPara = false
          return
        }
        const f = hostFenceOpener(qHost, inner0)
        // SS10 I4's own two questions, asked of the quote's own paragraph state.
        // This read whether the PREVIOUS line was blank, which admits neither a
        // fence under a heading, a break, a table or a closed fence - all block
        // starts - nor one under a paragraph with a closer below it. So a fence
        // that opened for the block reader stayed prose for this tracker, and
        // the unmarked line below it folded (carve#2513).
        // A CONTAINER THIS LINE OPENED PUTS THE FENCE AT ITS BLOCK START, so I4
        // asks for no closer there: `> - a` / `> - ``` ` opens the second item's
        // fence, where the quote's own paragraph state is the FIRST item's and
        // says nothing about it (carve#2538).
        // SS25 counts the HOST's containers too: at the cap the block reader
        // degrades the opener to literal text, so a fence recognized here would
        // open a block it does not (raised by codex review).
        const isOpener = !!(f &&
          state.blockDepth + (qHost.columns.length - 1) < MAX_NESTING_DEPTH)
        if (isOpener) qHost.fence = { run: f[1], column: inner0.col, host: qHost.columns.at(-1) }
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
        // `:::` under a paragraph that already holds an INVALID colon opener is
        // swallowed as paragraph text and the paragraph stays open
        // (CARVE-P9-016). That is the same predicate the block reader uses,
        // applied to the STRIPPED line and to the quote's own paragraph -
        // spelling it a second way here is how the two answers would drift.
        const absorbedColon = qOpenPara && COLON_CLOSER.test(l) &&
          !colonFenceInterrupts(l, qPara)
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
        if (!QUOTE.test(l) && !QUOTE.test(inner0.rest)) {
          const continuesNested = qOpenPara && !isOpener && !COLON_CLOSER.test(l) &&
            opensParagraph(l, false, qTableOpen)
          if (continuesNested) {
            for (const para of qNestedParaLines) para?.push(l)
          } else clearNested()
        }
        const hostedQuote = inner0.col === qHost.columns.at(-1) ? QUOTE.exec(inner0.rest) : null
        const hostedQuoteNeedsTracking = hostedQuote && (
          qNestedHost.some(host => host?.fence) ||
          isDefinitionOrAttributeLine((hostedQuote[1] ?? '').trimStart()) ||
          !opensParagraph(inner0.rest, true, false, prefixMemo(state, lines, idx).paragraph) ||
          (qHost.columns.length > 1 && hostsIndentedContent(hostedQuote[1] ?? '')))
        // Tracking starts late for a hosted quote, so seed its ladder from the
        // lines it skipped: a definition's column is read against them.
        if (hostedQuoteNeedsTracking && !QUOTE.test(l) && qNestedHost.length === 0) {
          qHostedUntracked.forEach(([text, at], k) => nestedQuoteOpensParagraph(text, k === 0, at))
        }
        if (hostedQuote && !hostedQuoteNeedsTracking && !QUOTE.test(l)) qHostedUntracked.push([inner0.rest, idx])
        else qHostedUntracked = []
        const nestedQuoteText = QUOTE.test(l) ? l : hostedQuoteNeedsTracking ? inner0.rest : null
        const nestedQuoteEnds = nestedQuoteText !== null && !nestedQuoteOpensParagraph(nestedQuoteText, blockStart || !qOpenPara, idx)
        const nestedItemEnds = !qOpenPara && !!matchMarkerAt(meas) &&
          !opensParagraph(l, true, false, prefixMemo(state, lines, idx).paragraph)
        const hostedBlock = hostedBlockAt(qHost, inner0, popped)
        // An item line under an item's paragraph starts the next item, so a
        // comment or attribute item closes that paragraph (corpus 610, carve#3268).
        // Only an item line is read, so a deep quote costs nothing extra per line.
        const itemContent = QUOTE.test(l) ? undefined : BULLET.exec(l)?.[6] ?? ORDERED.exec(l)?.[6]
        const itemClosesPara = qOpenPara && qItemPara && itemContent !== undefined &&
          leavesParagraphOpen([itemContent], 0, false) === false
        const quotedAttribute = l[0] === '{' && tryAttrLine(new Proxy([], {
          get(_, key) {
            if (key === 'length') return n - idx
            if (typeof key !== 'string' || !/^\d+$/.test(key)) return undefined
            const offset = Number(key)
            return offset === 0 ? l : QUOTE.exec(lines[idx + offset] ?? '')?.[1] ?? ''
          },
        }), 0) !== null
        if (!absorbedColon &&
            (isBlank(l) || HEADING.test(l) || HR.test(l) || isOpener || hostedBlock || itemClosesPara ||
             isColonParagraphInterrupt(l) || COLON_CLOSER.test(l) ||
             isTableRow(l) || quotedAttribute || contRow || nestedQuoteEnds || nestedItemEnds ||
             (isLinkDef(l) && !FOOTNOTE_DEF.test(l)) || DEFLIST_TERM.test(l) || COMMENT_LINE.test(l) ||
             (FOOTNOTE_DEF.test(l) && !opensParagraph(FOOTNOTE_DEF.exec(l)[2], true)))) {
          qOpenPara = false
          qItemPara = false
          qTermOpen = false
          qPara = []
        } else {
          // A footnote body takes a lazy line like every container (carve#3885).
          if (!qOpenPara || FOOTNOTE_DEF.test(l)) qPara = []
          if (!qOpenPara) qItemPara = itemContent !== undefined
          qOpenPara = true
          qPara.push(l)
        }
        let leaf = l
        for (let depth = 0; (qTermOpen || l.includes(':: ')) && depth < MAX_NESTING_DEPTH; depth++) {
          const quote = QUOTE.exec(leaf)
          const marker = matchMarkerAt(indentCols(leaf))
          if (quote) leaf = quote[1] ?? ''
          else if (marker) leaf = marker.text
          else break
        }
        // PART 0 T leaves a term open for plain lazy text.
        qTermOpen = !/^:( +)/.test(leaf.trimStart()) &&
          (DEFLIST_TERM.test(leaf) || qTermOpen)
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
          hostedFirstBlockPending = false
          const firstBlockPlus = /^[> \t]*\+[ \t]*$/.test(qm[1] ?? '')
          const firstBlockQuoteCol = firstBlockPlus
            ? state.markerLineColumns.get(lines)?.get(i) ?? ind(i).L?.col ?? sourceQuoteCol
            : sourceQuoteCol
          // `- > +` also takes a follower at the quote's own column (CARVE-P9-067, carve#3421).
          const markerQuoteCol = i === 0 ? markerLineQuoteColumns.get(lines) : undefined
          const quoteColFollower = firstBlockPlus && markerQuoteCol !== undefined &&
            attachesFlushLeft(ind(i + 1), markerQuoteCol) && !matchMarkerAt(ind(i + 1))
          const firstBlockAtZero = firstBlockPlus && firstBlockQuoteCol > 0 &&
            (ind(i + 1)?.L?.col ?? ind(i + 1)?.col) === 0 && !matchMarkerAt(ind(i + 1))
          // A lazily folded follower from an ineligible column refuses the marker (CARVE-P9-067).
          const lazyRefused = lazyFollowerEligible.get(lines)?.[i + 1] === false
          // `+` on the line that opens the innermost quote is its first-block marker.
          // Depths are counted only for a candidate, so deep nesting stays linear.
          if (!qHost.fence && openComment === null && firstBlockPlus && !lazyRefused &&
              i + 1 < n && !isBlank(lines[i + 1]) &&
              (!QUOTE.test(lines[i + 1]) || (inItem && i === 0) ||
                (i === 0 && quotePulledFollowers.has(lines))) &&
              (firstBlockAtZero || quoteColFollower ||
                (attachesFlushLeft(ind(i + 1), firstBlockQuoteCol) &&
                  !matchMarkerAt(indentCols(stripLazy(lines[i + 1])))))) {
            const depthOf = (line) => {
              let d = 0
              while (QUOTE.test(line)) {
                line = QUOTE.exec(line)[1] ?? ''
                d++
              }
              return { d, rest: line }
            }
            const here = depthOf(lines[i])
            if (CONT_MARKER.test(here.rest) && here.d > (qLastMarked < 0 ? 0 : depthOf(lines[qLastMarked]).d)) {
              const attached = takeOneBlock(lines, i + 1, state, ind(i + 1),
                firstBlockAtZero ? 0 : quoteColFollower ? markerQuoteCol : firstBlockQuoteCol)
              // The innermost quote owns the `+`: a follower at its column is read at that quote's column 0.
              const shift = here.d > 1 && quoteColFollower ? ind(i + 1).col : 0
              inner.push(here.d > 1 ? qm[1] : '',
                ...(shift ? attached.rawMarker.map((line) => line.replace(new RegExp(`^ {0,${shift}}`), '')) : attached.rawMarker))
              if (!leavesFenceOpen(attached.rawMarker.map((line) => line.trimStart()))) inner.push('')
              if (here.d > 1 && QUOTE.test(lines[i + 1])) quotePulledFollowers.add(inner)
              qLastMarked = i
              i = attached.next
              continue
            }
          }
          qLastMarked = i
          carryPrefixMemo(state, lines, i, inner, inner.length)
          inner.push(qm[1] ?? '')
          // Only a stacked opener line (`- > +`) pulls past the host quote's end (CARVE-P9-067).
          hostedFirstBlockPending = !qHost.fence && openComment === null && (!qOpenPara || qItemPara) &&
            !!matchMarkerAt(indentCols((qm[1] ?? '').replace(/^(?:> ?)*/, ''))) &&
            firstBlockQuoteColumn((qm[1] ?? '').replace(/^(?:> ?)*/, '')) !== undefined
          // Below a quote opened with the `+` on this quote's opener line, the
          // walk already refused every follower at an ineligible raw column.
          if (i > 0 && markerCarriesContinuation(lines[i - 1].trim(), prefixMemo(state, lines, i - 1).continuation))
            recordLazyFollower(inner, lazyFollowerEligible.get(lines)?.[i] ??
            ((inner.length === 2 && QUOTE.test(inner[0]) && /^[> \t]*\+[ \t]*$/.test(inner[0])) ||
              [0, markerLineQuoteColumns.get(lines), state.markerLineColumns.get(lines)?.get(0)].includes(ind(i).L?.col ?? ind(i).col)))
          if (!qHost.fence && openComment === null) {
            const colon = COLON_FENCE.exec(qm[1] ?? '')
            if (colon && COLON_CLOSER.test(qm[1] ?? '') && colon[1].length === qColonRuns.at(-1)?.length) qColonRuns.pop()
            else if (qColonRuns.at(-1)?.mode !== 'line-block' && colon && isColonBlockOpener(qm[1] ?? '') &&
                (!qOpenPara || isColonParagraphInterrupt(qm[1] ?? ''))) {
              qColonRuns.push({ length: colon[1].length, mode: parseColonOpener(colon[2]).mode })
            }
          }
          // The final line has no follower whose ownership needs this state.
          if (i + 1 < n) trackFence(qm[1] ?? '', i)
          i++
          continue
        }
        if (lines[i] !== undefined && CONT_MARKER.test(ind(i).rest) &&
            // A quoted item's rebased `+` keeps its source column when a list follows.
            !(qOpenPara && matchMarkerAt(ind(i + 1)) &&
              (ind(i).L?.col ?? ind(i).col) > sourceQuoteCol) &&
            (ind(i).col === 0 || (ind(i).L?.col ?? ind(i).col) === sourceQuoteCol)) {
          // PART 9 SS17 L4: `+` at column 0 attaches ONE following block
          i++
          // ... and CONTINUATION-MARKER FLUSH-LEFT MEANS COLUMN 0 says WHICH block, asked in
          // `attachedBlockEnd` where every container asks it (carve#1814). A
          // QUOTE IS REACHED BY ITS MARKER, AND A COLUMN NEVER REACHES INTO ONE
          // (SS10 I5, carve#1384): a column-2 line under `> a` is in no quote,
          // and with no gate here the marker reached out and took it anyway.
          //
          // A refused marker adds no blank separator, which would close the
          // quote's open paragraph: it folds into that paragraph, or the
          // enclosing parse reads it as text (§17 L3).
          const attached = takeOneBlock(lines, i, state, ind(i), ind(i - 1).L?.col ?? sourceQuoteCol)
          if (attached.next > i) {
            const colonMode = qColonRuns.at(-1)?.mode
            const insideColon = colonMode && colonMode !== 'line-block' && !qHost.fence
            const bounds = state.attachmentBoundaries ??= new WeakMap()
            const indices = bounds.get(inner) ?? []
            indices.push(inner.length)
            bounds.set(inner, indices)
            if (insideColon) {
              const origins = state.quoteAttachmentOrigins ??= new WeakMap()
              const source = origins.get(inner) ?? new Map()
              const parentOrigins = state.opaqueMeasurement?.origins.get(lines)
              source.set(inner.length,
                typeof parentOrigins === 'number' ? parentOrigins + i : parentOrigins?.[i] ?? i)
              origins.set(inner, source)
            }
            if (qHost.fence) {
              qHost.fence = null
            }
            if (!insideColon || qOpenPara) inner.push('')
            inner.push(...attached.rawMarker)
            if (!leavesFenceOpen(attached.rawMarker.map((line) => line.trimStart()))) inner.push('')
            qOpenPara = false
            qItemPara = false
            qTermOpen = false
            qPara = []
            i = attached.next
            continue
          }
          // §17 L3: a refused `+` is never dropped; it folds into the open paragraph.
          if (qOpenPara) {
            inner.push(lazyFrame(ind(i - 1).rest))
            continue
          }
          i--
          break
        }
        if (qHost.fence || openComment !== null) break
        if (hostedFirstBlockPending &&
            (ind(i).L?.col ?? ind(i).col) === 0 &&
            !matchMarkerAt(ind(i)) && !isBlank(lines[i])) {
          const attached = takeOneBlock(lines, i, state, ind(i), 0)
          inner.push(...attached.rawMarker)
          hostedFirstBlockPending = false
          i = attached.next
          continue
        }
        if (CONT_MARKER.test(ind(i).rest)) {
          const plusCol = ind(i).L?.col ?? ind(i).col
          if (plusCol < sourceQuoteCol || !qOpenPara || qItemPara && plusCol === sourceQuoteCol) break
          // Right of the `>`, an unprefixed `+` reaches no marker column, so it folds (§17 L3).
          if (qItemPara) {
            inner.push(lazyFrame(ind(i).rest))
            i++
            continue
          }
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
        const foldedColon = ind(i).col > 0 && COLON_CLOSER.test(ind(i).rest) &&
          (inner.at(-1) ?? '').startsWith(' ') && (inner.at(-1) ?? '').trimStart().startsWith(':::')
        const unmarked = stripLazy(lines[i] ?? '')
        // X2: every open quote depth keeps its claim on an unmarked marker.
        const nestedMarkerFold = !qTermOpen && qNestedPara.some(Boolean) && !!matchMarkerAt(indentCols(unmarked))
        // A list item interrupts the one-line paragraph a note's refused `+` forms (§10 I2).
        const refusedNotePlus = qLastMarked === i - 1 && !!matchMarkerAt(indentCols(unmarked)) &&
          endsInNotePlus(QUOTE.exec(lines[i - 1])?.[1] ?? '')
        if (lines[i] !== undefined && (qOpenPara || qTermOpen || foldedColon || hostedFirstBlockPending) &&
            !bodyEndsWrappedAttr(inner) && !refusedNotePlus && !isBlank(lines[i]) &&
            !COMMENT_LINE.test(lines[i]) && (!qTermOpen || foldablePlainLine(unmarked) ||
              QUOTE.test(stripIndent(unmarked)) ||
              (FENCE.test(unmarked) && !opensFence(lines, i)) || nestedMarkerFold) &&
            (!peekInterrupts(i) || foldedColon || nestedMarkerFold) &&
            (!COLON_CLOSER.test(lines[i]) || foldedColon) && !CAPTION.test(lines[i])) {
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
          inner.push(lines[i].startsWith(LAZY) ? lines[i] : lazyFrame(ind(i).rest))
          recordLazyFollower(inner, lines[i].startsWith(LAZY) ? lazyFollowerEligible.get(lines)?.[i] : (ind(i).L?.col ?? ind(i).col) === 0)
          i++
          continue
        }
        break
      }
      const children = parseBlocks(inheritFinalBreak(lines, inner, i, state), state, false)
      const node = { t: 'quote', children }
      // caption -> <figure><blockquote/><figcaption> (PART 9 SS4).
      // A quote of nothing but structural-only `>` lines is not a captionable
      // host: it holds nothing the caption could be about, and letting it take
      // one binds the caption across the container change that opened it
      // (PART 9 SS4d, markup-carve/carve#2892).
      const cap = children.length > 0 ? captionSlot(i) : null
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
      i = parseListRun(lines, i, blocks, state, peekInterrupts, ind, meas, inItem)
      if (blocks.length > before) {
        if (pending.length) flushAttrs(blocks[before])
        // PART 9 SS17 L7: the consumed boolean loosens the list it rides.
        if (consumeLooseKey(blocks[before])) blocks[before].tight = false
      }
      continue
    }

    // A `+` reaching HERE is ordinary text. First-block markers in lists,
    // descriptions, quotes, and notes are consumed by their collectors.

    // --- paragraph ---
    const para = []
    while (i < n && !isBlank(lines[i])) {
      if (lines[i].startsWith(LAZY)) {
        para.push(lines[i].slice(LAZY.length).replace(/[ \t]+$/, ''))
        i++
        continue
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
      if (CAPTION.test(lines[i]) && isCaptionableParagraph(para)) break
      if (lines[i][0] === '{' && tryAttrLine(lines, i)) break // SS15 A1 / SS10 I5
      if (ind(i).rest.startsWith('%%')) break // SS10 I5 (comment line or fence)
      if (inItem && para.length > 0 && matchMarkerAt(ind(i))) break // SS24 C3
      // A refused sibling marker that starts its own paragraph yields to that sibling.
      if (para.length === 1 && para[0].trim() === state.refusedSiblingSentinel && matchMarkerAt(ind(i))) break
      if (para.length > 0) {
        if (startsParagraphBlock(lines[i], top)) break // I1/I5
        if (fenceOpens?.has(i)) break
        {
          if (colonInterruptsParagraph(lines, i, para)) break // I1/I4
        }
        if (opensFence(lines, i)) break // I4: a valid opener interrupts
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

// A block that opens a code fence, after any attribute lines, and never closes it.
const leavesFenceOpen = (block) => {
  let at = 0
  for (let attrs; (attrs = tryAttrLine(block, at)); ) at = attrs.next
  const m = FENCE.exec(block[at] ?? '')
  return !!m && parseFenceInfo(m[2]) !== null && findCloser(block, at, m[1]) === -1
}

// A closer cannot turn invalid metadata into a block opener. Interruption
// probes and paragraph collection use the same validation and body extent.
// §10 I4: a valid code or raw opener interrupts an open paragraph whether or
// not a closer follows (carve#4018).
function opensFence(lines, idx) {
  const m = FENCE.exec(lines[idx] ?? '')
  return !!m && parseFenceInfo(m[2]) !== null
}

function hasCloser(lines, idx) {
  const m = FENCE.exec(lines[idx])
  if (!m || parseFenceInfo(m[2]) === null) return false
  return findCloser(lines, idx, m[1]) !== -1
}

function findCloser(lines, openIdx, run) {
  const ch = run[0]
  for (let j = openIdx + 1; j < lines.length; j++) {
    layoutWork.closerScan++
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
  // second space then reaches `code_fence_info`, which starts with a token,
  // title or label. A later title or label needs a `space+` separator; an
  // initial title or label follows only the opener's optional space.
  let s = raw.replace(/^ ?/, '').replace(/[ \t]+$/, '')
  const out = { lang: '', title: null, label: null }
  // raw_block has a format identifier and no title or label slots.
  if (s.startsWith('=')) {
    return /^=[A-Za-z_][A-Za-z0-9_-]*$/.test(s) ? { ...out, lang: s } : null
  }
  const lm = /^([A-Za-z0-9\-_+#./]+)/.exec(s)
  if (lm) {
    out.lang = lm[1]
    s = s.slice(lm[0].length)
  }
  const tm = (out.lang ? /^ +"([^"]*)"/ : /^"([^"]*)"/).exec(s)
  if (tm) {
    out.title = tm[1]
    s = s.slice(tm[0].length)
  }
  const needsLabelSeparator = out.lang !== '' || out.title !== null
  const lb = (needsLabelSeparator ? s.startsWith(' ') : s.startsWith('['))
    ? takeLabelSlot(s) : null
  if (lb) {
    out.label = lb.label
    s = lb.rest
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
function oneBlockEnd(lines, start, endsBlock, cap = lines.length) {
  // A fence after a leading attribute run is still the attached block (carve#1238).
  let opener = start
  const column = indentCols(lines[start] ?? '').col
  for (let attrs; (attrs = tryAttrLine(dedentedWindow(lines, opener, column), 0)); ) opener += attrs.next
  const fenced = fencedBlockEnd(lines, opener)
  if (fenced !== -1) return fenced + 1
  let end = start
  const stopAt = Math.min(lines.length, cap)
  while (end < stopAt && !endsBlock(end)) end++
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
function markMeasuredOpaque(state, lines, from, to) {
  const measurement = state.opaqueMeasurement
  const origins = measurement?.origins.get(lines)
  if (origins === undefined) return
  // Direct fence rows are already covered by the extent scan below.
  // Capture marker-line fences only after the reader admitted CODE or RAW.
  const openerOrigin = typeof origins === 'number' ? origins + from : origins[from]
  if (openerOrigin === undefined) return
  const sourceLead = indentCols(measurement.sourceLines[openerOrigin]).rest.replace(/^: +/, '')
  if (matchMarkerAt(indentCols(sourceLead)) === null) return
  measurement.markerFenceEnd.set(lines, to)
  for (let index = from; index < to; index++) {
    const origin = typeof origins === 'number' ? origins + index : origins[index]
    if (origin !== undefined && !isBlank(lines[index]) && measurement.sourceColumns?.[origin] < 0) break
    if (origin !== undefined) measurement.rows.add(origin)
    layoutWork.lineVisits++
  }
}

function markMeasuredContainerText(state, lines, from, to, ind) {
  const measurement = state.opaqueMeasurement
  const origins = measurement?.origins.get(lines)
  const markerEnd = measurement?.markerFenceEnd.get(lines)
  if (!Array.isArray(origins) || markerEnd === undefined || markerEnd > from) return
  // Retain literal text in an admitted child container after a marker fence.
  for (let row = from; row < to; row++) {
    if (ind(row).col > 0 && origins[row] !== undefined) measurement.rows.add(origins[row])
    layoutWork.lineVisits++
  }
}

// The marker columns of rows start..limit, shifted to the slice. The map holds
// every marker line of the host, so read the shorter side (carve#4017).
function measuredMarkerColumns(markerColumns, start, limit) {
  const shifted = new Map()
  if (markerColumns.size <= limit - start) {
    for (const [row, col] of markerColumns) if (row >= start && row < limit) shifted.set(row - start, col)
    return shifted
  }
  for (let row = start; row < limit; row++) if (markerColumns.has(row)) shifted.set(row - start, markerColumns.get(row))
  return shifted
}

const DESCRIPTION_TEXT = /^: (?=[ \t]*[^ \t\n\r])/

function firstBlockEnd(lines, start, limit, state, sourceColumns, readColumn = 0) {
  if (limit - start <= 1) return limit
  // Measure the block at the column it is read at: `  # H` is a heading there.
  // A line below that column can only fold lazily (§10 I2), and a fence there
  // folds only without a closer (§10 I4); any other line ends the block.
  let measuredLines = lines.slice(start, limit)
  if (readColumn > 0) {
    const read = []
    for (const line of measuredLines) {
      const measured = indentCols(line)
      if (measured.rest === '' || measured.col >= readColumn) read.push(dedentParts(line, readColumn).text)
      else if (measured.rest[0] === '{' && tryAttrLine([measured.rest], 0)) break
      // A description marker with no term opens nothing, so it folds (PART 0 S4).
      else if (foldablePlainLine(measured.rest) || DESCRIPTION_TEXT.test(measured.rest)) read.push(lazyFrame(measured.rest))
      else if (isCodeBlockOpener(measured.rest)) read.push(measured.rest)
      else break
    }
    if (read.length <= 1) return start + read.length
    limit = start + read.length
    measuredLines = read
  }
  const stop = { next: limit - start }
  // The throwaway state still reads the document the real parse reads: its
  // settings, and the marker-line columns of the measured rows (carve#3945).
  const markerColumns = state.markerLineColumns?.get(lines)
  const seen = {
    linkDefs: new Map(),
    footnoteDefs: new Map(),
    abbrDefs: new Map(),
    includeFiles: state.includeFiles,
    markerLineColumns: new WeakMap(markerColumns ? [[measuredLines, measuredMarkerColumns(markerColumns, start, limit)]] : []),
    sourceHasLonePlus: state.sourceHasLonePlus,
    ordinaryPlusSentinel: state.ordinaryPlusSentinel,
    refusedSiblingSentinel: state.refusedSiblingSentinel,
    blockDepth: state.blockDepth ?? 0,
    measuringAuthoredBlock: state.measuringAuthoredBlock ?? false,
  }
  seen.opaqueMeasurement = { origins: new WeakMap([[measuredLines, start]]), sourceColumns, sourceLines: lines, markerFenceEnd: new WeakMap(), rows: new Set() }
  try {
    parseBlocks(measuredLines, seen, false, true, undefined, stop)
  } catch (error) {
    if (!(error instanceof Refuse)) throw error
    // Outside the executable subset: the extent is the honest answer, and the
    // real parse of these lines raises the same refusal where it belongs.
    return limit
  }
  return foldedDefinitionEnd(lines, start, start + stop.next, seen)
}

function invisibleAuthoredEnd(lines, start, limit) {
  // CARVE-P0-004: an invisible definition has no rendered block to stop at.
  const opener = indentCols(lines[start] ?? '')
  if (FOOTNOTE_DEF.test(opener.rest)) {
    const bodyColumn = opener.col + FOOTNOTE_BODY_COLUMN
    let end = start + 1
    while (end < limit) {
      const measured = indentCols(lines[end])
      if (measured.rest !== '' && measured.col < bodyColumn) break
      end++
    }
    return end
  }
  if (isLinkDef(opener.rest)) return start + 1
  return null
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
  // A definition past an open term's column is that term's text (carve#2411),
  // so it cannot end the block.
  let termCol = null
  for (let k = start; k < end; k++) {
    const line = lines[k]
    if (line === undefined || isBlank(line)) {
      if (!opaque) termCol = null
      continue
    }
    if (seen.opaqueMeasurement.rows.has(k)) continue
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
    if (termCol !== null) {
      if (col > termCol && !BULLET.test(trimLineEnd(rest)) && !isOrderedMarkerLine(rest)) {
        // A folded comment fence keeps its body, blank lines included.
        const folded = COMMENT_FENCE_BODY.exec(rest)
        if (folded && commentFenceCloserAhead(lines, k, folded[1])) opaque = { kind: 'comment', run: folded[1] }
        continue
      }
      if (!foldablePlainLine(rest)) termCol = null
    }
    if (DEFLIST_TERM.test(rest)) termCol = col
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
    const link = matchLinkDef(rest)
    if (!footnote && !link) continue
    const key = labelKey(footnote ? footnote[1] : link.label)
    const table = footnote ? seen.footnoteDefs : seen.linkDefs
    const kind = footnote ? 'f' : 'l'
    if (col > 0 && (claimed.has(kind + key) || !table.has(key))) return k
    claimed.add(kind + key)
  }
  return end
}

// A marker takes one block at its source marker column (markup-carve/carve#3421).
const attachesFlushLeft = (firstMeas, column = 0) =>
  markerBodyPolicy(column, column).attaches(firstMeas)

// A line a closer lookahead reads past: only these can move a block end from below.
const LOOKAHEAD_SHAPE = /`{3}|~{3}|:{3}|%%|\$\$/

function attachedBlockEnd(lines, start, state, endsAttachment, firstMeas, column = 0, readColumn = 0) {
  if (!attachesFlushLeft(firstMeas, column)) return start
  // Grow a window instead of measuring the whole extent per marker (carve#4017).
  // The extent holds no blank line outside a fence, so a block that ends inside
  // the window ends there in the full extent too, unless a closer lies beyond.
  for (let cap = start + 16; ; cap = start + 2 * (cap - start)) {
    const limit = oneBlockEnd(lines, start, endsAttachment, cap)
    const end = firstBlockEnd(lines, start, limit, state, undefined, readColumn)
    if (limit < cap || cap >= lines.length) return end
    if (end < limit && !lines.slice(start, limit).some((line) => LOOKAHEAD_SHAPE.test(line))) return end
  }
}

// The boundary set for a container with no marker column of its own - a block
// quote, a footnote body, a definition description: a blank line or a further
// `+`. A list item adds its sibling marker to this and is otherwise identical.
const attachmentBoundary = (lines) => (idx) =>
  isBlank(lines[idx]) || CONT_MARKER.test(lines[idx])

function authoredBlockEnd(lines, start, base, state) {
  const comment = classifyLayoutComment(lines, start)
  if (comment) return comment.end
  // An attribute line ends at its closing brace; it cannot own the next block.
  const attributes = tryAttrLine(dedentedWindow(lines, start, base), 0)
  if (attributes) return start + attributes.next
  if (state.measuringAuthoredBlock) return start + 1
  // The first block normally ends close to its opener. Measure a small window
  // first and extend it only when the block reaches the window's edge.
  for (let end = Math.min(lines.length, start + 16); ; end = Math.min(lines.length, start + 2 * (end - start))) {
    const candidate = lines.slice(start, end).map((source) => {
      if (isBlank(source)) return source
      const measured = indentCols(source)
      return measured.col < base ? source : dedentMeasured(measured, source, base).text
    })
    const invisibleEnd = FOOTNOTE_DEF.test(candidate[0] ?? '') ? null : invisibleAuthoredEnd(candidate, 0, candidate.length)
    const blockEnd = invisibleEnd ?? firstBlockEnd(candidate, 0, candidate.length, {
      ...state,
      measuringAuthoredBlock: true,
    })
    if (start + blockEnd < end || end === lines.length) return start + blockEnd
  }
}
// The quote column of a `- > +` item head, keyed by the item's line array.
const markerLineQuoteColumns = new WeakMap()
const quotePulledFollowers = new WeakSet()
const firstBlockQuoteColumn = (source) => {
  if (!source.includes('+')) return undefined
  let rest = source
  for (let depth = 0; depth < MAX_NESTING_DEPTH; depth++) {
    const marker = matchMarkerAt(indentCols(rest))
    if (marker) { rest = marker.text; continue }
    const measured = indentCols(rest)
    const quote = QUOTE.exec(measured.rest)
    if (!quote) return undefined
    const column = indentCols(source.slice(0, source.length - measured.rest.length).replace(/[^\t]/g, ' ')).col
    rest = quote[1] ?? ''
    if (CONT_MARKER.test(rest)) return column
  }
  return undefined
}
// Whether a marker line's stack of quote and list markers ends in a note's
// first-block `+` (`> [^b]: +`, `> - [^b]: +`).
const endsInNotePlus = (source) => {
  let rest = source
  for (let depth = 0; depth < MAX_NESTING_DEPTH; depth++) {
    const measured = indentCols(rest)
    const note = FOOTNOTE_DEF.exec(measured.rest)
    if (note) return CONT_MARKER.test(note[2])
    const marker = matchMarkerAt(measured)
    if (marker) { rest = marker.text; continue }
    const quote = QUOTE.exec(measured.rest)
    if (!quote) return false
    rest = quote[1] ?? ''
  }
  return false
}
// Per lazily folded line: whether it started at a column a first-block `+`
// may pull from (column 0 of the frame it was read in, or the opener line's
// own column). Keyed by the line array the fold pushed it into.
const lazyFollowerEligible = new WeakMap()
const recordLazyFollower = (target, eligible) => {
  let rows = lazyFollowerEligible.get(target)
  if (!rows) lazyFollowerEligible.set(target, rows = [])
  rows[target.length - 1] = eligible
}
// A refused marker leaves an empty attached range for ordinary column rules.
function takeOneBlock(lines, start, state, firstMeas, column = 0) {
  const startsList = !!matchMarkerAt(indentCols(lines[start] ?? ''))
  const boundary = (idx) => attachmentBoundary(lines)(idx) ||
    (startsList && idx > start && indentCols(lines[idx]).col === column && QUOTE.test(indentCols(lines[idx]).rest))
  const one = attachedBlockEnd(lines, start, state, boundary, firstMeas, column)
  return { rawMarker: lines.slice(start, one), next: one }
}

// --- lists: PART 9 SS11 N1-N3, SS17 L1-L4, SS24 C3/C4 ----------------------
function parseListRun(lines, i, blocks, state, peekInterrupts, ind, meas, inItem) {
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
    i = collectItems(lines, i, list, state, ind, meas, inItem)
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
  const { col, rest } = meas
  const line = trimLineEnd(rest)
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

function collectItems(lines, i, list, state, ind, meas, inItem) {
  const n = lines.length
  const skipped = new Set()
  const nextVisible = (at) => {
    while (skipped.has(at)) at++
    return at
  }
  const previousVisible = (at) => {
    while (skipped.has(at)) at--
    return at
  }
  const visibleDistance = (start, end) => {
    let count = end - start
    for (const index of skipped) if (index >= start && index < end) count--
    return count
  }
  const baseIndent = matchMarkerAt(ind(i)).indent
  const commentsBeforeSibling = (at) => {
    if (at >= n || !COMMENT_LINE.test(ind(at).rest)) return at
    // Three consecutive blanks end the list; a comment line breaks the run.
    let run = 0
    for (let k = at - 1; k >= 0 && ind(k).rest === ''; k--) run++
    let blanks = run
    let longest = run
    let k = at
    while (k < n && (ind(k).rest === '' || COMMENT_LINE.test(ind(k).rest))) {
      if (ind(k).rest === '') {
        blanks++
        longest = Math.max(longest, ++run)
        k++
        continue
      }
      run = 0
      const fence = COMMENT_FENCE_BODY.exec(ind(k).rest)?.[1]
      let end = k
      if (fence) {
        for (let j = k + 1; j < n; j++) {
          if (COMMENT_FENCE_BODY.exec(ind(j).rest)?.[1] === fence) { end = j; break }
        }
      }
      k = end + 1
    }
    if (k >= n || longest >= 3) return at
    const next = matchMarkerAt(ind(k))
    if (!next || next.indent !== baseIndent || !sameAxes(list, next)) return at
    if (blanks > 0) list.tight = false
    return k
  }
  const sourceMarkerCol = (state.sourceHasLonePlus ? state.markerLineColumns.get(lines)?.get(i) : undefined) ??
    ind(i).L?.col ?? ind(i).col
  const authoredMarkerCol = separatorMarkerColumns.get(lines)?.get(i) ?? sourceMarkerCol
  while (i < n) {
    // Siblings group by their container, and a comment is invisible, so a
    // comment that closed the item above does not end the list (carve#3885).
    if (list.items.length > 0) i = commentsBeforeSibling(i)
    const head = matchMarkerAt(ind(i))
    if (!head || head.indent !== baseIndent || !sameAxes(list, head)) break
    if (head.text.startsWith('\t') && !/^%{3}/.test(head.text.slice(1))) {
      head.text = lazyFrame(head.text.slice(1))
    }
    const sourceQuoteCol = (i === 0 ? markerLineQuoteColumns.get(lines) : undefined) ??
      firstBlockQuoteColumn(ind(i).L?.src ?? lines[i])
    if (list.ord && list.items.length > 0) {
      // narrow the dialect set per item (SS11 N2)
      const heads = new Set(head.dialects.map((d) => d.dialect))
      list.ord.dialects = list.ord.dialects.filter((d) => heads.has(d.dialect))
    }
    const itemBody = markerBodyPolicy(head.indent + head.markerWidth, authoredMarkerCol)
    let contentCol = itemBody.contentColumn
    // A line's column as this item's own body parse measures it: stripped to
    // the content column and walked again (PART 9 SS24 C5). It differs from
    // `col` only for a tab past a content column off a tab stop, and it is the
    // column a descendant's content column is compared against.
    const reachOf = (m, line) => m.tabs && contentCol % 4 !== 0 && m.col > contentCol
      ? contentCol + dedentMeasured(m, line, contentCol).meas.col
      : m.col
    const itemLines = []
    const captionGaps = []
    const residueFence = { index: 0, opaque: null }
    const commentClosersByColumn = new Map()
    const hasFutureCommentCloser = (run, column) => {
      let cached = commentClosersByColumn.get(column)
      if (!cached || cached.end < i) {
        const closers = new Map()
        let k = i
        for (; k < n; k++) {
          const measured = ind(k)
          if (measured.rest !== '' && measured.col < (authoredBlockBase ?? contentCol) + column) break
          const match = COMMENT_FENCE.exec(lines[k])
          if (match) closers.set(match[1].length, k)
        }
        cached = { end: k, closers }
        commentClosersByColumn.set(column, cached)
      }
      return (cached.closers.get(run.length) ?? -1) > i
    }
    const fenceOpensAt = new Set()
    // The same for a fence a DESCENDANT opened, in its own set: the two
    // consumers of `fenceOpensAt` ask whether the line interrupts THIS body's
    // paragraph, which an indented line does not, so putting a descendant's
    // index there would answer a different question (carve#2490).
    const nestedFenceOpensAt = new Set()
    // Measurements for the body lines, carried to the item's own parse so it
    // does not re-walk indentation this collector has already walked
    // (carve#752). `null` means "not derivable here" - a line this collector
    // synthesized, or one whose run held a tab - and the inner parse walks it
    // once. Every push goes through `pushLine` so the two arrays cannot drift.
    const itemMeas = []
    const itemSourceRows = []
    let itemHasTerm = DEFLIST_TERM.test(head.text)
    const measurement = state.opaqueMeasurement
    const parentOrigins = measurement?.origins.get(lines)
    const itemOrigins = parentOrigins === undefined ? undefined : []
    if (itemOrigins) measurement.origins.set(itemLines, itemOrigins)
    // Is a TABLE open at the end of the body collected so far? The context a
    // `+ ...|` line needs before it can be a continuation row (§5 T6, see
    // `isContinuationRow`), advanced by `tableRunStep` on every line that joins
    // the body - the MARKER line included, since that line is the item's first
    // block, and the blank a blank-line branch pushes, which ends the run.
    let tableOpen = false
    let lastListBlock = DEFLIST_TERM.test(head.text) ? 'term' : 'item'
    let lastTermSourceCol = DEFLIST_TERM.test(head.text) ? authoredMarkerCol + head.markerWidth : null
    const pushLine = (text, m = null, row = i) => {
      itemLines.push(text)
      itemMeas.push(m)
      itemSourceRows.push(row)
      if (text.startsWith(LAZY) && itemLines.length > 1) {
        recordLazyFollower(itemLines, lines[i]?.startsWith(LAZY)
          ? lazyFollowerEligible.get(lines)?.[i]
          : [0, state.markerLineColumns?.get(lines)?.get(headIndex) ?? sourceMarkerCol, sourceQuoteCol].includes(ind(i).L?.col ?? ind(i).col))
      }
      if (itemLines.length > 1 && DEFLIST_TERM.test(ind(row)?.rest ?? '')) itemHasTerm = true
      if (itemOrigins) itemOrigins.push(text === '' ? undefined :
        typeof parentOrigins === 'number' ? parentOrigins + i : parentOrigins[i])
      tableOpen = tableRunStep(tableOpen, text)
    }
    carryPrefixMemo(state, lines, i, itemLines, 0)
    const headIndex = i
    pushLine(head.text)
    if (sourceQuoteCol !== undefined) markerLineQuoteColumns.set(itemLines, sourceQuoteCol)
    if (matchMarkerAt(indentCols(head.text))) state.markerLineColumns.set(itemLines, new Map([[0,
      head.text.includes('+') && markerCarriesContinuation(head.text.trim(), prefixMemo(state, itemLines, 0).continuation)
        ? sourceMarkerCol : sourceMarkerCol + head.markerWidth]]))
    else if (QUOTE.test(head.text) && head.text.includes('+') && markerCarriesContinuation(head.text.trim(),
        prefixMemo(state, itemLines, 0).continuation)) {
      state.markerLineColumns.set(itemLines, new Map([[0, sourceMarkerCol]]))
      markerLineQuoteColumns.set(itemLines, sourceQuoteCol ?? sourceMarkerCol + head.markerWidth)
    }
    // Whether the marker line opens nested items whose innermost item is the
    // FIRST-BLOCK `+` form. An enclosing collector must carry a following
    // flush-left block down to that item even though the empty `+` leaves no
    // paragraph open at the enclosing levels.
    let carriesBareContinuation = i + 1 < n &&
      markerCarriesContinuation(head.text.trim(), prefixMemo(state, itemLines, 0).continuation)
    let nestedAttachmentColumn = sourceMarkerCol
    let nestedAttachmentEnd = -1
    // A marker at the descendant's own indent is its sibling and bounds its block (SS17 L3).
    let nestedSiblingIndent = -1
    // The spent attachment is a sublist, whose open paragraph a lazy line may still reach.
    let spentOnSublist = false
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
    // CARVE-P0-004: a new opener below this column takes its own base.
    let noteBodyBoundary = null
    const noteFrames = []
    let markerNoteEligible = FOOTNOTE_DEF.test(head.text)
    const markerNoteBodyColumn = markerNoteEligible ? indentCols(lines[i].slice(0, lines[i].indexOf('[^')).replace(/[^\t]/g, ' ')).col + FOOTNOTE_BODY_COLUMN : null
    let noteMarkerSeen = false
    let noteTailList = false
    let noteListBodyColumn = null
    let noteListChildColumn = null
    let noteFenceEnd = -1
    const noteCloserSearches = new Map()
    let notePara = -1
    const closePara = () => { openPara = false; para = []; defBodyIndent = null; notePara = -1 }
    const startPara = () => { openPara = true; para = []; defBodyIndent = null; notePara = -1 }
    const openParaWith = (line) => { if (!openPara) para = []; openPara = true; para.push(line); defBodyIndent = null; notePara = -1 }
    /*
     * THE COLLECTOR'S THREE CLAIM QUESTIONS, ASKED SEPARATELY.
     *
     * "Does this item claim the next line" is three facts, and `openPara`
     * together with testing a line's shape at the frame's own column 0 answered
     * all three at once. Every rule written for a flush-left line below a
     * nested item then failed on that conflation rather than on its own merits:
     * generalizing the shape test also erased "this line was absorbed into an
     * open paragraph", and dropping the paragraph gate made an item swallow
     * indented openers as text (carve#2744).
     *
     * The three are composed at each decision site below and never folded back
     * into one predicate. Writes to `openPara` stay where they are: these name
     * the QUESTIONS, not the state that answers the first one.
     */
    // Q1. IS A PARAGRAPH OPEN IN THIS ITEM?
    // A note body's lines leave the item paragraph closed; whether the note
    // still holds an open paragraph is asked once, by the first line past it.
    const paragraphIsOpen = () => {
      const boundary = noteBodyBoundary ?? markerNoteBodyColumn
      if (notePara >= 0 && i > notePara && boundary !== null) {
        const m = ind(i)
        if (m === undefined || m.rest === '' || m.col < boundary) {
          notePara = -1
          if (noteClaimsLazyLine(i)) openPara = true
        }
      }
      return openPara
    }
    /*
     * Q2. IS THIS LINE A BLOCK OPENER, measured at a STATED anchor column?
     *
     * `text` arrives dedented to that anchor, which is the parameter the old
     * spelling lacked: it always passed the raw line, so every shape test was
     * anchored at the frame's column 0. `FENCE` and `startsVisibleBlock` match
     * only at column 0, so the anchor is what the shape tests read as block
     * position, and choosing it is now the caller's.
     */
    const opensBlockAt = (text, idx) =>
      startsVisibleBlock(text) || isTableRow(text) || isColonBlockOpener(text) ||
      (FENCE.test(text) && opensFence(lines, idx))
    /*
     * Q3. WHICH CONTAINER OWNS A COLUMN?
     *
     * Two readings, because the collector needs both and they coincide only for
     * a top-level item: against this item's own columns, and against the
     * enclosing frame's block position. `outer` is at or left of this item's
     * marker, so a sibling or an ancestor; `below` is inside the item's frame
     * but left of its content column; `item` is the item's own content.
     */
    const columnOwner = (col) =>
      col <= baseIndent ? 'outer' : col < contentCol ? 'below' : 'item'
    const atFrameColumn = (col) => col === 0
    const bodyFenceOpens = (idx, dedented, blockBase = contentCol, endedDescendant = false) => {
      const m = FENCE.exec(dedented)
      if (!m || parseFenceInfo(m[2]) === null) return false // INVALID-FENCE FALLBACK
      return true
    }
    // A blank line was seen, and what followed it attached INVISIBLY (a comment,
    // a definition). §17 L1's second clause - an item followed by a blank line
    // before the next sibling marker - still applies when that sibling arrives,
    // so the blank is remembered rather than consumed by the attachment.
    let blankBeforeInvisible = false
    // A blank line was seen, and only invisible lines have followed it so far
    // (§17 L1b). The next PARAGRAPH closes the separation and loosens.
    let pendingSeparation = false
    let noteOpenerLine = null
    const noteClaimsLazyLine = (at) => {
      // A code opener interrupts the note's paragraph rather than folding (§10 I4).
      if (isCodeBlockOpener(ind(at).rest)) return false
      const markerNote = noteOpenerLine === null && markerNoteEligible
      if (!markerNote && (noteOpenerLine === null || noteBodyBoundary === null)) return false
      const opener = FOOTNOTE_DEF.exec(markerNote ? head.text : ind(noteOpenerLine).rest)
      if (!opener) return false
      const bodyColumn = markerNote ? markerNoteBodyColumn : noteBodyBoundary
      const body = [opener[2]]
      for (let k = (markerNote ? headIndex : noteOpenerLine) + 1; k < at; k++) {
        const measured = ind(k)
        if (measured.rest === '') {
          body.push('')
        } else if (measured.col >= bodyColumn) {
          body.push(dedentMeasured(measured, lines[k], bodyColumn).text)
        } else if (body.at(-1) !== '' && (measured.rest.startsWith(LAZY) || foldablePlainLine(measured.rest))) {
          body.push(measured.rest)
        } else {
          return false
        }
      }
      return body.at(-1)?.trim() !== '' && !bodyEndsInOpenFence(body) && noteBodyParagraphOpen(body)
    }
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
      if (i + 1 < lines.length && !opensParagraph(head.text.trim(), true, false, prefixMemo(state, itemLines, 0).paragraph)) closePara()
    }
    // A footnote definition on the marker line has a body too.
    if (FOOTNOTE_DEF.test(head.text)) {
      closePara()
      defBodyIndent = 0
      notePara = i
    }
    // Content column of the FIRST sub-list opened in this item (-1 = none). A
    // blank followed by content at or past this column belongs to the sub-list,
    // not this item, so a descendant's looseness must not propagate up to this
    // item (carve#322).
    const headSubMarker = matchMarkerAt(indentCols(head.text))
    if (headSubMarker) separatorMarkerColumns.set(itemLines,
      new Map([[0, authoredMarkerCol + head.markerWidth]]))
    // A marker after a task box starts four source columns past the item's content column.
    const headSubCol = headSubMarker
      ? contentCol + (head.task === undefined ? 0 : TASK_MARKER_SOURCE_WIDTH) + headSubMarker.indent + headSubMarker.markerWidth
      : -1
    // The marker-line child owns this column until an outer authored block opens.
    let headSubActive = headSubCol >= 0
    // A sibling list at the content column has ended the marker-line child.
    let headSubEnded = false
    // A plain line below the child's column folded into its open paragraph.
    let childParagraphLazy = false
    let subCol = -1
    // A comment below the child's column ends it in the body parse (carve#3985).
    let commentBelowChild = false
    /*
     * PER-DESCENDANT QUESTION 1 (carve#2746).
     *
     * Q1 is not one bit. It is per-container state - whether a paragraph is
     * open, what that paragraph holds for SS12 absorption, and the fence stack -
     * and this collector held it only for ITSELF. Asking Q2 at a descendant's
     * column therefore asked it with Q1 answered for the wrong container, which
     * is why each candidate rule for a flush-left line below a nested item
     * failed in the other candidate's direction rather than on its merits
     * (carve#2744, carve#2746).
     *
     * Lifecycle, and it is the whole contract:
     *   SEEDED from the marker line, where a descendant spelled `- - x` has
     *     already taken content this collector never sees as a body line.
     *   ADVANCED by each line the descendant takes, in the DESCENDANT's
     *     coordinates, so the state reads as that container would read it.
     *   READABLE at the column the descendant owns, through `descendantQ1At`.
     *
     * It is recorded and never consulted by the answers below. That is
     * deliberate: this commit must move no row, and a rule that wants Q1 for a
     * descendant now has somewhere to ask rather than having to re-derive it
     * from this collector's own paragraph.
     */
    const descendantQ1 = { col: -1, open: false, para: [], absorbedFence: null, noteCol: null }
    let markerLineFence = headSubMarker
      ? markerFenceSummary(head.text, prefixMemo(state, itemLines, 0).markerFence ??= new Map())
      : null
    // Open colon containers and the table run inside the descendant, so its own
    // last block can be classified without rescanning this item's body.
    let descColon = 0
    let descTableOpen = false
    // Whether the LAST visible body line landed in a descendant frame, which is
    // what makes the descendant the DEEPEST frame for the line below.
    let deepestIsDescendant = false
    // Whether a descendant frame is OPEN AT ALL. It runs from the marker that
    // opens it until a non-blank line lands back at this item's own content.
    // `descendantOwned` is a COLUMN test and cannot tell those apart: an
    // indented fence this item's own paragraph absorbed sits at a descendant's
    // column with no descendant open (carve#2746's absorbed-fence row).
    let descLive = false
    // A fence folded into a child's paragraph keeps its lazy owner for later lines.
    let foldedChildParagraph = false
    /*
     * ONE DESCENDANT LINE'S OWN Q1 -- CARVE-P0-009. The descendant's last block
     * answers, exactly as this item's own does for itself: a heading, a
     * thematic break, a table row, a definition or an attribute block leaves no
     * paragraph open however deep it sits. `atBlockPosition` is true because
     * every line reaching here is at the descendant's block position, and the
     * marker peel inside `opensParagraph` carries the question further in.
     */
    const descendantLineOpensParagraph = (text, rowOpen = false, idx = -1, memo = null) =>
      // A FENCED BODY IS NOT A PARAGRAPH (CARVE-P0-013). A bare fence run at the
      // descendant's own column is its opener or its closer, and neither leaves
      // a paragraph open - an absorbed opener is paragraph text and never
      // reaches here, because the caller answers it first.
      text.trim() !== '' && !PURE_FENCE.test(text) &&
      opensParagraph(text, true, rowOpen,
        rowOpen ? null : (memo ?? (idx >= 0 ? prefixMemo(state, lines, idx).paragraph : null)))
    /*
     * Q1 AT THE DEEPEST FRAME -- CARVE-P0-009, the one-line rule. A below-column
     * line continues a paragraph if and only if one is open at the deepest
     * frame; otherwise it closes the list and begins a new block. This item's
     * own `openPara` answers only while this item IS the deepest frame.
     */
    const deepestParagraphOpen = () => {
      if (!paragraphIsOpen()) return false
      if (bodyQuote.at === i - 1 && bodyQuote.open &&
          !COLON_CLOSER.test(QUOTE.exec(ind(i - 1)?.rest ?? '')?.[1] ?? '')) return true
      // An authored block the block reader has already ended holds nothing
      // open for the line below (a description ending on a code block).
      if (!deepestIsDescendant && authoredContainer && authoredBlockLimit !== null && i >= authoredBlockLimit) return false
      if (!deepestIsDescendant) {
        // The authored extent can include a lazy-looking line after a closed
        // nested block. At a below-column line, ask the body's last block
        // whether it still has a paragraph to fold into.
        const tail = indentCols(itemLines.at(-1) ?? '').rest
        if (authoredContainer && ind(i)?.col < contentCol &&
            (PURE_FENCE.test(tail) || !opensParagraph(tail, true)) &&
            bodyLeavesNoParagraphAt(itemLines, itemLines.length - 1)) return false
        return true
      }
      const d = descendantQ1At(descendantQ1.col)
      return d === null ? true : d.open
    }
    // The quote run the deepest descendant holds, read like the item's own.
    const descendantQuote = { at: -2, open: false, table: false, hosts: [], para: [] }
    const seedDescendantQ1 = (col, text, memo = null, idx = -1) => {
      descendantQ1.col = col
      descendantQuote.at = -2
      // A quote behind further markers (`- > - x`) starts the run the lines below continue.
      const quoted = idx >= 0 && text !== '' ? markerQuoteText(text, prefixMemo(state, lines, idx).markerQuote ??= new Map()) : null
      descendantQ1.open = text !== '' && (quoted !== null
        ? advanceQuoteRun(descendantQuote, quoted, idx)
        : descendantLineOpensParagraph(text, false, -1, memo))
      descendantQ1.para = descendantQ1.open ? [text] : []
      descendantQ1.absorbedFence = null
      descendantQ1.noteCol = null
    }
    /*
     * One line the descendant takes. `text` is already in the descendant's
     * coordinates. A blank closes its paragraph, the SS12 rule this collector
     * applies to its own; anything else extends it, which is what makes an
     * absorbed opener readable at all.
     */
    const advanceDescendantQ1 = (text, absorbed, verbatim = false, idx = -1, lineCol = -1) => {
      if (descendantQ1.col < 0) return
      const close = () => { descendantQ1.open = false; descendantQ1.para = [] }
      const checkNote = descendantQ1.noteCol !== null || text.includes('[^')
      let noteContent = null
      let noteLineColumn = -1
      if (checkNote) {
        let noteText = text
        let quoteWidth = 0
        while (QUOTE.test(noteText)) {
          const quote = QUOTE.exec(noteText)
          quoteWidth += noteText.length - (quote[1] ?? '').length
          noteText = quote[1] ?? ''
        }
        noteContent = indentCols(noteText)
        noteLineColumn = lineCol + quoteWidth + noteContent.col
      }
      // A footnote body takes a lazy line like every container (carve#3885):
      // its marker line starts a paragraph with the note's own content.
      if (lineCol >= 0 && noteContent && FOOTNOTE_DEF.test(noteContent.rest)) {
        close()
        text = FOOTNOTE_DEF.exec(noteContent.rest)[2]
      }
      if (text.trim() === '') { close(); descTableOpen = false; return }
      // A marker-line opener is not an absorbed opener when this is its closer.
      const markerCloser = markerLineFence && PURE_FENCE.exec(text)
      if (markerCloser && markerCloser[1][0] === markerLineFence.run[0] &&
          markerCloser[1].length >= markerLineFence.run.length &&
          idx >= 0 && indentCols(lines[idx]).col - contentCol === markerLineFence.col) {
        markerLineFence = null
        close()
        return
      }
      // An ABSORBED opener is paragraph text, so it extends the paragraph that
      // absorbed it rather than closing anything. With no paragraph open there
      // is nothing to absorb it: `- - ``` ` / `    ``` ` closes an empty code
      // block, and the item holds no paragraph for the line below.
      if (absorbed) {
        descendantQ1.absorbedFence = absorbed
        if (descLive && deepestIsDescendant) {
          descendantQ1.open = true
          descendantQ1.para.push(text)
        }
        return
      }
      // A VERBATIM PAYLOAD IS OPAQUE (PART 0), so it may not touch the colon or
      // table state: a `::: note` written inside a code fence is text, and
      // counting it as a container opener left a depth the closer never cleared
      // (raised by codex review). A VERBATIM BODY IS ALSO NOT A PARAGRAPH
      // (CARVE-P0-013), so the answer here is the same either way.
      if (verbatim) { close(); return }
      const rowOpen = descTableOpen
      descTableOpen = tableRunStep(rowOpen, text)
      // A colon container's blocks sit at the container's own column, which a
      // line below the descendant cannot reach.
      const opener = isColonBlockOpener(text) && !COLON_CLOSER.test(text)
      const closer = COLON_CLOSER.test(text)
      if (opener) descColon++
      else if (closer && descColon > 0) descColon--
      if (opener || closer || descColon > 0) { close(); return }
      // A quote's last block answers across its lines, as at the item's own column.
      const opens = idx >= 0 && QUOTE.test(text)
        ? advanceQuoteRun(descendantQuote, text, idx)
        : descendantLineOpensParagraph(text, rowOpen, idx)
      if (!opens) { close(); return }
      if (!descendantQ1.open) { descendantQ1.open = true; descendantQ1.para = [] }
      descendantQ1.para.push(text)
    }
    // Readable at the column the descendant owns, and nowhere else: asking
    // outside that column is the conflation this state exists to end.
    const descendantQ1At = (col) => descendantQ1.col >= 0 && col >= descendantQ1.col
      ? { open: descendantQ1.open, para: [...descendantQ1.para], absorbedFence: descendantQ1.absorbedFence }
      : null
    // SEED. `- - :::d` puts `:::d` in the descendant before this collector reads
    // a single body line; `para`'s first line here is the raw `- - :::d`, whose
    // `- - ` is MARKERS rather than indentation, so no dedent recovers it. That
    // is the second gap carve#2746 measured, and the seed is what closes it.
    if (headSubMarker) {
      // The SAME memoized peel the marker-line seed above uses: without it the
      // suffix is re-walked at every nesting depth, which is quadratic on a
      // line of stacked markers (tests/container-differential.test.mjs).
      seedDescendantQ1(headSubCol, headSubMarker.text, prefixMemo(state, itemLines, 0).paragraph, i)
      descLive = true
    }
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
    let heldContainerEnd = -1
    const descriptionBodyColumns = []
    // Whether that block is a container (a quote or a definition list), whose
    // own last block answers for the line below once the block has ended.
    let authoredContainer = false
    // At the item's own column this base strips exactly what the item would.
    // Its end matters only when another opener could establish a different
    // scope. Defer the extent parse until then; a comment before a nested list
    // otherwise reparses the remaining ladder at every level (carve#2542).
    let pendingAuthoredBlock = null
    let pendingHeadQuote = head.text[0] === '>' && (head.text.length === 1 || head.text[1] === ' ') && paragraphIsOpen() ? i : null
    // A term on the marker line folds the lines past the content column that
    // follow it (carve#2411), so none of them opens an authored base.
    let leadTerm = DEFLIST_TERM.test(head.text.replace(/^[ \t]+/, ''))
    let pendingHeadTerm = DEFLIST_TERM.test(head.text) ? i : null
    const measureHeadTerm = () => {
      const candidate = [head.text]
      for (let at = headIndex + 1; at < lines.length; at++) {
        const measured = ind(at)
        if (measured.col <= baseIndent && matchMarkerAt(measured)) break
        // A refused `+` ends the term's authored block at its source column.
        // Rebasing it into `candidate` would make the next line look flush-left.
        if (measured.col === contentCol && CONT_MARKER.test(measured.rest) &&
            !attachesFlushLeft(ind(at + 1))) break
        if (isBlank(lines[at]) && at + 1 < lines.length && !isBlank(lines[at + 1]) &&
          ind(at + 1).col < contentCol) break
        candidate.push(measured.col < contentCol
          ? lines[at] : dedentMeasured(measured, lines[at], contentCol).text)
      }
      authoredBlockLimit = headIndex + authoredBlockEnd(candidate, 0, 0, state)
      authoredContainer = true
      pendingHeadTerm = null
    }
    const insideFence = () => fence.opaque !== null || fence.colon.length !== 0
    // Which open colon containers are line blocks: their payload is inline, so
    // a span in it pairs wherever its lines start (ruled on carve-php#3137).
    const colonLineBlock = []
    const colonBases = []
    const payloadCloserSearches = new Map()
    const trackFence = (line, opens, index) => {
      if (fence.opaque) {
        if (fence.opaque.kind === 'code') {
          const c = PURE_FENCE.exec(fence.opaque.payload ? line.replace(/^[ \t]+/, '') : line)
          if (c && c[1][0] === fence.opaque.run[0] && c[1].length >= fence.opaque.run.length) {
            fence.opaque = null
          }
        } else {
          // INDENTATION IS NOT PART OF THE COMMENT DELIMITER. `comment_block_open`
          // and `comment_block_close` each carry a `[whitespace]` slot, so the
          // length match compares `%` runs and an indented closer closes an
          // indented opener. COMMENT_FENCE_BODY here refused one, while the pass
          // that decides the span EXISTS (`commentFenceCloserAhead`) accepted it,
          // so a closer past the block's base cleared nothing: the span latched to
          // the end of the item, the blank below it read as fence content, and the
          // item came out TIGHT where the flush spelling of the same document is
          // LOOSE (carve#2471).
          const c = COMMENT_FENCE.exec(line)
          if (c && c[1].length === fence.opaque.run.length) fence.opaque = null
        }
        return
      }

      const payload = fence.colon.length !== 0 && colonLineBlock.at(-1) === true
      const unindented = payload ? line.replace(/^[ \t]+/, '') : line
      const code = FENCE.exec(unindented)
      if (code && parseFenceInfo(code[2]) !== null) {
        const payloadCloser = payload ? cachedForwardSearch(payloadCloserSearches, `${contentCol}:${code[1]}`, index + 1, lines.length, (at) => {
          const measured = ind(at)
          const marker = matchMarkerAt(measured)
          if (marker && marker.indent <= baseIndent) return null
          if (at > index + 1 && isBlank(lines[at - 1]) && measured.rest !== '' && measured.col < contentCol) return null
          const close = PURE_FENCE.exec(measured.rest)
          return !!(close && close[1][0] === code[1][0] && close[1].length >= code[1].length)
        }) : -1
        // A paired payload run shields inline delimiters but owns no fence.
        if (payload && (payloadCloser < 0 || ind(payloadCloser).col < ind(index).col)) return
        fence.opaque = { kind: 'code', run: code[1], opens, payload }
        return
      }
      if (payload && !COLON_CLOSER.test(line)) return
      const comment = COMMENT_FENCE_BODY.exec(unindented)
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
        if (fence.colon.length !== 0 && len === fence.colon[fence.colon.length - 1]) {
          fence.colon.pop()
          colonLineBlock.length = fence.colon.length
          colonBases.length = fence.colon.length
        } else if (!payload) {
          fence.colon.push(len)
          colonLineBlock[fence.colon.length - 1] = false
          colonBases[fence.colon.length - 1] = Math.max(contentCol, indentCols(lines[index]).col)
        }
        return
      }
      if (payload) return
      const colon = COLON_FENCE.exec(line)
      const opener = colon && parseColonOpener(colon[2])
      if (opener) {
        fence.colon.push(colon[1].length)
        colonLineBlock[fence.colon.length - 1] = opener.mode === 'line-block'
        colonBases[fence.colon.length - 1] = Math.max(contentCol, indentCols(lines[index]).col)
      }
    }
    // A verbatim body a DESCENDANT container opened. `fence` tracks the item's
    // OWN column, because that is where its closer has to be written, so an
    // indented fence reached no branch here at all and its payload read as
    // paragraph text: a below-base run then took S4's LAZY branch and stayed
    // fence content at depth two and deeper (carve#2490). The owner table
    // carries no depth term, so this records the same fact one or more levels
    // in. `%%%` is excluded by the family 1 ruling and FENCE spells only the
    // backtick and tilde kinds, the `=html` raw form among them.
    let nestedOpaque = null
    // The follower must be measured at the marker's source column. Column
    // zero here is the nested body's rebased column, not its marker column.
    const refusedNestedMarker = (at, measured = ind(at)) => {
      if (state.markerFenceProbeSteps !== undefined) state.markerFenceProbeSteps++
      return nestedOpaque?.kind === 'code' && CONT_MARKER.test(measured.rest) &&
        measured.col === (nestedOpaque.hostCol ?? nestedOpaque.col) &&
        (at + 1 === n || isBlank(lines[at + 1]) ||
          !attachesFlushLeft(ind(at + 1), measured.L?.col ?? measured.col))
    }
    const nextFenceVisible = (at) => {
      at = nextVisible(at)
      while (at < n && refusedNestedMarker(at)) {
        skipped.add(at)
        at = nextVisible(at + 1)
      }
      return at
    }
    // A comment span whose OPENER is written below every content column. The
    // tracker above reads lines at the item's own column, so it never saw that
    // opener and recorded no span: the closer then arrived as a fresh comment
    // and answered with the column it was written at instead of the column the
    // span sits at (carve#2526). One run is remembered and the first
    // matching-width run at any column clears it, which is O(1) per line.
    let belowSpan = null
    let belowSpanClosed = false
    // §10 I4 for such a fence: at block start it runs to the end of its
    // container, after a paragraph only when a closer follows at its own
    // column. A run indented past that column is payload (CARVE-P2-006).
    // A descendant COMMENT span is carried for one reason: `%%%` is excluded
    // from the family 1 ruling by name, so it ends nothing here, but a
    // fence-shaped line in its PAYLOAD is not an opener. Reading one as an
    // opener published an empty code block and pushed the item's trailing line
    // out of the list. `bodyHoldsOpenCommentSpan` answers the same question and
    // is the wrong instrument HERE: it rescans the collected body, and asking it
    // per fence line made a ladder of fenced bodies quadratic
    // (tests/nested-container-rescan.test.mjs). This is `trackFence`'s own
    // construction in the descendant's coordinates instead, O(1) per line.
    const nestedVerbatim = () => nestedOpaque !== null && nestedOpaque.kind === 'code'
    // Cache marker suffixes across recursive reads of the same physical line.
    // Otherwise a stacked marker line is walked again at every item depth.
    // All openers in this source array share one delimiter index, so unmatched
    // siblings do not each scan the remaining document.
    const lastCommentCloser = (run) => {
      const arrays = state.markerCommentClosers ??= new WeakMap()
      let closers = arrays.get(lines)
      if (!closers) {
        closers = new Map()
        for (let k = 0; k < lines.length; k++) {
          const end = COMMENT_FENCE.exec(lines[k])
          if (end) closers.set(end[1].length, k)
        }
        arrays.set(lines, closers)
      }
      return closers.get(run.length) ?? -1
    }
    const markerComment = (text, idx, col = 0) => {
      const memo = prefixMemo(state, lines, idx).markerComment ??=
        new Map()
      const path = []
      let summary
      for (;;) {
        if (memo.has(text.length)) { summary = memo.get(text.length); break }
        const measured = text[0] === ' ' || text[0] === '\t'
          ? indentCols(text) : { col: 0, rest: text }
        const marker = matchMarkerAt(measured)
        if (!marker) {
          const run = COMMENT_FENCE_BODY.exec(measured.rest)
          summary = run ? { run: run[1], col: 0, markers: 0 } : null
          memo.set(text.length, summary)
          break
        }
        path.push({ length: text.length, width: marker.indent + marker.markerWidth })
        text = marker.text
      }
      for (let k = path.length - 1; k >= 0; k--) {
        if (summary) summary = { ...summary, col: summary.col + path[k].width, markers: summary.markers + 1 }
        memo.set(path[k].length, summary)
      }
      if (!summary?.markers) return null
      return lastCommentCloser(summary.run) > idx
        ? { kind: 'comment', run: summary.run, markerLine: true, col: col + summary.col }
        : null
    }
    // An opener in the body holds a span only while its closer is still to
    // come: without one it is the line form (CARVE-P9-053, carve#2950).
    const bodyHoldsLiveCommentSpan = () =>
      bodyHoldsOpenCommentSpan(itemLines, (run) => lastCommentCloser(run) >= i)
    // A descendant span cannot carry payload across a shallower block. Its
    // closer still pairs by run length at any column.
    const commentHoldsLine = (span, measured) => span?.kind === 'comment' &&
      (measured.col >= span.col || measured.rest.startsWith('%%'))
    // Set by `trackNestedFence` for the one line it is reading, drained by the
    // caller into the descendant's Q1 state. A return value cannot carry it:
    // the function's `null` is load-bearing (carve#2746).
    let absorbedFenceSeen = null
    // §17 L3: the block a descendant's `+` attaches is the descendant's, so it ends no sublist.
    const nestedAttachmentTakes = (lm) => carriesBareContinuation && (i < nestedAttachmentEnd ||
      nestedAttachmentEnd < 0 && attachesFlushLeft(lm, (lm.L?.col ?? lm.col) === 0 && !matchMarkerAt(lm) ? 0 : nestedAttachmentColumn))
    const trackNestedFence = (open, dmeas, sourceCol, idx, descendantOwned) => {
      if (open) {
        if (open.kind === 'comment') {
          // Indentation is part of neither delimiter (§28, carve#2471), so the
          // closer matches on run length at any column.
          const end = COMMENT_FENCE.exec(dmeas.rest)
          if (end && end[1].length === open.run.length) return null
          if (!commentHoldsLine(open, dmeas)) return null
          return open
        }
        // A line BELOW the fence's own column supplies none of its body's
        // indentation, so the body has ended whatever follows it - the rule
        // this whole branch rests on, applied to the body itself. Without it
        // the state outlived its container and `- a` / `  - b` / blank /
        // `    ``` ` / `    p` / `  x` / `y` closed the outer item's paragraph
        // and put `y` outside the list.
        if (dmeas.col < open.col) return null
        const c = dmeas.col === open.col ? PURE_FENCE.exec(dmeas.rest) : null
        return c && c[1][0] === open.run[0] && c[1].length >= open.run.length ? null : open
      }
      if (fence.opaque) return null
      const markerSpan = markerComment(dmeas.rest, idx, dmeas.col)
      if (markerSpan) return markerSpan
      // A fence on a sublist's marker line opens at a block start (§10 I4), so
      // its body is the descendant's verbatim body like any other (CARVE-P0-013).
      if (matchMarkerAt(dmeas)) {
        const lead = markerFenceSummary(dmeas.rest, prefixMemo(state, lines, idx).markerFence ??= new Map())
        if (lead) return { kind: 'code', run: lead.run, col: dmeas.col + lead.col, markerLine: true }
      }
      if (dmeas.col === 0 || !descendantOwned) return null
      const comment = COMMENT_FENCE_BODY.exec(dmeas.rest)
      if (comment) {
        return commentFenceCloserAhead(lines, idx, comment[1])
          ? { kind: 'comment', run: comment[1], col: dmeas.col }
          : null
      }
      const f = FENCE.exec(dmeas.rest)
      if (!f || parseFenceInfo(f[2]) === null) return null
      return { kind: 'code', run: f[1], col: dmeas.col }
    }
    // Only a below-column comment grants a continuation claim after closure.
    let afterComment = false
    // The run of a code fence opened while an absorbed opener is still tracked.
    let fenceUnderAbsorbed = null
    // The quote run at this item's content column: its last line's index, and
    // whether that line left the quote a paragraph or a table open.
    const bodyQuote = { at: -2, open: false, table: false, hosts: [], para: [] }
    const advanceBodyQuote = (text, idx) => advanceQuoteRun(bodyQuote, text, idx)
    // Seed from an open-paragraph head only when a marked line follows; a
    // single-line nest would otherwise re-walk every level (quadratic).
    if (QUOTE.test(head.text) && (!paragraphIsOpen() || QUOTE.test(stripIndent(lines[headIndex + 1] ?? '')))) {
      advanceBodyQuote(head.text, headIndex)
    }
    {
      // A fence can open on the MARKER LINE (`- ``` `), where its opener is the
      // marker-line content, not a collected continuation line -- seed from it.
      trackFence(head.text, true, i)
      // A comment span spelled there is the item's FIRST block (CARVE-P0-007,
      // which lists `- %% c` / `tail` as ending the item), so it retains no
      // ownership for a below-column follower - the marker-line `%%` spelling
      // already answers that way and the two spellings stay together.
      if (fence.opaque?.kind === 'comment') fence.opaque.markerLine = true
      else {
        nestedOpaque = markerComment(head.text.trimStart(), i)
        const lead = markerFenceSummary(head.text, prefixMemo(state, lines, i).markerFence ??= new Map())
        if (!nestedOpaque && headSubMarker && lead) nestedOpaque = { kind: 'code', run: lead.run, col: lead.col, hostCol: contentCol + lead.hostCol, markerLine: true }
      }
    }
    i++
    // FIRST-BLOCK form starts the item body at its opener column (SS17 L4).
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
    if (trimWs(head.text) === '+') {
      itemLines.length = 0
      itemMeas.length = 0
      if (itemOrigins) itemOrigins.length = 0
      // The memo carried for the `+` head must not answer for the line that now opens the body.
      state.prefixMemos?.get(itemLines)?.delete(0)
      attachNext = true
      closePara()
    }
    const attachFlushLeft = () => {
      const attachmentCol = attachNext ? (ind(headIndex).L?.col ?? ind(headIndex).col) : sourceMarkerCol
      const follower = ind(i)
      const followerCol = follower?.L?.col ?? follower?.col
      const firstBlockAtZero = attachNext && attachmentCol > 0 && followerCol === 0 &&
        !matchMarkerAt(follower)
      const firstBlockAtContent = attachNext && follower?.col >= contentCol &&
        !matchMarkerAt(follower)
      if (i >= n || isBlank(lines[i]) ||
          (!firstBlockAtZero && !firstBlockAtContent && !attachesFlushLeft(follower, attachmentCol))) return false
      // A same-column item is a sibling, never the attached block (PART 9 §17).
      if (matchMarkerAt(follower)?.indent === baseIndent) return false
      const blockColumn = firstBlockAtZero ? 0 : firstBlockAtContent ? followerCol : attachmentCol
      const closesColon = fence.colon.length > 0
      if ((fence.opaque?.kind === 'code' && fence.opaque.opens !== false) || closesColon) {
        const bounds = state.attachmentBoundaries ??= new WeakMap()
        const indices = bounds.get(itemLines) ?? []
        indices.push(itemLines.length)
        bounds.set(itemLines, indices)
        fence.opaque = null
        fence.colon.length = 0
      }
      if (!closesColon && nestedOpaque?.kind !== 'code' &&
          (insideFence() || !bodyHasOpenCodeFence(itemLines, residueFence, itemLines.length, (k) => itemMeas[k], hasFutureCommentCloser))) {
        pushLine('', BLANK_MEAS)
      }
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
      let end = attachedBlockEnd(lines, i, state, (idx) =>
        ind(idx).rest === '' || CONT_MARKER.test(lines[idx]) ||
        matchMarkerAt(ind(idx))?.indent === baseIndent, ind(i), blockColumn, Math.min(ind(i).col, blockColumn))
      const attached = lines.slice(i, end)
      const codeMatch = FENCE.exec(attached[0] ?? '')
      const code = codeMatch && parseFenceInfo(codeMatch[2]) !== null ? codeMatch : null
      const colon = COLON_FENCE.exec(attached[0] ?? '')
      const unclosedAttached = code && i + 1 < n && !hasCloser(lines.slice(i), 0) && !lines.slice(i).some(isBlank)
      if (unclosedAttached) end = n
      const captionable = code ? hasCloser(attached, 0) : colon && isFigureGroupOpener(parseColonOpener(colon[2])) && COLON_CLOSER.test(attached.at(-1) ?? '')
      if (captionable && CAPTION.test(lines[end] ?? '')) end++
      const taken = []
      for (; i < end; i++) {
        // Measure the attached block from the marker column. `blockColumn` is a
        // source column; a nested item's lines are measured from its parent's.
        const measured = ind(i)
        const shift = (measured.L?.col ?? measured.col) - measured.col
        const body = dedentMeasured(measured, lines[i], Math.max(0, blockColumn - shift))
        pushLine(body.text, body.meas)
        taken.push(body.text)
      }
      // A separator after a fence the block leaves open would be its payload.
      if (!leavesFenceOpen(taken)) pushLine('', BLANK_MEAS)
      // Below the content column the blank after the block is the host's
      // separator, not payload of a fence the block leaves open (SS17 L3).
      else if (blockColumn < contentCol) {
        const bounds = state.attachmentBoundaries ??= new WeakMap()
        bounds.set(itemLines, [...(bounds.get(itemLines) ?? []), itemLines.length])
      }
      closePara()
      return true
    }
    // ONE block (SS17 L3, carve#1290). When the first-block form has taken its
    // block here, the carry below must not take a SECOND one: `- +` / `para` /
    // `> q` attaches the paragraph and leaves the quote outside the item.
    if (attachNext && attachFlushLeft()) carriesBareContinuation = false
    // A sublist at the content column is the `+`'s one block, so a later
    // flush-left block closes the item (SS17 L3).
    else if (attachNext && i < n && matchMarkerAt(ind(i))?.indent >= contentCol) {
      spentOnSublist = true
      nestedAttachmentEnd = attachedBlockEnd(lines, i, state, (idx) =>
        ind(idx).rest === '' || CONT_MARKER.test(lines[idx]) ||
        matchMarkerAt(ind(idx))?.indent === baseIndent, ind(i), ind(i).col, ind(i).col)
    }
    // End of a wrapped block-attribute line, inclusive. Attribute lines are
    // interrupters whether they occupy one physical line or several; each
    // continuation line therefore leaves no paragraph available for a later
    // below-column lazy continuation.
    let wrappedAttrEnd = -1
    let fenceBlankRun = 0
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
    let paragraphOpenBeforeComments = false
    let markedQuoteCommentClaim = false
    let captureParagraphState = true
    // Keep a marker-line note's comment at its authored body column, including
    // a terminated span. A comment-shaped line inside its code fence is payload.
    let markerNoteCommentEnd = -1
    let markerNoteCommentSeen = false
    while (i < n) {
      if (captureParagraphState) paragraphOpenBeforeComments = deepestParagraphOpen()
      const line = lines[i]
      // `+` at the item's marker column attaches one block there (SS17 L3/L4).
      const lm = ind(i)
      // Measure a descendant's first attached block before the ordinary
      // content-column branch collects it. Otherwise only a later root block
      // reaches the below-column attachment branch and becomes the candidate.
      if (carriesBareContinuation && nestedAttachmentEnd < 0 && lm.rest !== '' &&
          !matchMarkerAt(lm) &&
          (lm.col >= contentCol || attachesFlushLeft(lm, nestedAttachmentColumn))) {
        const column = lm.col >= contentCol ? lm.col : nestedAttachmentColumn
        nestedAttachmentEnd = attachedBlockEnd(lines, i, state, (idx) =>
          ind(idx).rest === '' || CONT_MARKER.test(lines[idx]) ||
          [baseIndent, nestedSiblingIndent].includes(matchMarkerAt(ind(idx))?.indent), lm, column, Math.min(lm.col, column))
      }
      // The descendant's sibling marker closes it, and its spent `+` with it.
      if (nestedAttachmentEnd === i && nestedSiblingIndent >= 0 && matchMarkerAt(lm)?.indent === nestedSiblingIndent) {
        carriesBareContinuation = false
        nestedAttachmentEnd = -1
        nestedSiblingIndent = -1
      }
      // A descendant's first-block marker has spent its one attached block.
      // A later line at this item's marker column belongs to the enclosing
      // frame, unless it is a new continuation marker for this item.
      if (nestedAttachmentEnd >= 0 && i >= nestedAttachmentEnd &&
          lm.rest !== '' && lm.col <= baseIndent &&
          !CONT_MARKER.test(lm.rest) && !(spentOnSublist && deepestParagraphOpen() && (foldablePlainLine(lm.rest) || DESCRIPTION_TEXT.test(lm.rest) ||
            isCodeBlockOpener(lm.rest) && !hasCloser(lines.slice(i), 0)))) break
      if (i <= wrappedAttrEnd) {
        const body = dedentMeasured(lm, line, contentCol)
        pushLine(body.text, body.meas)
        closePara()
        i++
        continue
      }
      if (lm.rest !== '' && !insideFence() && !nestedVerbatim()) {
        while (descriptionBodyColumns.length && lm.col < descriptionBodyColumns.at(-1)) descriptionBodyColumns.pop()
        const description = /^:( +)(?=[ \t]*[^ \t])/.exec(lm.rest)
        if (description && lm.col >= contentCol) descriptionBodyColumns.push(lm.col + 1 + description[1].length)
      }
      if (markerNoteEligible && i > noteFenceEnd && lm.col >= markerNoteBodyColumn &&
          COMMENT_LINE.test(lm.rest) && !insideFence()) markerNoteCommentSeen = true
      if (markerNoteEligible && i > noteFenceEnd && i > markerNoteCommentEnd && lm.col >= markerNoteBodyColumn &&
          COMMENT_FENCE_BODY.test(lm.rest) && !insideFence()) {
        const comment = classifyLayoutComment(lines, i)
        if (comment?.kind === 'fenced_comment') markerNoteCommentEnd = comment.end - 1
      }
      // Item content below the note body ends the note's list ownership.
      if (noteListBodyColumn !== null && lm.rest !== '' &&
          lm.col >= contentCol && lm.col < noteListBodyColumn && !insideFence()) {
        noteTailList = false
        noteListBodyColumn = null
        noteListChildColumn = null
      }
      if (i > noteFenceEnd && ((FOOTNOTE_DEF.test(lm.rest) && lm.col < markerNoteBodyColumn) ||
          (lm.rest !== '' && lm.col < markerNoteBodyColumn && !insideFence()))) {
        markerNoteEligible = false
        noteMarkerSeen = false
      }
      const commentLine = fence.opaque?.kind === 'comment' || nestedOpaque?.kind === 'comment' ||
        (belowSpan !== null && lastCommentCloser(belowSpan.run) >= i) || lm.rest.startsWith('%%')
      captureParagraphState = !commentLine
      if (!commentLine && lm.rest === '') paragraphOpenBeforeComments = false
      if (CONT_MARKER.test(lm.rest) && lm.col === contentCol && subCol >= 0) closePara()
      if (nestedOpaque?.kind === 'code' && CONT_MARKER.test(lm.rest) &&
          lm.col === (nestedOpaque.hostCol ?? nestedOpaque.col) &&
          (i + 1 === n || isBlank(lines[i + 1]) ||
            !attachesFlushLeft(ind(i + 1), lm.L?.col ?? lm.col))) {
        skipped.add(i)
        i++
        continue
      }
      if (CONT_MARKER.test(lm.rest) && lm.col === baseIndent) {
        if ((fence.opaque?.kind === 'code' ||
            (nestedOpaque?.kind === 'code' && (nestedOpaque.hostCol ?? nestedOpaque.col) === lm.col)) &&
            (i + 1 === n || isBlank(lines[i + 1]))) {
          skipped.add(i)
          i++
          continue
        }
        const plusRow = i++
        if (attachFlushLeft()) continue
        // §17 L3: a refused `+` is never dropped; it folds into the open paragraph.
        if (paragraphIsOpen()) {
          i = plusRow
          pushLine(lazyFrame('+'), LAZY_MEAS('+'))
          i++
        }
        if (i < n && !isBlank(lines[i]) && (ind(i).L?.col ?? ind(i).col) < sourceMarkerCol) break
        continue
      }
      if (CONT_MARKER.test(lm.rest) && lm.col >= contentCol && nestedOpaque?.kind === 'code' &&
          lm.col <= Math.max(nestedOpaque.col, contentCol)) {
        // §17 L3 and PART 0 O1: pass a descendant's attachment through every ancestor.
        carriesBareContinuation = i + 1 < n && foldablePlainLine(ind(i + 1).rest)
      }
      if (lm.rest !== '') fenceBlankRun = 0
      if (line.startsWith(LAZY)) {
        // a lazy line from an OUTER context propagates to the deepest open
        // paragraph (PART 9 SS10 I2)
        if (!paragraphIsOpen()) break
        pushLine(line, lm)
        i++
        continue
      }
      if (lm.rest === '') {
        if (!insideFence()) leadTerm = false
        // A blank line INSIDE any open fence is fence content: keep it in the
        // item body and stay tight (no looseness decision).
        if (insideFence()) {
          fenceBlankRun++
          const dd = dedentMeasured(lm, line, authoredBlockBase ?? contentCol)
          pushLine(dd.text, dd.meas)
          // An absorbed fence is paragraph text. A blank before the next
          // paragraph makes the item loose even while the inline span is open.
          if (fence.opaque?.opens === false && subCol < 0 && headSubCol < 0) {
            const next = i + 1 < n ? ind(i + 1) : null
            if (next && next.col >= contentCol && !isDefinitionOrAttributeLine(next.rest) && foldablePlainLine(next.rest) &&
                !opensSubBlock(next.rest)) list.tight = false
          }
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
            const nextIndex = nextFenceVisible(i + 1)
            const next = nextIndex < n ? ind(nextIndex) : null
            if (next && next.rest !== '') {
              const km = matchMarkerAt(next)
              if (km && km.indent === baseIndent && sameAxes(list, km)) {
                if (fenceBlankRun >= 3) {
                  hardListBoundary = true
                  i++
                  break
                }
                list.tight = false
              }
            }
          }
          i++
          continue
        }
        // decide with the NEXT content line
        let j = nextFenceVisible(i + 1)
        while (j < n) {
          if (ind(j).rest === '') { j = nextFenceVisible(j + 1); continue }
          const candidate = ind(j)
          if (refusedNestedMarker(j, candidate)) {
            skipped.add(j)
            j = nextVisible(j + 1)
            continue
          }
          break
        }
        const nextCloser = j < n && nestedOpaque?.markerLine && ind(j).col >= nestedOpaque.col
          ? PURE_FENCE.exec(ind(j).rest) : null
        const closedMarkerFence = nestedOpaque?.kind === 'code' && nestedOpaque.markerLine &&
          nextCloser && nextCloser[1][0] === nestedOpaque.run[0] && nextCloser[1].length >= nestedOpaque.run.length
        const unfinishedDescendantFence = nestedOpaque?.kind === 'code' &&
          !CONT_MARKER.test(lines[previousVisible(i - 1)] ?? '') &&
          (j >= n || ind(j).col < contentCol ||
            (ind(j).col === contentCol && !CONT_MARKER.test(ind(j).rest) &&
              ind(j).rest !== state.ordinaryPlusSentinel &&
              ind(j).rest !== state.refusedSiblingSentinel))
        const descendantFence = bodyHasOpenCodeFence(itemLines, residueFence, itemLines.length, (k) => itemMeas[k], hasFutureCommentCloser) || unfinishedDescendantFence
        if (descendantFence || closedMarkerFence) {
          // A descendant fence owns the full blank run, including one before
          // its closer. An unfinished fence also owns the run at its boundary.
          for (let k = i; k < j; k++) {
            if (skipped.has(k)) continue
            const dd = dedentMeasured(ind(k), lines[k], authoredBlockBase ?? contentCol)
            pushLine(dd.text, dd.meas, k)
          }
        }
        // A descendant's attached fence runs through its closer (SS17 L3).
        if (carriesBareContinuation && j < nestedAttachmentEnd) {
          if (!descendantFence && !closedMarkerFence) for (let k = i; k < j; k++) if (!skipped.has(k)) pushLine('', BLANK_MEAS)
          i = j
          continue
        }
        if (j >= n) { i = j; break }
        const jm = ind(j)
        const { col } = jm
        const nm = matchMarkerAt(jm)
        if (nestedOpaque?.kind === 'code' && CONT_MARKER.test(jm.rest) &&
            jm.col >= contentCol && jm.col <= Math.max(nestedOpaque.col, contentCol)) {
          // §17 L3: a descendant's marker ends its fence after every blank payload line.
          for (let k = i; k < j; k++) pushLine('', BLANK_MEAS)
          // The attached block follows a blank in this item's child, so its
          // own paragraph is loose even when the follower is not a sibling.
          if (jm.col === contentCol) list.tight = false
          i = j
          continue
        }
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
          // `sameAxes` is what makes it a BOUNDARY rather than a repeat of §11
          // N1's ordinary split: a marker on different axes already opened a
          // different list, and there is nothing for the run to separate.
          if (visibleDistance(i, j) >= 3 && sameAxes(list, nm)) {
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
          if (pendingHeadTerm !== null) measureHeadTerm()
          if (authoredContainer && pendingAuthoredBlock !== null) {
            authoredBlockLimit = authoredBlockEnd(lines, pendingAuthoredBlock, contentCol, state)
            pendingAuthoredBlock = null
          }
          // A paragraph inside a held container is not the item's own
          // second paragraph (PART 9 section 17 L1, carve#2988).
          if (authoredContainer && (descriptionBodyColumns.some(body => col >= body) ||
              j < heldContainerEnd ||
              authoredBlockLimit !== null && j < authoredBlockLimit)) {
            if (!descendantFence && !closedMarkerFence) pushLine('', BLANK_MEAS)
            closePara()
            i = j
            continue
          }
          const jReach = reachOf(jm, lines[j])
          if (headSubActive && jReach < headSubCol &&
              (opensAuthoredBase(jm.rest) || jReach >= headSubCol - headSubMarker.markerWidth && DEFLIST_SEPARATOR.test(jm.rest)) &&
              !COMMENT_LINE.test(jm.rest)) headSubActive = false
          if (!commentBelowChild && ((subCol >= 0 && jReach >= subCol) || (headSubActive && jReach >= headSubCol))) {
            // Content at or past the first sub-list's content column belongs to
            // the SUB-LIST, not this item -- a blank inside the sub-list must
            // not loosen this (ancestor) item (carve#322). Attach, stay tight;
            // the recursive parse of itemLines decides the sub-list's looseness.
            //
            if (!descendantFence && !closedMarkerFence) {
              const blanks = CAPTION.test(jm.rest) ? visibleDistance(i, j) : 1
              for (let k = 0; k < blanks; k++) pushLine('', BLANK_MEAS)
            }
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
          // Measured from the base the definition was read at: an opener in its
          // body sits past that base and must not be measured from its own column.
          const defBase = authoredBlockLimit !== null && j >= authoredBlockLimit ? null : authoredBlockBase ?? contentCol
          // An open note owns a line at its body column, whatever block its body ended with.
          const noteBodyLine = noteFrames.some(frame => jm.col >= frame.body)
          if (noteBodyLine || (defBodyIndent !== null && defBase !== null && jm.col - defBase >= defBodyIndent + FOOTNOTE_BODY_COLUMN)) {
            const defBody = defBodyIndent
            if (!descendantFence && !closedMarkerFence) {
              const blanks = CAPTION.test(jm.rest) ? visibleDistance(i, j) : 1
              for (let k = 0; k < blanks; k++) pushLine('', BLANK_MEAS)
            }
            closePara()
            defBodyIndent = defBody
            i = j
            continue
          }
          if (CAPTION.test(jm.rest)) {
            if (!descendantFence && !closedMarkerFence) {
              for (let k = i; k < j; k++) pushLine('', BLANK_MEAS)
              closePara()
              if (j > i + 1) list.tight = false
              else captionGaps.push({ line: trimLineEnd(jm.rest), text: CAPTION.exec(jm.rest)[1] })
            }
            i = j
            continue
          }
          if (opensSubBlock(dedented)) {
            // sub-BLOCK after a blank: attaches, stays tight (SS17 L2)
            if (!descendantFence && !closedMarkerFence) pushLine('', BLANK_MEAS)
            closePara()
            i = j
            continue
          }
          if (
            COMMENT_LINE.test(dedented) ||
            COMMENT_FENCE.test(dedented) ||
            FOOTNOTE_DEF.test(dedented) ||
            isLinkDef(dedented) ||
            parseAttrList(trimLineEnd(dedented)) !== null ||
            !!tryAttrLine(dedentedWindow(lines, j, contentCol), 0)
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
            if (!descendantFence && !closedMarkerFence &&
                (tryAttrLine(dedentedWindow(lines, j, contentCol), 0)?.next ?? 0) <= 1) pushLine('', BLANK_MEAS)
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
          if (!descendantFence && !closedMarkerFence) pushLine('', BLANK_MEAS)
          list.tight = false
          if (col === contentCol) subCol = -1
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
          if (defBodyIndent !== null && nm.indent >= (authoredBlockBase ?? contentCol) + defBodyIndent + FOOTNOTE_BODY_COLUMN) {
            noteTailList = true
            noteListBodyColumn = (authoredBlockBase ?? contentCol) + defBodyIndent + FOOTNOTE_BODY_COLUMN
            noteListChildColumn = nm.indent + nm.markerWidth
          }
          if (subCol < 0) subCol = reachOf(jm, lines[j]) + nm.markerWidth
          // THE WHOLE RUN, not one blank standing in for it. §11 N1's boundary
          // applies at every level, and the sub-list is parsed recursively from
          // `itemLines`, so a run collapsed to a single blank here is a run the
          // nested parse can never see: `- o` / `  - a` / three blanks /
          // `  - b` came out as ONE nested list while the same three blanks at
          // the top level split. Attaching still keeps THIS item tight - that
          // is L2 and is unchanged; what the run decides is whether the marker
          // below it joins the sub-list, which is the nested parse's question.
          if (!descendantFence && !closedMarkerFence) for (let k = i; k < j; k++) if (!skipped.has(k)) pushLine('', BLANK_MEAS)
          closePara()
          i = j
          continue
        }
        i = j
        break
      }
      const { col } = lm
      const reach = reachOf(lm, line)
      const priorContent = (lines[previousVisible(i - 1)] ?? '').replace(/^(?:[ \t]*>[ \t]?)+/, '')
      const childCol = subCol >= 0 ? subCol : (headSubActive ? headSubCol : -1)
      // A line reaching the child's column is parsed there without a lazy claim.
      if (foldedChildParagraph && reach >= childCol) {
        foldedChildParagraph = false
        descLive = false
      }
      const descendantParagraphBefore = descLive && deepestParagraphOpen()
      if (!descendantParagraphBefore) foldedChildParagraph = false
      const childParagraphOpen = (descendantParagraphBefore || childParagraphLazy) && deepestParagraphOpen()
      childParagraphLazy = false
      if (lm.rest !== '' && !insideFence()) commentBelowChild = COMMENT_LINE.test(lm.rest) && col >= contentCol && childCol >= 0 && reach < childCol &&
        !(nestedOpaque?.kind === 'comment' && COMMENT_FENCE.exec(lm.rest)?.[1].length === nestedOpaque.run.length)
      // The task box is content (CARVE-P0-008): a line in its columns stands
      // below the marker-line child's marker and folds (carve#3976).
      if (head.task !== undefined && headSubMarker && !headSubEnded && childParagraphOpen &&
          col > contentCol &&
          col < contentCol + TASK_MARKER_SOURCE_WIDTH &&
          lm.rest !== '' && !insideFence()) {
        pushLine(lazyFrame(lm.rest), LAZY_MEAS(lm.rest))
        i++
        continue
      }
      const foldedChildFence = markerLineFence === null && !isBlank(priorContent) && !nestedVerbatim() && descendantParagraphBefore && reach < childCol && FENCE.test(lm.rest) &&
        !isCodeBlockOpener(dedentMeasured(lm, lines[i], col).text)
      // A line past the child's marker column that folds lazily into its open
      // paragraph or term opens nothing here, so the child keeps its column (carve#3950).
      const foldsIntoChild = headSubActive && descendantParagraphBefore && reach > headSubCol - headSubMarker.markerWidth &&
        DEFLIST_SEPARATOR.test(lm.rest)
      if (headSubActive && reach < headSubCol && !foldsIntoChild &&
          (opensAuthoredBase(lm.rest) || reach >= headSubCol - headSubMarker.markerWidth && DEFLIST_SEPARATOR.test(lm.rest)) &&
          !COMMENT_LINE.test(lm.rest) && !foldedChildFence && !insideFence()) {
        headSubActive = false
      }
      // A marker at the task item's content column opens a list in the item
      // (PART 0 S3), which ends the marker-line child and its box-column rebase.
      if (head.task !== undefined && headSubMarker && col === contentCol && matchMarkerAt(lm) && !insideFence()) {
        headSubActive = false
        headSubEnded = true
      }
      if (lm.rest !== '') {
        while (noteFrames.length && col < noteFrames.at(-1).body) {
          const frame = noteFrames.at(-1)
          if (frame.firstBlockPending && (col === frame.marker || col === 0) &&
              !matchMarkerAt(lm)) break
          // A lazy line continues the note's open paragraph and keeps the note open.
          if (openPara && foldablePlainLine(lm.rest) && !isDefinitionOrAttributeLine(lm.rest)) break
          noteFrames.pop()
          // The enclosing note's body takes back the reach this note borrowed.
          defBodyIndent = frame.outerReach.def
          noteBodyBoundary = frame.outerReach.boundary
        }
      }
      // A note's later list leaves no item paragraph for a below-column tail.
      if (noteTailList && col < contentCol && lm.rest !== '' && !insideFence()) break
      // A marker in a line-block payload is payload: it opens no sublist.
      // A span closer remains payload after trackFence clears the span.
      const inPayload = col >= contentCol && fence.colon.length !== 0 &&
        colonLineBlock.at(-1) === true
      // So is one in an open code or comment fence's payload (PART 0 opacity).
      const inOpaque = col >= contentCol && fence.opaque !== null && fence.opaque.opens !== false
      const nm = inPayload || inOpaque ? null : matchMarkerAt(lm)
      if (DEFLIST_TERM.test(lm.rest) && col >= contentCol && !fence.opaque && !inPayload &&
          !nestedVerbatim() && noteFrames.length === 0) {
        lastListBlock = 'term'
        lastTermSourceCol = lm.L?.col ?? col
      } else if (nm && col >= contentCol && !insideFence()) lastListBlock = 'item'
      else if (pendingSeparation && col >= contentCol && !insideFence() &&
          lm.rest !== '' && !isDefinitionOrAttributeLine(lm.rest)) lastListBlock = 'paragraph'
      if (col >= contentCol) {
        // A descendant's comment closer pairs at any column (CARVE-P9-053), so it ends no sublist.
        if (subCol >= 0 && reach < subCol && opensAuthoredBase(lm.rest) &&
            !FENCE.test(lm.rest) && !nestedVerbatim() && !nestedAttachmentTakes(lm) &&
            !(nestedOpaque?.kind === 'comment' && COMMENT_FENCE.exec(lm.rest)?.[1].length === nestedOpaque.run.length)) {
          subCol = -1
          descLive = false
          deepestIsDescendant = false
        }
        // A completed span ends the paragraph for a new matched body line,
        // while its below-column continuation claim remains available.
        if (belowSpanClosed && !COMMENT_LINE.test(line)) {
          closePara()
          belowSpanClosed = false
        }
        // A line at a known descendant item's column belongs to that item.
        // Leave its authored indentation intact here so the recursive list
        // parser, which knows the descendant's content column, rebases it.
        // Rebasing it against this ancestor would hoist the block one level.
        const descendantOwned = (subCol >= 0 && reach >= subCol) || (headSubActive && reach >= headSubCol)
        // A footnote definition is invisible and leaves no paragraph open. Its
        // body starts two columns past the definition, so a block opener one
        // column past it is the item's next block, not definition residue.
        // Block attributes end term ownership before the next authored opener.
        const termAttributes = !insideFence() && col === contentCol && lm.rest.startsWith('{') &&
          (leadTerm || pendingHeadTerm !== null || pendingAuthoredBlock !== null || authoredBlockBase !== null) &&
          tryAttrLine(dedentedWindow(lines, i, contentCol), 0)
        if (termAttributes) {
          leadTerm = false
          pendingHeadTerm = null
          pendingAuthoredBlock = null
          authoredBlockBase = null
          authoredBlockLimit = null
        }
        const foldsIntoLeadTerm = leadTerm && col > contentCol && !nm
        // A colon container is not opaque: an opener past the column inside one
        // takes its authored base and may interrupt a paragraph
        // (CARVE-P0-004, CARVE-P9-083).
        const retainedAfterComment = afterComment && subCol > reach && !opensBlockAt(line, i)
        const inOpenColonOnly = fence.opaque === null && fence.colon.length !== 0 &&
          col > contentCol && !descendantOwned && !COLON_CLOSER.test(lm.rest) && !inPayload && !retainedAfterComment && opensHostedColonBlock(lm.rest)
        if (markerNoteEligible && defBodyIndent !== null && nm && col >= contentCol + defBodyIndent + FOOTNOTE_BODY_COLUMN) noteMarkerSeen = true
        if (nm && defBodyIndent !== null && col >= contentCol + defBodyIndent + FOOTNOTE_BODY_COLUMN &&
            COMMENT_LINE.test(FOOTNOTE_DEF.exec(head.text)?.[2] ?? '')) {
          noteListBodyColumn = (authoredBlockBase ?? contentCol) + defBodyIndent + FOOTNOTE_BODY_COLUMN
          noteListChildColumn = nm.indent + nm.markerWidth
        }
        // An opener at or past the note body column opens in the note
        // (CARVE-P9-083); no line below that column continues it.
        if (markerNoteEligible && i > noteFenceEnd && col >= markerNoteBodyColumn && !nm &&
            !descendantOwned && !insideFence() && !foldsIntoLeadTerm &&
            opensAuthoredBase(lm.rest) && !FENCE.test(lm.rest) &&
            !COMMENT_LINE.test(lm.rest)) {
          let end = authoredBlockEnd(lines, i, col, state)
          for (let at = i + 1; at < end; at++) {
            const measured = ind(at)
            if (measured.rest !== '' && measured.col < markerNoteBodyColumn) { end = at; break }
          }
          noteFenceEnd = Math.max(noteFenceEnd, end - 1)
        }
        const noteFence = FENCE.exec(lm.rest)
        if (noteFence && noteListBodyColumn !== null && col >= noteListBodyColumn && col < noteListChildColumn) {
          const closer = cachedForwardSearch(noteCloserSearches, `body-child:${noteListBodyColumn}:${col}:${noteFence[1]}`, i + 1, lines.length, (at) => {
            const measured = ind(at)
            if (measured.rest !== '' && measured.col < noteListBodyColumn) return null
            const run = measured.col === col && PURE_FENCE.exec(measured.rest)
            return !!(run && run[1][0] === noteFence[1][0] && run[1].length >= noteFence[1].length)
          })
          if (closer >= 0) noteFenceEnd = Math.max(noteFenceEnd, closer)
        }
        let absorbedNoteFence = false
        let noteFenceOpensPast = false
        if (markerNoteEligible && !descendantOwned &&
            col >= markerNoteBodyColumn && noteFence && i > noteFenceEnd) {
          // The lookahead searches past a below-column line and never matches
          // one; the fence it opens then ends at that line (CARVE-P0-014).
          let seenBelow = false
          const closer = cachedForwardSearch(noteCloserSearches, `${col}:${noteFence[1]}`, i + 1, lines.length, (at) => {
            const measured = ind(at)
            if (measured.rest !== '' && measured.col < markerNoteBodyColumn) {
              seenBelow = true
              return false
            }
            // Past a below-column line the walk left the closer where it was written.
            const run = (measured.col === col || (seenBelow && measured.col >= col)) && PURE_FENCE.exec(measured.rest)
            return !!(run && run[1][0] === noteFence[1][0] && run[1].length >= noteFence[1].length)
          })
          let below = -1
          for (let at = i + 1; closer >= 0 && at < closer; at++) {
            const measured = ind(at)
            if (measured.rest !== '' && measured.col < markerNoteBodyColumn) { below = at; break }
          }
          if (below >= 0) {
            noteFenceEnd = below - 1
            noteFenceOpensPast = true
          } else if (closer >= 0) noteFenceEnd = closer
          else absorbedNoteFence = true
        } else if (!markerNoteEligible && noteFrames.length && !descendantOwned && !insideFence() &&
            noteFence && parseFenceInfo(noteFence[2]) !== null && col >= noteFrames.at(-1).body) {
          // A note opened on its own line asks the same lookahead: a closer past
          // a below-column line still opens the fence (CARVE-P0-014).
          const body = noteFrames.at(-1).body
          let seenBelow = false
          const closer = cachedForwardSearch(noteCloserSearches, `frame:${body}:${col}:${noteFence[1]}`, i + 1, lines.length, (at) => {
            const measured = ind(at)
            if (measured.rest !== '' && measured.col < body) {
              seenBelow = true
              return false
            }
            const run = (measured.col === col || (seenBelow && measured.col >= col)) && PURE_FENCE.exec(measured.rest)
            return !!(run && run[1][0] === noteFence[1][0] && run[1].length >= noteFence[1].length)
          })
          for (let at = i + 1; closer >= 0 && at < closer; at++) {
            const measured = ind(at)
            if (measured.rest !== '' && measured.col < body) { noteFenceOpensPast = true; break }
          }
        }
        const inNoteBody = i <= noteFenceEnd || absorbedNoteFence
        const noteClaimsBelow = defBodyIndent !== null && noteBodyBoundary !== null &&
          col < noteBodyBoundary && noteClaimsLazyLine(i)
        const mayOpenAuthoredBlock = !inNoteBody && !foldsIntoLeadTerm && !descendantOwned &&
          !foldedChildFence &&
          (!insideFence() || inOpenColonOnly) && opensAuthoredBase(lm.rest) &&
          // A fence with no closer under an open paragraph is text (§10 I4), as the walk read it.
          (!isCodeBlockOpener(lm.rest) || bodyFenceOpens(i, lm.rest, col))
        if (pendingHeadQuote !== null && mayOpenAuthoredBlock) {
          const start = pendingHeadQuote
          const candidate = [head.text]
          for (let at = start + 1; at < lines.length; at++) {
            const measured = ind(at)
            if (measured.col <= baseIndent && matchMarkerAt(measured)) break
            candidate.push(measured.col < contentCol
              ? lines[at] : dedentMeasured(measured, lines[at], contentCol).text)
            if (isBlank(lines[at]) || COMMENT_LINE.test(lines[at])) break
          }
          authoredBlockLimit = start + authoredBlockEnd(candidate, 0, 0, state)
          authoredContainer = true
          pendingHeadQuote = null
        }
        // A definition list on the marker line is a block at the content
        // column like one written below it, so its description keeps what
        // reaches the body column (CARVE-P9-083, CARVE-P2-028).
        if (pendingHeadTerm !== null && mayOpenAuthoredBlock) {
          measureHeadTerm()
        }
        if (pendingAuthoredBlock !== null && mayOpenAuthoredBlock) {
          authoredBlockLimit = authoredBlockEnd(lines, pendingAuthoredBlock, contentCol, state)
          if (DEFLIST_TERM.test(ind(pendingAuthoredBlock).rest)) heldContainerEnd = authoredBlockLimit
          pendingAuthoredBlock = null
        }
        if (authoredBlockLimit !== null && i >= authoredBlockLimit && !insideFence()) {
          if (authoredContainer && isCodeBlockOpener(lm.rest) &&
              QUOTE.test(ind(i - 1)?.rest ?? '') &&
              !bodyLeavesParagraphOpen([ind(i - 1).rest])) closePara()
          authoredBlockBase = null
          authoredBlockLimit = null
        }
        if (noteBodyBoundary !== null && col < noteBodyBoundary && lm.rest !== '' && !insideFence()) {
          pendingAuthoredBlock = null
        }
        // A separator at the item's content column but below the current
        // definition list's column is paragraph text. It ends that list's
        // authored reach, so a later opener can interrupt the paragraph.
        if (authoredBlockBase !== null && col === contentCol && col < authoredBlockBase &&
            DEFLIST_SEPARATOR.test(lm.rest)) {
          authoredBlockBase = null
          authoredBlockLimit = null
          pendingAuthoredBlock = null
        }
        const insideAuthoredBlock = pendingAuthoredBlock !== null ||
          (authoredBlockLimit !== null && i < authoredBlockLimit)
        if (leadTerm && !foldsIntoLeadTerm && !insideFence() && !foldablePlainLine(lm.rest)) leadTerm = false
        const noteFrame = noteFrames.at(-1)
        const firstNoteBlock = noteFrame?.firstBlockPending &&
          (col === noteFrame.marker || col === 0) && lm.rest !== '' &&
          !matchMarkerAt(lm)
        if (firstNoteBlock) noteFrame.firstBlockPending = false
        const outsideNoteBody = noteBodyBoundary !== null && col < noteBodyBoundary
        const openerBase = !firstNoteBlock &&
          (!insideAuthoredBlock || inOpenColonOnly || outsideNoteBody) && mayOpenAuthoredBlock
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
        // Rebase a marker-line child at its source column after the task box.
        const localBase = head.task !== undefined && headSubMarker && openerBase !== null ? openerBase : head.task !== undefined && headSubMarker && !headSubEnded && col >= contentCol + TASK_MARKER_SOURCE_WIDTH &&
          !insideFence() ? authoredBlockBase ?? contentCol + TASK_MARKER_SOURCE_WIDTH
          // A marker-line note after a task box reads its body from its own source column.
          : head.task !== undefined && markerNoteEligible && col >= markerNoteBodyColumn
          ? markerNoteBodyColumn - FOOTNOTE_BODY_COLUMN
          : descendantOwned && noteFrames.length && col >= noteFrames.at(-1).body
          ? contentCol
          : noteFrames.length && col >= noteFrames.at(-1).body
          ? noteFrames.at(-1).ownerBase ?? noteFrames.at(-1).base
          : markerNoteCommentSeen && markerNoteEligible && col >= markerNoteBodyColumn &&
          (i <= noteFenceEnd || i <= markerNoteCommentEnd || COMMENT_LINE.test(lm.rest)) ? contentCol
          : i <= noteFenceEnd && noteListBodyColumn !== null
          ? noteListBodyColumn - FOOTNOTE_BODY_COLUMN
          : inOpenColonOnly ? openerBase : authoredBlockBase !== null && insideFence() && col < authoredBlockBase &&
            (fence.opaque?.kind !== 'code' || fence.opaque.opens === false)
          ? contentCol
          : openerBase ?? authoredBlockBase ?? contentCol
        const dd = dedentMeasured(lm, line, localBase)
        const dedented = dd.text
        // The body line's own measurement, derived from this one rather than
        // re-walked, and handed to the item's parse below (carve#752).
        const dmeas = dd.meas ?? indentCols(dedented)
        if (i > wrappedAttrEnd && dedented.startsWith('{')) {
          // Lazy, so a scan reads only the lines the attribute run reaches.
          const attributes = tryAttrLine(dedentedWindow(lines, i, localBase), 0)
          if (attributes && attributes.next > 1) wrappedAttrEnd = i + attributes.next - 1
        } else if (i > wrappedAttrEnd && !insideFence() && !nestedVerbatim() && dmeas.rest.startsWith('{')) {
          // A wrapped attribute opened in a nested child is one construct here too (carve#3421).
          // Lazy, so a scan reads only the lines the attribute run reaches.
          const attributes = tryAttrLine(dedentedWindow(lines, i, lm.col), 0)
          if (attributes && attributes.next > 1) wrappedAttrEnd = i + attributes.next - 1
        }
        if (
          pendingSeparation &&
          i > wrappedAttrEnd &&
          !insideFence() &&
          dmeas.rest !== '' &&
          !opensSubBlock(dedented) &&
          !matchMarkerAt(dmeas) &&
          !dmeas.rest.startsWith('%%') &&
          !FOOTNOTE_DEF.test(dedented) &&
          !isLinkDef(dedented) &&
          !(noteBodyBoundary !== null && col >= noteBodyBoundary) &&
          !noteClaimsBelow &&
          parseAttrList(trimLineEnd(dedented)) === null &&
          // A glued run (`{.a}{.b}`) is one attribute line too (carve#4078).
          !tryAttrLine([trimLineEnd(dedented)], 0)
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
        // Fence payload attaches nothing: its lines are opaque (PART 0).
        if (dmeas.rest !== '' && !insideFence() && !nestedVerbatim() && (opensSubBlock(dedented) || matchMarkerAt(dmeas))) {
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
        // A line in that body is the definition's: a marker there opens no
        // sublist of this item and a fence there is no descendant's.
        const inDefBody = (defBody !== null && dmeas.col >= defBody + FOOTNOTE_BODY_COLUMN ||
          noteFrames.length && col >= noteFrames.at(-1).body) && dmeas.rest !== '' &&
          !FOOTNOTE_DEF.test(lm.rest)
        const codeColonText = fence.colon.length && fence.opaque?.kind === 'code' &&
          col > colonBases.at(-1) &&
          col === authoredBlockBase && COLON_CLOSER.test(lm.rest)
        pushLine(codeColonText ? lazyFrame(dedented) : dedented, dmeas)
        if (noteFenceOpensPast) fenceOpensAt.add(itemLines.length - 1)
        if (nm && lm.rest.includes('+') && markerCarriesContinuation(lm.rest.trim(),
            prefixMemo(state, lines, i).continuation ??= new Map())) {
          const columns = state.markerLineColumns.get(itemLines) ?? new Map()
          columns.set(itemLines.length - 1, lm.L?.col ?? lm.col)
          state.markerLineColumns.set(itemLines, columns)
        }
        // Advance the incremental three-kind tracker so the blank-line branch
        // above knows whether an interior blank is fence content.
        if (openerBase !== null && !termAttributes) {
          authoredBlockBase = openerBase
          if (!FOOTNOTE_DEF.test(dedented) &&
              (noteBodyBoundary === null || col < noteBodyBoundary)) noteBodyBoundary = null
          authoredContainer = DEFLIST_TERM.test(dedented) || QUOTE.test(dedented)
          if (openerBase === contentCol) pendingAuthoredBlock = i
          else authoredBlockLimit = authoredBlockEnd(lines, i, openerBase, state)
          if (DEFLIST_TERM.test(dedented) && authoredBlockLimit !== null) heldContainerEnd = Math.max(heldContainerEnd, authoredBlockLimit)
        }
        // The old descendant cannot supply a paragraph to an ancestor's new fence.
        const opens = bodyFenceOpens(i, dedented, localBase, nestedOpaque?.kind === 'code' && !descendantOwned)
        // The item's own parse asks I4 over the item's lines, and a closer the
        // lookahead found past a below-column line is not among them. Hand it
        // the answer given here so the line is read one way (carve#1399).
        // Did this line ARRIVE inside an open comment span? Its payload is
        // opaque (PART 0) and its closer travels with its opener
        // (CARVE-P9-053), so neither may touch the paragraph or the
        // after-comment state below - read before the tracker consumes the
        // closer.
        // A CLOSER FOR THE SPAN THAT SITS BELOW THIS COLUMN. It is the same
        // line the tracker would read as an opener, so consume it first or the
        // span would be reopened here and its own closer lost.
        const belowEnd = belowSpan !== null ? COMMENT_FENCE.exec(dedented) : null
        const belowCloser = belowEnd !== null && belowEnd[1].length === belowSpan.run.length
        if (belowCloser) { belowSpan = null; belowSpanClosed = true }
        const inNestedComment = commentHoldsLine(nestedOpaque, dmeas)
        const inCommentSpan = fence.opaque?.kind === 'comment' || inNestedComment
        // Read with the paragraph state this line ARRIVED with, exactly as
        // `bodyFenceOpens` above is; the chain below then answers for the line.
        const wasNested = nestedOpaque
        // Only a descendant LIST ITEM's fence, which is the host carve#2490
        // rules. An indented fence inside a colon container is that container's
        // question, and CARVE-P0-014 answers it the other way: a colon body CAN
        // hold an open paragraph, so the fence folds into it and the run below
        // the base folds with it. `descendantOwned` is the collector's existing
        // spelling of "a known descendant item owns this column".
        absorbedFenceSeen = null
        if (!inPayload) nestedOpaque = trackNestedFence(nestedOpaque, dmeas, lm.col, i, descendantOwned && !inDefBody)
        if ((absorbedFenceSeen && !fence.opaque) || foldedChildFence) (residueFence.foldedFences ??= new Set()).add(itemLines.length - 1)
        if (opens && !absorbedFenceSeen && !foldedChildFence) fenceOpensAt.add(itemLines.length - 1)
        // A line the note paragraph claims is note text; it opens no fence here.
        if (!belowCloser && !inNestedComment && (!absorbedFenceSeen || fence.opaque) && !foldedChildFence &&
            (fence.opaque || !noteClaimsBelow)) trackFence(dedented, opens, i)
        // ADVANCE. One line the descendant takes, in the descendant's own
        // coordinates, which is what makes the state readable at its column.
        // A COMMENT SPAN WRITTEN BELOW THIS COLUMN IS NOT THE DESCENDANT'S. Its
        // payload is opaque and its closer travels with its opener
        // (CARVE-P9-053), so neither may touch the descendant's Q1 nor make the
        // descendant the deepest frame - corpus 513-...-5 keeps `tail` in an
        // item whose paragraph the span never closed.
        if (!belowCloser && !inCommentSpan) {
          if (nm && nm.indent >= contentCol && !inDefBody &&
              !fence.opaque && !nestedOpaque && !wasNested && !inPayload &&
              // A quote on the marker line starts the descendant's quote run there.
              (descendantQ1.col < 0 ? QUOTE.test(nm.text) : nm.indent < descendantQ1.col)) {
            seedDescendantQ1(nm.indent + nm.markerWidth, nm.text, prefixMemo(state, lines, i).paragraph, i)
          }
          if (descendantOwned) {
            if (descendantQ1.col < 0) seedDescendantQ1(subCol >= 0 ? subCol : headSubCol, '')
            // A line that opens, carries or closes an opaque descendant body is
            // verbatim, and a verbatim body holds no paragraph.
            advanceDescendantQ1(dmeas.rest, absorbedFenceSeen,
              nestedOpaque !== null || wasNested !== null, i, dmeas.col)
          }
          if (dmeas.rest !== '') {
            if (nm && nm.indent >= contentCol && !inDefBody) descLive = true
            else if (!descendantOwned && !COMMENT_LINE.test(dedented)) {
              if (foldedChildFence) foldedChildParagraph = true
              if (!foldedChildParagraph || !descendantParagraphBefore || mayOpenAuthoredBlock) {
                // The child's paragraph stays the deepest one for the box columns (PART 0 S4).
                childParagraphLazy = childParagraphOpen && !mayOpenAuthoredBlock && foldablePlainLine(dmeas.rest)
                descLive = false
                foldedChildParagraph = false
              }
            }
            deepestIsDescendant = descLive
          }
        }
        // A descendant's fence whose closer this collector is about to BREAK
        // away: hand the answer down so the nested parse reads the line the same
        // way (carve#1399, one level further in). Without it the item held an
        // inline code span where its depth-1 twin holds a code block.
        if (nestedOpaque !== null && wasNested === null) nestedFenceOpensAt.add(itemLines.length - 1)
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
        afterComment = afterCommentTransition(afterComment, {
          belowCloser,
          inCommentSpan,
          comment: !belowCloser && !inCommentSpan && COMMENT_LINE.test(dedented),
          belowComment: lm.col < contentCol,
          blank: dmeas.rest === '',
        })
        // record the first sub-list's content column (carve#322)
        if (subCol < 0 && nm && nm.indent >= contentCol && !inDefBody) {
          subCol = reach + nm.markerWidth
          paraBeforeSublist = paragraphIsOpen() ? [...para] : []
        }
        if (nm && nm.indent >= contentCol && markerCarriesContinuation(lm.rest.trim(),
            prefixMemo(state, lines, i).continuation ??= new Map())) {
          carriesBareContinuation = true
          nestedAttachmentColumn = lm.L?.col ?? lm.col
          nestedAttachmentEnd = -1
          nestedSiblingIndent = nm.indent
          // The descendant's `+` spends itself on a sublist at its content column.
          const sub = i + 1 < n ? matchMarkerAt(ind(i + 1)) : null
          spentOnSublist = /^(\[[^\]]\][ \t]+)?\+$/.test(trimWs(lm.rest.slice(nm.markerWidth))) && sub && sub.indent >= nm.indent + nm.markerWidth
          if (spentOnSublist) {
            nestedAttachmentEnd = attachedBlockEnd(lines, i + 1, state, (idx) =>
              ind(idx).rest === '' || CONT_MARKER.test(lines[idx]) ||
              matchMarkerAt(ind(idx))?.indent === baseIndent, ind(i + 1), ind(i + 1).col, ind(i + 1).col)
          }
        }
        // does the deepest structure now hold an OPEN paragraph that lazy
        // text may fold into? markers open a sub-item paragraph; quotes an
        // open quoted paragraph; fences/breaks close everything (SS10 I2/I6)
        // A closer for the span below this column leaves the paragraph exactly as
        // the span found it: closing it here would be this column answering for a
        // span written at another one, which is the whole of carve#2526.
        if (belowCloser) { /* the span's own state, untouched */ }
        else if (inCommentSpan) { /* opaque: the opener already closed the paragraph */ }
        else if (inPayload || fence.opaque?.payload) {
          if (colonLineBlock.at(-1) === true) startPara()
          else closePara()
        }
        else if (i <= wrappedAttrEnd) closePara()
        // A line in a footnote definition's body is that definition's, whatever
        // its shape: a comment or a marker there ends neither the definition
        // nor its reach (CARVE-P0-011, carve#1357).
        else if (inDefBody) {
          closePara()
          defBodyIndent = defBody
          notePara = i
        }
        else if (COMMENT_LINE.test(dedented)) {
          closePara()
          if (markerNoteEligible && col >= markerNoteBodyColumn) defBodyIndent = defBody
        }
        else if (HR.test(dedented)) closePara()
        // A CODE FENCE CLOSES THE PARAGRAPH ONLY IF IT INTERRUPTED IT -- §10 I4,
        // and the same correction carve#891 already made one construct over for
        // the colon fence. This branch tested the line's SHAPE, so an
        // unterminated fence the paragraph had ABSORBED closed it anyway.
        else if (isCodeBlockOpener(dedented)) {
          if (foldedChildFence || inPayload || fence.opaque?.payload) openParaWith(dedented)
          else if (fence.opaque && fence.opaque.kind === 'code' && fence.opaque.opens === false) {
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
          if (colonFenceInterrupts(dedented, para)) closePara()
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
        else if (isTableRow(dedented) || contRow) closePara()
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
        else if (inPayload && matchMarkerAt(dmeas)) openParaWith(dedented)
        else if (matchMarkerAt(dmeas)) {
          if (opensParagraph(dmeas.rest, true, false, prefixMemo(state, lines, i).paragraph)) startPara()
          else closePara()
        }
        // A quote opens a paragraph only if it CARRIES one. A bare `>` is an
        // empty quote, so there is nothing for a later flush-left line to fold
        // into, and the item closes instead -- PART 1 S4's NO OPEN PARAGRAPH,
        // NO LAZY LINE (carve#576, carve#582). Testing QUOTE alone treated
        // `. >` as if a paragraph were open and swallowed the next column-0
        // line into the item.
        //
        // AND ITS LAST BLOCK ANSWERS, on every line of the quote and not only
        // the marker line: `- a` / `  > # H` / `tail` holds no paragraph
        // (CARVE-P0-009). The run's own paragraph and table state ride along,
        // so a marker or a `+ ...|` row under quoted prose stays that prose.
        else if (QUOTE.test(dedented)) {
          advanceBodyQuote(dedented, i)
          if (bodyQuote.open) startPara()
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
        else if (isLinkDef(dedented) || FOOTNOTE_DEF.test(lm.rest)) {
          const outerReach = { def: defBodyIndent, boundary: noteBodyBoundary }
          closePara()
          // ONLY A FOOTNOTE DEFINITION HAS A BODY. A link reference definition
          // is ONE LINE in Carve: an indented line under it is not its title
          // but ordinary item text, and all three engines render it so
          // (`- a` / `  [r]: /u` / `    "T"` publishes the quoted string). So
          // only the footnote kind opens a body run below.
          if (FOOTNOTE_DEF.test(lm.rest)) {
            defBodyIndent = dmeas.col
            noteBodyBoundary = col + FOOTNOTE_BODY_COLUMN
            noteOpenerLine = i
            const outerNote = noteFrames.at(-1)
            if (outerNote) outerNote.ownerBase = outerNote.marker
            noteFrames.push({ marker: col, base: localBase, body: noteBodyBoundary, ownerBase: outerNote?.marker ?? null, outerReach,
              firstBlockPending: CONT_MARKER.test(FOOTNOTE_DEF.exec(lm.rest)?.[2] ?? '') })
            // A footnote body takes a lazy line like every container (carve#3885).
            const noteText = FOOTNOTE_DEF.exec(lm.rest)[2]
            if (opensParagraph(noteText, true)) { openPara = true; para = [noteText] }
          }
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
        else if (dmeas.rest !== '') openParaWith(dedented)
        // A block of this item below the sublist's column has ended the sublist,
        // so a later line past this column is no descendant's (CARVE-P0-004).
        if (subCol >= 0 && reach < subCol && !nm && dmeas.rest !== '' && !belowCloser && !inCommentSpan &&
            !inDefBody && !COMMENT_LINE.test(dedented) && !nestedAttachmentTakes(lm) &&
            (!paragraphIsOpen() ||
              (col === contentCol && opensBlockAt(dedented, i)))) subCol = -1
        // A FENCED BODY IS NOT A PARAGRAPH whichever container opened it
        // (CARVE-P0-013, CARVE-P0-014). The branches above classify the line in
        // THIS item's coordinates, where a descendant's fence and its payload
        // are ordinary text, so they record a paragraph the deepest structure
        // does not hold. A line outside that descendant's column closes its
        // host and can start an ancestor paragraph with a new claim. A new
        // fence on that line leaves no claim, even if the old descendant was
        // still open when the line arrived.
        if ((descendantOwned || isCodeBlockOpener(dedented)) &&
            (nestedVerbatim() || wasNested?.kind === 'code')) closePara()
        // The note body keeps its reach past the closed paragraph (CARVE-P0-013).
        if (markerNoteCommentSeen && inNoteBody) {
          const noteBody = defBodyIndent
          closePara()
          defBodyIndent = noteBody
        }
        // AN ABSORBED OPENER IS PARAGRAPH TEXT, NOT A BODY (§10 I4). Its span
        // stays tracked for the interior-blank rule, so a fence that really
        // opens under it never reached the tracker: its payload and closer
        // read as prose and reopened the paragraph the fence had closed
        // (CARVE-P0-009, carve#2949).
        if (fence.opaque?.opens === false) {
          if (fenceUnderAbsorbed !== null) {
            const c = PURE_FENCE.exec(dedented)
            if (c && c[1][0] === fenceUnderAbsorbed[0] && c[1].length >= fenceUnderAbsorbed.length) fenceUnderAbsorbed = null
            closePara()
          } else if (opens) {
            fenceUnderAbsorbed = FENCE.exec(dedented)[1]
            closePara()
          }
        } else fenceUnderAbsorbed = null
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
        const firstBlockAtZero = (lm.L?.col ?? lm.col) === 0 && !matchMarkerAt(lm)
        const attachmentColumn = firstBlockAtZero ? 0 : nestedAttachmentColumn
        if (nestedAttachmentEnd < 0 && attachesFlushLeft(lm, attachmentColumn)) {
          nestedAttachmentEnd = attachedBlockEnd(lines, i, state, (idx) =>
            ind(idx).rest === '' || CONT_MARKER.test(lines[idx]) ||
            [baseIndent, nestedSiblingIndent].includes(matchMarkerAt(ind(idx))?.indent), lm, attachmentColumn)
        }
        if (i < nestedAttachmentEnd) {
          pushLine(line, lm)
          i++
          continue
        }
      }
      // A COMMENT'S OWN DELIMITER IS NOT S2'S FENCED BODY (carve#2484). S2 wants
      // the innermost MATCHED container to be a verbatim BODY, and a comment has
      // no body block at all: PART 0 classifies it before visible block
      // ownership, so a comment-shaped line is a TOKEN this collector keeps at
      // every column - the `%%` branch below already says so and carve#629
      // already extended it from `%%` to `%%%`.
      //
      // Breaking here reached that branch for no comment line at all once a span
      // was open, so the item ended ON its closer: the item's own parse then saw
      // an opener with no closer among its lines, which is one `%%` line
      // comment, and PUBLISHED the payload while dropping both delimiters.
      // carve#2484's two controls, the closer at the opener's base and the same
      // pair at document level, already hide it, so the closer's column was the
      // only parameter.
      //
      // Only the DELIMITER is exempt. A span's payload line below the column
      // still ends the item, because that line is not comment-shaped and S2's
      // question was never asked about it: `- head` / `    %%%` / `X` / `%%%`
      // ends the item at `X` in every reader.
      const commentTokenBelow = fence.opaque !== null && fence.opaque.kind === 'comment' &&
        !nm && lm.rest.startsWith('%%')
      // ONE SPELLING, AT ANY DEPTH. The owner table selects the nearest
      // surviving ancestor the run's column reaches, and carries no depth term,
      // so a descendant's open body ends this container too and the run is
      // classified where the column puts it (carve#2490).
      if (!commentTokenBelow && (nestedVerbatim() || fenceUnderAbsorbed !== null || (fence.opaque && fence.opaque.opens !== false))) break
      if (nm && columnOwner(nm.indent) === 'outer') {
        // §17 L1, first clause: the item WAS followed by a blank line before
        // this sibling marker - an invisible attachment in between does not
        // undo that, because the clause is about the blank, not about what
        // filled the gap.
        if (blankBeforeInvisible && nm.indent === baseIndent && sameAxes(list, nm)) {
          list.tight = false
        }
        break // sibling or outer list
      }
      // CARVE-P2-028: the authored column keeps a folded separator inside its live term.
      if (!nm && DEFLIST_SEPARATOR.test(lm.rest) && col === baseIndent && lastListBlock === 'term' && !bodyQuote.open) break
      if (!nm && DEFLIST_SEPARATOR.test(lm.rest) && (lm.L?.col ?? col) <= authoredMarkerCol && !bodyQuote.open &&
          lastListBlock === 'term' && (lm.L?.col ?? col) < lastTermSourceCol) break
      if (nm && columnOwner(nm.indent) === 'below' && deepestParagraphOpen() && itemLines.length > 0) {
        // a marker BELOW the content column folds as lazy item text
        // (PART 9 SS24 C3; list markers never interrupt, SS10 I2)
        belowSpanClosed = false
        pushLine(lazyFrame(lm.rest), LAZY_MEAS(lm.rest))
        i++
        continue
      }
      // A retained item still requires its content column for a child list.
      if (nm && columnOwner(nm.indent) === 'below' && !deepestParagraphOpen() &&
          afterComment && itemLines.length > 0) {
        belowSpanClosed = false
        pushLine(lazyFrame(lm.rest), LAZY_MEAS(lm.rest))
        startPara()
        i++
        continue
      }
      if (!nm && DEFLIST_TERM.test(head.text) && authoredContainer && lm.col > baseIndent && lm.col < contentCol &&
          tryAttrLine([lm.rest], 0)) {
        closePara()
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
      // A LINE OPENS NO SPAN WHILE ONE IS OPEN (carve#2488). This break is about
      // an OPENER, and `commentFenceOpensSpan` answers for the line ALONE: with a
      // span open in the item's own lines the same line is inside it, and ending
      // the item there splits the span - the `dd` and the note body refuse it
      // with the same predicate, one rule in three hosts.
      //
      // Asked of `itemLines` rather than of `fence.opaque`, because the tracker
      // reads each line at the item's dedent and its opener test refuses an
      // indented run, so a span a DESCENDANT holds is invisible to it.
      if (!nm && COMMENT_FENCE_BODY.test(lm.rest) && atFrameColumn(lm.col) && itemLines.length > 0 &&
          commentFenceOpensSpan(lines, i) && nestedOpaque?.kind !== 'comment' && !bodyHoldsLiveCommentSpan()) {
        break
      }
      // A column-zero comment cannot revive a closed item (#2504).
      // Keep delimiters inside an existing comment span with that span.
      if (!nm && atFrameColumn(lm.col) && lm.rest.startsWith('%%') && !paragraphIsOpen() && nestedOpaque?.kind !== 'comment' &&
          !bodyHoldsLiveCommentSpan()) break
      if (!nm && lm.rest.startsWith('%%') && itemLines.length > 0) {
        // A comment is an ordinary line: below the column it closes the item.
        if (fence.opaque?.kind !== 'comment' &&
            nestedOpaque?.kind !== 'comment' && !bodyHoldsLiveCommentSpan()) break
        if (!afterComment && !(deepestParagraphOpen() || paragraphOpenBeforeComments) && fence.opaque?.kind !== 'comment' &&
            nestedOpaque?.kind !== 'comment' && !bodyHoldsLiveCommentSpan()) break
        markedQuoteCommentClaim = bodyQuote.at === i - 1 && bodyQuote.open
        // KEEP ONE COLUMN of the original indentation. Stripping it entirely
        // told the item's own parse that a line indented in the source had
        // been written flush left, and the rule above cannot then tell an
        // authored column-0 fence from one an enclosing dedent had clamped -
        // corpus 192 is parsed twice, once with ` %%% c` and once with the
        // stripped copy.
        // The measurement carries where the comment was written, because the
        // kept text cannot: at column 0 it reads like one at the content column.
        pushLine(
          lm.col > 0 ? ' ' + lm.rest : line,
          lm.col > 0 ? { col: 1, rest: lm.rest, tabs: false, belowComment: true } : { ...lm, belowComment: true },
        )
        // The lexical token leaves the frame available. The collector records
        // that ownership fact without turning the invisible line into lazy
        // paragraph text.
        //
        // A CLOSER KEPT HERE STILL CLOSES THE SPAN (carve#2484). The looseness
        // tracker is incremental, so a span left open past its own closer reads
        // every blank below it as fence content and the item comes out TIGHT.
        // Only the closing half is asked: an OPENER at this column opens no span
        // here, and the branch above owns that question.
        const spanBefore = fence.opaque?.kind === 'comment' || nestedOpaque?.kind === 'comment'
        if (fence.opaque) trackFence(lm.rest, false, i)
        // The DESCENDANT span's closer arrives here too, below this column, so
        // the tracker above never sees it.
        if (nestedOpaque && nestedOpaque.kind === 'comment') {
          const end = COMMENT_FENCE.exec(lm.rest)
          if (end && end[1].length === nestedOpaque.run.length) nestedOpaque = null
        }
        // A CLOSER LEAVES THE SPAN'S OWN PARAGRAPH STATE, NOT THIS COLUMN'S.
        // The body and closer travel with the opener (CARVE-P9-053) and the run
        // closes the span at any column (CARVE-P0-013), so the span ends here
        // exactly as it would at the opener's own column: no paragraph open,
        // the frame still available. Without this the closer's COLUMN decided
        // who owned the next line, because a payload line had reopened the
        // paragraph the opener closed. A bare `%%` LINE below the column closes
        // no span and keeps its retention rule (corpus 214).
        if (spanBefore && !(fence.opaque?.kind === 'comment' || nestedOpaque?.kind === 'comment')) {
          closePara()
          afterComment = afterCommentTransition(afterComment, {
            spanClosed: true,
          })
        }
        // An opener written HERE locates the span below every content column,
        // so its closer answers with this column's retention wherever it is
        // written (carve#2526). No §28 lookahead: a run with no matching closer
        // ahead is one `%%` line and the state it leaves can never be read,
        // because reading it takes a run of the same width. Asking anyway would
        // walk the rest of the document once per opener, which is the rescan
        // carve#2509 and carve#2527 each measured going quadratic here.
        if (!spanBefore) {
          const run = COMMENT_FENCE_BODY.exec(lm.rest)
          // A matched span answers as one comment line: the claim its opener
          // found after a marked quote line holds through its closer (CARVE-P9-053).
          if (run && belowSpan !== null && run[1].length === belowSpan.run.length) {
            markedQuoteCommentClaim = belowSpan.claim
            belowSpan = null
            belowSpanClosed = true
          } else if (run && belowSpan === null) belowSpan = { run: run[1], claim: markedQuoteCommentClaim }
        }
        if (markedQuoteCommentClaim) afterComment = true
        i++
        continue
      }
      // A matched below-column span keeps its payload without a paragraph claim.
      if (belowSpan !== null && lastCommentCloser(belowSpan.run) >= i) {
        pushLine(line, lm)
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
      // A wrapped attribute line is one attribute line (CARVE-P9-013 I5).
      if (!nm && atFrameColumn(lm.col) && (isDefinitionOrAttributeLine(line) || !!tryAttrLine(lines, i))) break
      // A surviving frame after a comment can own a nonzero below-column line,
      // which begins a new paragraph rather than continuing the closed one.
      // Document column zero remains owned by the document.
      // Q1 (or a frame surviving a comment, which Q3 answers), Q3, then Q2 at
      // the frame's own column 0 - the anchor the raw line carries.
      if (!nm && (deepestParagraphOpen() || (lastListBlock === 'term' && lm.col > baseIndent && lm.col < contentCol && DEFLIST_SEPARATOR.test(lm.rest)) || (DEFLIST_TERM.test(head.text.replace(/^> ?/, '')) && itemLines.slice(1).every((l) => l.startsWith(LAZY)) && isCodeBlockOpener(lm.rest) && !opensFence(lines, i)) || (afterComment && (!atFrameColumn(lm.col) || markedQuoteCommentClaim))) &&
          itemLines.length > 0 && !opensBlockAt(line, i)) {
        // lazy fold into the open item paragraph (SS10 I2 / SS24 C3). A column-0
        // fence with a closer INTERRUPTS (I4), exactly as a column-0 quote/
        // heading does via startsVisibleBlock -- FENCE only matches at column 0,
        // so an indented (below-content) fence still folds as lazy text.
        //
        // §17 L1b, ASKED WHEREVER THE ITEM'S OWN PARAGRAPH TEXT ARRIVES. The
        // clause names no column, so a line the item keeps as paragraph text
        // answers the second-PARAGRAPH question here exactly as it does at the
        // content column - the only branch that asked it. So `- t` / blank /
        // `  %% c` / ` z` came out TIGHT while the same tree with `z` one column
        // right is pinned LOOSE by corpus 186 (carve#2548). Every line reaching
        // this push is visible item text: comments are kept above, markers are
        // classified above, and a visible block opener never folds.
        if (pendingSeparation) {
          list.tight = false
          pendingSeparation = false
        }
        // The retained item or description reads this as a new code block. A lazy
        // sentinel would turn the unclosed fence into inline code (carve#3285),
        // and a verbatim body leaves no paragraph for the next line (CARVE-P0-013).
        if (isCodeBlockOpener(lm.rest) &&
            itemMeas.at(-1)?.belowComment === true &&
            COMMENT_LINE.test(indentCols(itemLines.at(-1) ?? '').rest)) {
          belowSpanClosed = false
          pushLine(lm.rest, lm)
          trackFence(lm.rest, true, i)
          closePara()
          afterComment = false
          markedQuoteCommentClaim = false
          i++
          continue
        }
        // A line retained after a comment begins a paragraph in this item, and
        // that paragraph is then the deepest one open (CARVE-P0-009, CARVE-P2-008).
        if (!deepestParagraphOpen()) {
          openParaWith(lm.rest)
          descLive = false
          deepestIsDescendant = false
        }
        belowSpanClosed = false
        pushLine(lazyFrame(lm.rest), LAZY_MEAS(lm.rest))
        if (bodyQuote.at === i - 1 && bodyQuote.open) bodyQuote.at = i
        i++
        continue
      }
      break
    }
    if (fenceOpensAt.size) (state.fenceOpensAt ??= new WeakMap()).set(itemLines, fenceOpensAt)
    if (nestedFenceOpensAt.size) (state.nestedFenceOpensAt ??= new WeakMap()).set(itemLines, nestedFenceOpensAt)
    /*
     * PUBLISH the descendant's Q1 state, so a lifecycle nothing can read is not
     * a lifecycle nobody can check. It goes to the caller's sink and NOT onto
     * `state`: a key there changes the state object's own shape, which a
     * structural test deep-compares, and the sink is already the surface
     * carve#2746 asks to be readable at the descendant's column.
     */
    if (descendantQ1.col >= 0) state.descendantQ1Log?.push({ col: descendantQ1.col, ...descendantQ1At(descendantQ1.col) })
    if (itemHasTerm) {
      // Definition terms compare columns after the item's dedent, for spaces and tabs alike.
      const relativeColumns = itemSourceRows.map((row, index) =>
        index === 0 || !lines[row] || !ind(row) ? 0 :
          ind(row).col < contentCol ? ind(row).col - contentCol :
            dedentMeasured(ind(row), lines[row], contentCol).meas.col);
      (state.descriptionSourceColumns ??= new WeakMap()).set(itemLines, relativeColumns);
      (state.itemRelativeTermColumns ??= new WeakSet()).add(itemLines)
    }
    item.blocks = parseBlocks(inheritFinalBreak(lines, itemLines, i, state), state, false, true, itemMeas)
    let beforeBlock = item.blocks.length
    for (let gap = captionGaps.length - 1; gap >= 0; gap--) {
      const { line, text } = captionGaps[gap]
      for (let block = beforeBlock - 1; block >= 0; block--) {
        const node = item.blocks[block]
        if (node.t === 'para' && node.lines?.[0] === line && !node.captionSlot) {
          list.tight = false
          beforeBlock = block
          break
        }
        if (node.caption === text || node.caption?.startsWith(`${text}\n`) || node.captionSlot?.src?.[0] === line) {
          beforeBlock = block
          break
        }
      }
    }
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
    // PART 11 §6 records the delimiter only where it is not the default `.`,
    // and CARVE-P10-014 writes what is recorded.
    delim: list.ord.delim === ')' ? ')' : null,
  }
}
