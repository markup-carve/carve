/*
 * The separator/padding split is a spec decision that nothing else can see.
 *
 * PART 7's MARKER SEPARATORS AND PADDING SLOTS clause names two roles for the
 * whitespace on a marker line: the slot that decides WHICH construct the line
 * opens is a MARKER SEPARATOR, and whitespace between two tokens on an
 * already-decided line is a PADDING SLOT. Both are spelled `space`, and a tab
 * satisfies neither.
 *
 * That last sentence is what carve#901 corrected. carve#878 split the roles
 * apart and widened every padding slot to `whitespace`, on the reading that a
 * slot carrying no recognition could admit a tab harmlessly; carve#894 widened
 * the code fence's three the same way. The rule is not about what a slot
 * recognizes but about WHERE it sits: a tab is syntax ONLY in a line's leading
 * indentation run, and every padding slot in this grammar sits after the first
 * non-whitespace character of its line. So the terminal is `space` on both
 * sides of the role line, and the role now decides only what a FAILED match
 * means, not which terminal the slot takes.
 *
 * Without this file the classification is unobservable. Every other gate reads
 * behavior, and no engine reads resources/grammar.ebnf, so flipping any of the
 * terminals leaves the whole suite green - the defect class tracked in
 * carve#755. Each site below therefore pins BOTH directions: the terminal the
 * production must carry, and the terminal it must NOT carry, so a silent
 * re-spelling in either direction fails here.
 *
 * TWO CHECKS RUN PER SITE, against two different artifacts:
 *
 *   1. the grammar text - what resources/grammar.ebnf spells.
 *   2. the ORACLE (scripts/spec/layout.mjs + resources/carve-core.ohm), which
 *      is executable, so every site is checked and none is skipped.
 *
 * Check 2 is why every site carries a tab/space fixture pair: the oracle is a
 * spec artifact rather than an implementation, so it tracks the production
 * immediately. carve#888 found the gap this closes from the other direction -
 * the oracle read `[t](/u<TAB>"T")` as literal text while grammar.ebnf had
 * spelled that slot `whitespace`, and nothing could see it. The same pair now
 * catches the reverse: an oracle that still admits a tab where the production
 * says `space`.
 *
 * Check 2 ran only at the PADDING sites until carve#887, and that asymmetry was
 * the hole. The four separator sites were compared against the grammar TEXT and
 * nothing else, so the oracle went on stripping `[ \t]+` after a colon fence -
 * opening an admonition, a div, a line block and a local hard-break block on a
 * tabbed opener - for as long as the four productions kept saying `space`. Both
 * artifacts are checked at every site now, which is what the header above
 * always claimed.
 *
 * THE ENGINE HALF IS DEFERRED, deliberately, and this is the third time its
 * scope has moved - so the reason is written down rather than inferred.
 *
 * The loop that used to live here ran ONE engine, the pinned
 * `@markup-carve/carve` (carve-js), and asserted that a tab in a padding slot
 * parses as the space form does. Under carve#901 that assertion is exactly
 * backwards: carve-js DOES still accept a tab at every padding slot
 * (measured while writing this - every tab form renders byte-identical to
 * its space form), which is now a divergence from the production rather
 * than conformance with it. Asserting today's behavior would pin the bug and
 * the fix would have to delete the assertion; asserting the corrected behavior
 * would fail on an engine that has not been changed yet.
 *
 * So every site carries `engineDeferred` with its reason, and the test below
 * requires it. The engine question belongs in the cross-engine gates
 * (claims:check, compare:impls), which is where it should gain a row once the
 * engines narrow.
 *
 * The three reasons are NOT the same fact, which is why they are three
 * constants. At the six original padding sites carve-js itself is behind the
 * production. At the five TABLE-CELL padding sites (carve#904) all three
 * reference engines are, measured from their own main, so there is no
 * majority to read there and no engine to single out. At the four
 * separator sites carve-js main has already narrowed the slot
 * (markup-carve/carve-js#794) and what is behind is the COMMIT this repo pins -
 * pin lag, which a pin bump clears and no engine work does.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml } from '@markup-carve/carve'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const grammar = readFileSync(resolve(repo, 'resources/grammar.ebnf'), 'utf8')
// The SECOND normative file. resources/carve-core.ohm spells a subset of the
// same productions, and carve#907 found the two disagreeing at the code fence:
// grammar.ebnf said `[space]`, the ohm said `spaceChar*`, and `spaceChar` is a
// space OR A TAB. Nothing could see it, because scripts/spec/render.mjs
// matches only `inlines`, `attrs` and `blockAttrs` - the ohm's whole block
// layer is unexecuted, so replacing `langInfo`'s body with a literal that
// matches nothing leaves the entire suite green (measured; filed separately).
// A production nothing evaluates cannot be pinned behaviorally, so it is
// pinned as TEXT here, exactly as grammar.ebnf's productions are.
const ohm = readFileSync(resolve(repo, 'resources/carve-core.ohm'), 'utf8')

// Productions wrap, so match against the flattened text rather than line by
// line - the same normalization scripts/normative-clauses.mjs uses.
const flat = grammar.replace(/\n\s*/g, ' ')

// One reason, shared by all six padding sites, because it IS one fact about
// one engine rather than six. Measured on the pinned `@markup-carve/carve`
// build: all six tab forms below render byte-identical to their space forms.
const ENGINE_DEFERRED =
  'carve-js accepts a tab in this slot - measured on the pinned build, the tab form ' +
  'renders byte-identical to the space form - so it diverges from the production ' +
  'since carve#901 narrowed it back to `space`. Asserting the current behavior would ' +
  'pin the divergence; asserting the corrected behavior would fail on an engine that ' +
  'has not been changed yet. The cross-engine gates (claims:check, compare:impls) ' +
  'carry the question. The ORACLE half runs regardless - it is not an engine.'

// The separators are deferred for a DIFFERENT reason, and the difference is the
// whole point of writing it out. carve-js main already narrowed this slot
// (markup-carve/carve-js#794); what still opens the block on a tab is the
// COMMIT this repo pins, 52da7be, which is from 08:09 on the day that PR merged
// at 12:04. So this deferral is pin lag rather than an engine gap, and it clears
// on the next `npm run bump-carve-pin` rather than on any engine work. The same
// window is declared per document in resources/engine-pin-drift.txt.
// The table-cell sites are deferred for a THIRD reason, and it is the widest of
// the three, so it is its own constant rather than a reuse of ENGINE_DEFERRED.
// At the six older padding sites the statement is about carve-js. Here it is
// about all three reference engines: carve-js, carve-php and carve-rs were each
// built from their own main under carve#904 and measured across every shape -
// a tab before and after cell content in a delimiter, header and data row, plus
// both mixed runs - and all three accept the tab everywhere, agreeing with each
// other on all 35 shapes. There is no majority to read and no engine to blame;
// the production is simply ahead of every implementation of it.
//
// The assertion loop below still runs against the PINNED build, because that is
// the engine this repository actually executes. Its measured behavior is the
// same.
const TABLE_DEFERRED =
  'a tab in this table-cell padding slot is accepted by every reference engine - carve-js, ' +
  'carve-php and carve-rs were each built from their own main and measured under carve#904, ' +
  'and all three render every tab form byte-identical to its space form, agreeing with one ' +
  'another on every shape. So the production is ahead of all three rather than one of them ' +
  'being defective. Asserting the current behavior would pin the divergence; asserting the ' +
  'corrected behavior would fail on engines that have not been changed yet. The corpus ' +
  'declares the window per document in resources/engine-pin-drift.txt. The ORACLE half runs ' +
  'regardless - it is not an engine.'

// The TITLE slots are deferred for a FOURTH reason, and it is narrower than
// any of the three above, so it is its own constant. Measured under carve#907
// on each engine's own main, built read-only on one host: carve-rs `378f0d5`
// REJECTS a tab at every form of this slot - the inline link title, the image
// title and the reference-definition title alike (markup-carve/carve-rs#729) -
// and its rendering is byte-identical to the oracle's. carve-js `3d95e94` and
// carve-php `876e312` still read a title after one at all three. So this is a
// two-engine gap with a reference implementation to port against, not a rule
// no implementation has reached; that is the difference from TABLE_DEFERRED,
// which is what makes it a separate constant rather than a reuse.
const TITLE_DEFERRED =
  'carve-js and carve-php still read a title after a tab in this slot, at every form that ' +
  'shares the `link_title` production - inline, image and reference definition. carve-rs main ' +
  'has narrowed all three (markup-carve/carve-rs#729) and now answers exactly as the oracle ' +
  'does, so there is a reference to port against rather than a rule nothing implements. ' +
  'Asserting the current behavior would pin the divergence; asserting the corrected behavior ' +
  'would fail on the two engines that have not been changed yet, and on the PINNED build, ' +
  'which is what this loop executes. The ORACLE half runs regardless - it is not an engine.'

// The three CODE-FENCE slots are deferred for the PIN_DEFERRED reason rather
// than an engine one, and that changed while carve#907 was being worked, so
// the date is worth writing down. markup-carve/carve-js#800 and
// markup-carve/carve-php#955 both merged on 2026-08-06; carve-rs was already
// correct there (markup-carve/carve-rs#724 and earlier). Measured after those
// merges on carve-js `3d95e94`, carve-php `876e312` and carve-rs `378f0d5`:
// all three reject a tab at the opener slot, the `"header"` slot and the
// `[label]` slot, and all three render byte-identically to the oracle. What
// still accepts one is the build this repository PINS.
const FENCE_PIN_DEFERRED =
  'all three reference engines have narrowed this slot - measured on carve-js `3d95e94`, ' +
  'carve-php `876e312` and carve-rs `378f0d5`, every tab form renders byte-identically to ' +
  'the oracle rather than to its space form. What still accepts a tab is the PINNED build ' +
  '(52da7be), which predates markup-carve/carve-js#800 and markup-carve/carve-php#955. So ' +
  'this is pin lag, not an engine gap, and it clears on the next `npm run bump-carve-pin` ' +
  'rather than on any engine work. The ORACLE half runs regardless - it is not an engine.'

const PIN_DEFERRED =
  'the PINNED carve-js build (52da7be) still opens the block on a tabbed separator - ' +
  'measured here, the tab form renders byte-identical to the space form. carve-js main ' +
  'has narrowed it (markup-carve/carve-js#794), so this is pin lag, not an engine gap, and it ' +
  'clears on the next pin bump. The ORACLE half runs regardless - it is not an engine.'

// One slot, four openers, and the fixtures are written per OPENER rather than
// per slot for a measured reason: implementations decide it in four separate
// places. carve-rs carried four copies of the rule and fixing the first left
// three still opening (markup-carve/carve-rs#720); carve-js and carve-php each
// had their own split. A single representative shape covers a quarter of that.
//
// Each opener carries the tab-first form AND a mixed `<SP><TAB>` run, the same
// pair the frontmatter padding slot carries below and for the same reason: "the
// slot takes a space" implemented as "the FIRST character is a space" passes the
// tab-first fixture and still lets the mixed run through. That exact defect was
// found three times in one day, most recently in carve-php where a `[0] === ' '`
// test plus a `trim()` let `:::<SP><TAB>note` keep opening an admonition after
// its supposed fix.
const SITES = [
  // --- MARKER SEPARATORS: `space`, a tab never satisfies them ---------------
  {
    role: 'separator',
    site: 'admonition_open, the slot after the colon fence',
    required: /admonition_open = colon_fence:open, space, admonition_type/,
    forbidden: /admonition_open = colon_fence:open, whitespace/,
    why: 'the type word selects an admonition over a div, a line block or a hard-break block',
    fixtures: [
      { slot: 'a tabbed type word', tab: ':::\tnote\nx\n:::\n', space: '::: note\nx\n:::\n' },
      { slot: 'a mixed run before the type word', tab: '::: \tnote\nx\n:::\n', space: '::: note\nx\n:::\n' },
    ],
    engineDeferred: PIN_DEFERRED,
  },
  {
    role: 'separator',
    site: 'div_open, the slot after the colon fence',
    required: /div_open = colon_fence:open, \[\[space\], label\]/,
    forbidden: /div_open = colon_fence:open, \[\[whitespace\]/,
    why: 'the same physical slot as the other three openers; optional is not a different role',
    fixtures: [
      { slot: 'a tabbed bare label', tab: ':::\t[First]\nx\n:::\n', space: '::: [First]\nx\n:::\n' },
      { slot: 'a mixed run before the bare label', tab: '::: \t[First]\nx\n:::\n', space: '::: [First]\nx\n:::\n' },
    ],
    engineDeferred: PIN_DEFERRED,
  },
  {
    role: 'separator',
    site: 'line_block_open, the slot after the colon fence',
    required: /line_block_open = colon_fence:open, space, "\|"/,
    forbidden: /line_block_open = colon_fence:open, whitespace/,
    why: 'the `|` token selects a line block',
    fixtures: [
      { slot: 'a tabbed pipe', tab: ':::\t|\nx\n:::\n', space: '::: |\nx\n:::\n' },
      { slot: 'a mixed run before the pipe', tab: '::: \t|\nx\n:::\n', space: '::: |\nx\n:::\n' },
    ],
    engineDeferred: PIN_DEFERRED,
  },
  {
    role: 'separator',
    site: 'local_hard_break_block_open, the slot after the colon fence',
    required: /local_hard_break_block_open = colon_fence:open, space, backslash/,
    forbidden: /local_hard_break_block_open = colon_fence:open, whitespace/,
    why: 'the backslash token selects a local hard-break block',
    fixtures: [
      { slot: 'a tabbed backslash', tab: ':::\t\\\nx\n:::\n', space: '::: \\\nx\n:::\n' },
      { slot: 'a mixed run before the backslash', tab: '::: \t\\\nx\n:::\n', space: '::: \\\nx\n:::\n' },
    ],
    engineDeferred: PIN_DEFERRED,
  },

  // --- PADDING SLOTS: `space`, a tab satisfies them either -------------------
  //
  // Same terminal as the separators above, different reason. A separator is a
  // `space` because the token after it selects the construct; a padding slot is
  // a `space` because it sits after the first non-whitespace character of the
  // line, where a tab is not syntax (PART 7, carve#901).
  //
  // Every one of these carries `engineDeferred`: carve-js accepts a tab at all
  // six and so diverges from the production. See the file header. The five
  // TABLE-CELL padding sites follow them, under their own constant.
  {
    role: 'padding',
    site: 'admonition_open, the "title" and [label] metadata slots',
    // Anchored on the production: `code_fence_info` carries the same two
    // metadata slots, and spells them the same way. An unanchored pattern would
    // match either production, so each site's assertion would stop being about
    // the site it names.
    required: /admonition_open = [^;]*\[space\+, quoted_title\], \[space\+, label\] ;/,
    forbidden: /admonition_open = [^;]*\[whitespace\+?, (?:quoted_title|label)\]/,
    why: 'the type word has already decided the block; the title and label sit inline',
    // ONE PAIR PER SLOT. `::: note` is fixed before either slot is reached, and
    // the two slots revert independently, so a fixture carrying a tab at BOTH
    // cannot tell them apart: with either one narrowed the line is unrecognized
    // and the render differs from the space form regardless. Measured - a
    // single two-tab fixture survived reverting each slot on its own.
    fixtures: [
      { slot: 'the "title" slot', tab: '::: note\t"T" [L]\nx\n:::\n', space: '::: note "T" [L]\nx\n:::\n' },
      { slot: 'the [label] slot', tab: '::: note "T"\t[L]\nx\n:::\n', space: '::: note "T" [L]\nx\n:::\n' },
    ],
    engineDeferred: ENGINE_DEFERRED,
  },
  {
    role: 'padding',
    site: 'frontmatter_open, the slot before the format token',
    required: /frontmatter_open = "---", \[space\], \[frontmatter_format\]/,
    forbidden: /frontmatter_open = "---", \[whitespace\]/,
    why: 'the `---` pair has already decided the block; the token sits inline after it',
    // The second pair is a MIXED run. A padding rule stated as "the slot takes
    // a space" is easy to implement as "the first character must be a space",
    // which passes the tab-first fixture and still lets `---<SP><TAB>yaml`
    // through - the rule is about the whole run. Found by review, not by the
    // tab-first fixture, which is exactly why it is pinned separately.
    fixtures: [
      { slot: 'the format-token slot', tab: '---\tyaml\na: 1\n---\nx\n', space: '--- yaml\na: 1\n---\nx\n' },
      { slot: 'the format-token slot, mixed run', tab: '--- \tyaml\na: 1\n---\nx\n', space: '--- yaml\na: 1\n---\nx\n' },
    ],
    engineDeferred: ENGINE_DEFERRED,
  },
  {
    role: 'padding',
    site: 'link_title, the slot before the quoted run',
    // Both alternatives, double- and single-quoted, carry the same terminal.
    required: /link_title = space, \('"'.*\| space, \("'"/,
    forbidden: /link_title = whitespace,|\| whitespace, \("'"/,
    why: 'a link is a link once its destination is read; the title sits inline after it',
    // ONE PAIR PER SITE THE PRODUCTION IS USED AT. `link_title` is one
    // production read by two different pieces of the oracle - the inline form
    // by `destTitle` in resources/carve-core.ohm, the definition form by
    // `LINK_DEF` in scripts/spec/layout.mjs - and carve#888 was precisely that
    // the two disagreed. With only the inline fixture, widening `LINK_DEF`
    // back to `[ \t]+` broke nothing here: measured.
    //
    // The inline form additionally carries BOTH mixed runs. "The slot takes a
    // space" written as "the FIRST character is a space, then eat whitespace"
    // passes a tab-first fixture and lets `<SP><TAB>` through; written as "the
    // LAST character is a space" it lets `<TAB><SP>` through instead. Measured
    // under carve#907: with only the tab-first fixture, widening the inline
    // slot to ` [ \t]*` broke nothing in the whole suite.
    //
    // The DEFINITION form keeps its single tab-first fixture deliberately.
    // What that slot does on a failed match is the open question in
    // markup-carve/carve#911 - the definition is not anchored at end of line,
    // so the title is dropped rather than the line falling back to prose - and
    // adding fixtures there belongs with that ruling, not here.
    fixtures: [
      { slot: 'the inline form', tab: '[t](/u\t"T")\n', space: '[t](/u "T")\n' },
      { slot: 'the inline form, mixed run, space first', tab: '[t](/u \t"T")\n', space: '[t](/u "T")\n' },
      { slot: 'the inline form, mixed run, tab first', tab: '[t](/u\t "T")\n', space: '[t](/u "T")\n' },
      { slot: 'the definition form', tab: '[a]: /u\t"T"\n\n[a][]\n', space: '[a]: /u "T"\n\n[a][]\n' },
    ],
    engineDeferred: TITLE_DEFERRED,
  },
  {
    role: 'padding',
    site: 'image_title, the slot before the quoted run',
    // `image_title = link_title ;` - one production, defined by reference. The
    // site is listed separately anyway, and the reason is measured rather than
    // stylistic: every engine serves the link tail and the image tail from ONE
    // function today (carve-rs `read_link_target`, carve-js `RE_LINK_REST`,
    // carve-php's `InlineParser` block), so the two agree by construction and
    // nothing here would notice the day one of them splits. Until carve#907
    // the image slot had no fixture at all, in this file or in the corpus.
    required: /image_title = link_title ;/,
    forbidden: /image_title = whitespace|image_title = \[?whitespace/,
    why: 'an image is an image once its source is read; the title sits inline after it',
    fixtures: [
      { slot: 'the image form', tab: '![a](/p.png\t"T")\n', space: '![a](/p.png "T")\n' },
      { slot: 'the image form, mixed run, space first', tab: '![a](/p.png \t"T")\n', space: '![a](/p.png "T")\n' },
      { slot: 'the image form, mixed run, tab first', tab: '![a](/p.png\t "T")\n', space: '![a](/p.png "T")\n' },
    ],
    engineDeferred: TITLE_DEFERRED,
  },
  {
    role: 'padding',
    site: 'reference_definition, the slot before the trailing attributes',
    required: /\[link_title\], \[space, attributes\], newline/,
    forbidden: /\[link_title\], \[whitespace, attributes\]/,
    why: 'the definition is complete at `[a]: /url`; the attribute block sits inline after it',
    // The second pair puts the tab at the FAR end of the separator run, with a
    // space adjacent to the `{`. The oracle scans this run backwards from the
    // brace, so a check that reads only the adjacent character passes while a
    // tab still sits in the run - the same mixed-run hole as the frontmatter
    // slot above, reached from the other side.
    //
    // THE OTHER DIRECTION IS DELIBERATELY MISSING, and it is a known live hole
    // rather than an oversight. `[a]: /u<SP><TAB>{.c}` is not pinned anywhere:
    // measured under carve#907, replacing this site's guard with
    // `sep[0] !== ' '` - the first-character shape, on the one end this site
    // does not cover - passes the entire suite, 1355 of 1355, and leaves
    // core:check at 728/728. The same is true of the definition form of
    // `link_title` above under ` [ \t]*"`. Both live on the reference-definition
    // line, whose failure mode is the open question in markup-carve/carve#911 -
    // the line is not anchored at end of line, so a slot that does not match
    // drops the metadata silently instead of falling back to prose, which is the
    // outcome PART 7 names as the one to avoid. Pinning either shape belongs
    // with that ruling; carve#907 scoped itself to the five slots where nothing
    // is open.
    fixtures: [
      { slot: 'the trailing-attributes slot', tab: '[a]: /u\t{.c}\n\n[a][]\n', space: '[a]: /u {.c}\n\n[a][]\n' },
      { slot: 'the trailing-attributes slot, mixed run', tab: '[a]: /u\t {.c}\n\n[a][]\n', space: '[a]: /u {.c}\n\n[a][]\n' },
    ],
    engineDeferred: ENGINE_DEFERRED,
  },
  {
    role: 'padding',
    site: 'fenced_code_block, the slot before the info string',
    required: /fenced_code_block = code_fence_open, \[space\], \[code_fence_info\]/,
    forbidden: /fenced_code_block = code_fence_open, \[whitespace\]/,
    // THE SECOND NORMATIVE FILE, at the one production where the two
    // disagreed. resources/carve-core.ohm spelled this slot `spaceChar*`,
    // and `spaceChar = " " | "\t"`, so the ohm admitted a tab here while
    // grammar.ebnf said `[space]` (carve#907). This is a TEXT check because
    // the rule is not executed - see the note at the top of this file - and a
    // text check is what the file already does for grammar.ebnf.
    requiredOhm: /langInfo\s+= " "\? langToken/,
    forbiddenOhm: /langInfo\s+= spaceChar/,
    why: 'the fence run has already decided the block; the info string sits inline after it',
    // Both mixed runs, for the reason the frontmatter slot states. Measured
    // under carve#907: with only the tab-first fixture, widening the oracle's
    // leading match to `^ [ \t]*` broke nothing in the whole suite, and the
    // `^[ \t]* ` spelling broke nothing either.
    fixtures: [
      { slot: 'the info-string slot', tab: '```\tjs\nx\n```\n', space: '``` js\nx\n```\n' },
      { slot: 'the info-string slot, mixed run, space first', tab: '``` \tjs\nx\n```\n', space: '``` js\nx\n```\n' },
      { slot: 'the info-string slot, mixed run, tab first', tab: '```\t js\nx\n```\n', space: '``` js\nx\n```\n' },
    ],
    engineDeferred: FENCE_PIN_DEFERRED,
  },
  {
    role: 'padding',
    site: 'code_fence_info, the "header" and [label] metadata slots',
    // One pattern covers all three spellings on purpose. The label slot is
    // written twice, once per alternative, and it is one slot with one role:
    // pinning them separately would let a half-revert pass. carve#896 found
    // that gap; carve#901 reverts through the same pattern.
    required:
      /code_fence_info = \( language_info, \[space\+, quoted_title\], \[space\+, label\] \) \| \( quoted_title, \[space\+, label\] \) \| label ;/,
    forbidden: /code_fence_info = [^;]*\[whitespace\+?/,
    why: 'the same two metadata slots the admonition opener carries, both inline',
    // One pair per slot, for the reason spelled out at the admonition opener:
    // these two revert independently and a two-tab fixture cannot separate
    // them. The tab goes after `js` in the first and after the title in the
    // second, so neither needs a tab in the OPENER slot above.
    // Each of the two slots additionally carries BOTH mixed runs, which is what
    // separates "the slot takes a space" from "the slot starts with a space" and
    // from "the slot ends with a space". Measured under carve#907: with only the
    // tab-first fixtures, `^ *"` widened to `^(?: [ \t]*)?"` and `^ *\[` widened
    // to `^(?: [ \t]*)?\[` each broke nothing in the whole suite.
    fixtures: [
      { slot: 'the "header" slot', tab: '```js\t"T" [L]\nx\n```\n', space: '```js "T" [L]\nx\n```\n' },
      { slot: 'the "header" slot, mixed run, space first', tab: '```js \t"T" [L]\nx\n```\n', space: '```js "T" [L]\nx\n```\n' },
      { slot: 'the "header" slot, mixed run, tab first', tab: '```js\t "T" [L]\nx\n```\n', space: '```js "T" [L]\nx\n```\n' },
      { slot: 'the [label] slot', tab: '```js "T"\t[L]\nx\n```\n', space: '```js "T" [L]\nx\n```\n' },
      { slot: 'the [label] slot, mixed run, space first', tab: '```js "T" \t[L]\nx\n```\n', space: '```js "T" [L]\nx\n```\n' },
      { slot: 'the [label] slot, mixed run, tab first', tab: '```js "T"\t [L]\nx\n```\n', space: '```js "T" [L]\nx\n```\n' },
    ],
    engineDeferred: FENCE_PIN_DEFERRED,
  },

  // --- TABLE-CELL PADDING SLOTS (carve#904) ---------------------------------
  //
  // Five productions, ten slots, one rule. Every one of them sits after the
  // row's opening `|`, so every one of them is inline and takes `space`.
  //
  // These were filed rather than swept in with the other nine positions
  // carve#901 reverted, because correcting them is not a revert: no corpus
  // document carried a tab in a table row and all three engines accepted one,
  // so narrowing the EBNF alone would have moved nothing in this repository -
  // the carve#755 shape. Corpus 256 and the oracle loop below are what close
  // that; the grammar-text check is the third artifact, not the only one.
  //
  // A tab here is not a rejection. It stops being padding and becomes ordinary
  // cell content, so the fixtures below differ from their space forms by what
  // the cell CONTAINS - except at `delimiter_cell`, where the failure is
  // structural and the row stops promoting a header at all.
  {
    role: 'padding',
    site: 'delimiter_cell, the slots around the dash run',
    required: /delimiter_cell = \{space\}, \[':'\], '-', \{'-'\}, \[':'\], \{space\} ;/,
    forbidden: /delimiter_cell = \{whitespace\}|\[':'\], \{whitespace\} ;/,
    why: 'the row is already a row; the padding sits after its opening pipe',
    // ONE PAIR PER END. The two ends are two edits - in the oracle they are the
    // two `*` runs of one regex - and a fixture carrying a tab at both cannot
    // tell a half-revert from a whole one: with either end widened the cell
    // matches again and the header is promoted either way. Measured.
    //
    // The mixed run is here for the reason the frontmatter slot states: "the
    // slot takes a space" implemented as "the first character is a space"
    // passes the tab-first fixture and lets `<SP><TAB>` through. That defect
    // was found three times in one day, in three languages.
    fixtures: [
      { slot: 'the leading slot', tab: '| a | b |\n|\t--- |\t--- |\n| 1 | 2 |\n', space: '| a | b |\n| --- | --- |\n| 1 | 2 |\n' },
      { slot: 'the leading slot, mixed run', tab: '| a | b |\n| \t--- | \t--- |\n| 1 | 2 |\n', space: '| a | b |\n| --- | --- |\n| 1 | 2 |\n' },
      { slot: 'the trailing slot', tab: '| a | b |\n| ---\t| ---\t|\n| 1 | 2 |\n', space: '| a | b |\n| --- | --- |\n| 1 | 2 |\n' },
      { slot: 'the trailing slot, mixed run', tab: '| a | b |\n| --- \t| --- \t|\n| 1 | 2 |\n', space: '| a | b |\n| --- | --- |\n| 1 | 2 |\n' },
    ],
    engineDeferred: TABLE_DEFERRED,
  },
  {
    role: 'padding',
    site: 'header_cell, the slots around the cell content',
    required: /header_cell = '=', \[alignment_marker\], \{space\}, cell_content, \{space\} ;/,
    forbidden: /header_cell = [^;]*\{whitespace\}/,
    why: 'the `=` has already decided the cell; the padding sits inline after it',
    fixtures: [
      { slot: 'the leading slot', tab: '|=\th |=\ti |\n| 1 | 2 |\n', space: '|= h |= i |\n| 1 | 2 |\n' },
      { slot: 'the leading slot, mixed run', tab: '|=\t h |=\t i |\n| 1 | 2 |\n', space: '|= h |= i |\n| 1 | 2 |\n' },
      { slot: 'the trailing slot', tab: '|= h\t|= i\t|\n| 1 | 2 |\n', space: '|= h |= i |\n| 1 | 2 |\n' },
      { slot: 'the trailing slot, mixed run', tab: '|= h \t|= i \t|\n| 1 | 2 |\n', space: '|= h |= i |\n| 1 | 2 |\n' },
    ],
    engineDeferred: TABLE_DEFERRED,
  },
  {
    role: 'padding',
    site: 'data_cell, the slots around the cell content',
    required: /data_cell = \[cell_attributes\], \[alignment_marker\], \{space\}, cell_content, \{space\} ;/,
    forbidden: /data_cell = [^;]*\{whitespace\}/,
    why: 'the opening pipe has already decided the cell; the padding sits inline after it',
    fixtures: [
      { slot: 'the leading slot', tab: '|\ta |\tb |\n', space: '| a | b |\n' },
      { slot: 'the leading slot, mixed run', tab: '| \ta | \tb |\n', space: '| a | b |\n' },
      { slot: 'the trailing slot', tab: '| a\t| b\t|\n', space: '| a | b |\n' },
      { slot: 'the trailing slot, mixed run', tab: '| a \t| b \t|\n', space: '| a | b |\n' },
      // ONE PAIR PER PIECE OF THE ORACLE THAT READS THE PRODUCTION, the
      // `link_title` shape. A continuation row's cells ARE `data_cell`s
      // (grammar.ebnf `continuation_row`), and scripts/spec/layout.mjs pads
      // them in a SECOND place - the join loop, not `parseCell`. With only the
      // standard-row fixtures above, widening that join back to `trim()` broke
      // nothing here: measured.
      { slot: 'the continuation-row form, leading slot', tab: '| a | b |\n+\tx | y |\n', space: '| a | b |\n+ x | y |\n' },
      { slot: 'the continuation-row form, trailing slot', tab: '| a | b |\n+ x\t| y\t|\n', space: '| a | b |\n+ x | y |\n' },
    ],
    engineDeferred: TABLE_DEFERRED,
  },
  {
    role: 'padding',
    site: 'rowspan_marker, the slots around the `^`',
    required: /rowspan_marker = \{space\}, '\^', \{space\} ;/,
    forbidden: /rowspan_marker = \{whitespace\}|'\^', \{whitespace\} ;/,
    why: 'the marker is one token inside a cell that already exists; both sides sit inline',
    fixtures: [
      { slot: 'the leading slot', tab: '| a | b |\n|\t^ | c |\n', space: '| a | b |\n| ^ | c |\n' },
      { slot: 'the trailing slot', tab: '| a | b |\n| ^\t| c |\n', space: '| a | b |\n| ^ | c |\n' },
    ],
    engineDeferred: TABLE_DEFERRED,
  },
  {
    role: 'padding',
    site: 'colspan_marker, the slots around the `<`',
    required: /colspan_marker = \{space\}, '<', \{space\} ;/,
    forbidden: /colspan_marker = \{whitespace\}|'<', \{whitespace\} ;/,
    why: 'the twin of the rowspan marker, and it reverts separately',
    fixtures: [
      { slot: 'the leading slot', tab: '| a | b |\n| c |\t< |\n', space: '| a | b |\n| c | < |\n' },
      { slot: 'the trailing slot', tab: '| a | b |\n| c | <\t|\n', space: '| a | b |\n| c | < |\n' },
    ],
    engineDeferred: TABLE_DEFERRED,
  },
]

test('all twenty-three classified slots are present', () => {
  assert.equal(SITES.length, 16, 'the twenty-three slots live in sixteen entries')
  assert.equal(SITES.filter((s) => s.role === 'separator').length, 4)
  assert.equal(SITES.filter((s) => s.role === 'padding').length, 12)
})

for (const { role, site, required, forbidden, why, requiredOhm, forbiddenOhm } of SITES) {
  test(`${role}: ${site}`, () => {
    assert.match(
      flat,
      required,
      `resources/grammar.ebnf no longer spells this ${role} slot \`space\`.\n` +
        `  ${site}\n  role: ${why}\n` +
        `  Both roles take \`space\`; a tab is syntax only in a leading indentation run.\n` +
        `  See PART 7, MARKER SEPARATORS AND PADDING SLOTS (carve#901).`,
    )
    assert.doesNotMatch(
      flat,
      forbidden,
      `resources/grammar.ebnf spells this ${role} slot \`whitespace\`, which admits a tab.\n` +
        `  ${site}\n  role: ${why}\n` +
        `  Padding is not a reason to admit a tab - the slot's POSITION is what decides,\n` +
        `  and this one sits inline. See PART 7 (carve#901, correcting carve#878).`,
    )
    // The SECOND normative file, where it spells this slot at all. Optional:
    // resources/carve-core.ohm models Core only, so most sites here have no
    // counterpart in it and simply carry neither field.
    if (requiredOhm !== undefined) {
      assert.match(
        ohm,
        requiredOhm,
        `resources/carve-core.ohm no longer spells this ${role} slot as a space.\n` +
          `  ${site}\n  role: ${why}\n` +
          `  The two normative files have to agree: grammar.ebnf says \`space\` here.\n` +
          `  See carve#907, which found them disagreeing at exactly this production.`,
      )
    }
    if (forbiddenOhm !== undefined) {
      assert.doesNotMatch(
        ohm,
        forbiddenOhm,
        `resources/carve-core.ohm spells this ${role} slot with a rule that admits a tab.\n` +
          `  ${site}\n  role: ${why}\n` +
          `  \`spaceChar\` is \` \` OR \`\\t\`; this slot takes a space (PART 7).\n` +
          `  This rule is NOT executed (see the note at the top of this file), so the\n` +
          `  text check is its only observer - do not delete it on the assumption that\n` +
          `  a behavioral gate would have caught the same thing. It would not.`,
      )
    }
  })
}

// EVERY site carries fixtures, with no exception: the oracle loop below runs
// them all, and a site with no fixtures would silently drop out of it - the
// check-that-cannot-fail class tracked in carve#755. `engineDeferred` does not
// substitute for fixtures; it only says why the ENGINE half of the pair is
// skipped, which is a statement about carve-js, not about the oracle.
//
// The four SEPARATOR sites had no fixtures at all until carve#887. They were
// checked against the grammar TEXT and nothing else, so the oracle went on
// stripping `[ \t]+` after the fence run - opening an admonition, a div, a line
// block and a hard-break block on a tabbed opener - while this file reported
// the separator half green. That is the exact defect the file's own header
// warns about, one artifact short.
test('every site carries a tab/space fixture pair per slot', () => {
  for (const s of SITES) {
    assert.ok(
      Array.isArray(s.fixtures) && s.fixtures.length > 0,
      `site "${s.site}" must carry at least one tab/space fixture pair; ` +
        `the oracle check runs at every site and cannot skip one.`,
    )
    for (const f of s.fixtures) {
      assert.ok(
        typeof f.slot === 'string' &&
          typeof f.tab === 'string' &&
          typeof f.space === 'string',
        `site "${s.site}" has a fixture entry missing slot/tab/space.`,
      )
      assert.notEqual(
        f.tab,
        f.space,
        `site "${s.site}" fixture "${f.slot}" has identical tab and space ` +
          `forms, so it can never discriminate.`,
      )
      assert.ok(
        f.tab.includes('\t'),
        `site "${s.site}" fixture "${f.slot}" is named a tab fixture but ` +
          `carries no tab.`,
      )
    }
  }
})

// A site whose production has TWO independently-revertible slots needs TWO
// fixtures, or a half-revert passes. This is the carve#896 shape, found again
// here by mutation: the admonition opener and code_fence_info each carry a
// "title" and a [label] slot, and a single fixture with a tab at BOTH survived
// reverting either one on its own - with either slot narrowed the line is
// unrecognized and the render differs from the space form regardless.
// link_title is the same shape for a different reason: one production, two
// pieces of the oracle reading it, which is exactly what carve#888 was about.
//
// The five table-cell sites are the same shape again, doubled: each production
// has a LEADING and a TRAILING padding slot that revert independently (in the
// oracle, two separate replacements and the two `*` runs of one regex), and the
// three cell productions additionally carry a mixed-run fixture per end,
// because a rule about a RUN is easy to implement as a rule about its first
// character. Measured while writing this: a fixture with a tab at both ends
// survived reverting either end on its own at every one of the five.
const MULTI_SLOT = {
  'admonition_open, the "title" and [label] metadata slots': 2,
  // Six, not two: each of the two slots carries its tab-first fixture and BOTH
  // mixed runs (carve#907).
  'code_fence_info, the "header" and [label] metadata slots': 6,
  // Four: the inline form carries its tab-first fixture and both mixed runs,
  // and the definition form carries its own. The definition form deliberately
  // has no mixed run - that slot's failure mode is markup-carve/carve#911.
  'link_title, the slot before the quoted run': 4,
  'delimiter_cell, the slots around the dash run': 4,
  'header_cell, the slots around the cell content': 4,
  // Six, not four: the two extra are the CONTINUATION-row spelling, which the
  // oracle pads in a different place than a standard row's cells.
  'data_cell, the slots around the cell content': 6,
  'rowspan_marker, the slots around the `^`': 2,
  'colspan_marker, the slots around the `<`': 2,
}
test('a site with independently-revertible slots carries a fixture for each', () => {
  for (const [site, n] of Object.entries(MULTI_SLOT)) {
    const entry = SITES.find((s) => s.site === site)
    assert.ok(entry, `MULTI_SLOT names a site that is not in SITES: ${site}`)
    assert.equal(
      entry.fixtures.length,
      n,
      `padding site "${site}" reverts in ${n} independent places and needs ${n} ` +
        `fixture pairs; one pair covering both lets a half-revert through.`,
    )
  }
})

// A MIXED RUN, IN BOTH ORDERS, at every slot carve#907 pinned.
//
// This is the part the fixture COUNT above cannot state. A rule about a run is
// easy to implement as a rule about one END of it, and the two ends fail
// differently: "the first character is a space" lets `<SP><TAB>` through, and
// "the last character is a space" lets `<TAB><SP>` through. Both spellings have
// been written for real in this org, in three languages, on the same day.
//
// Five mutants proved the hole rather than argued it. Against the tree carve#907
// branched from, each of `^ +` -> `^ [ \t]*` at the fence opener, `^ *"` ->
// `^(?: [ \t]*)?"` at the header slot, `^ *\[` -> `^(?: [ \t]*)?\[` at the label
// slot, and both title-slot equivalents passed the ENTIRE suite - 1245 of 1245
// - while implementing exactly that defect. A fixture count of "three" would
// not have caught any of them; three fixtures all tab-first is still one shape.
//
// So the registry names the SHAPES, and the assertion reads the fixture strings
// rather than trusting their labels.
const BOTH_DIRECTIONS = [
  'link_title, the slot before the quoted run',
  'image_title, the slot before the quoted run',
  'fenced_code_block, the slot before the info string',
  'code_fence_info, the "header" and [label] metadata slots',
]
test('every slot carve#907 pinned carries a mixed run in both orders', () => {
  for (const site of BOTH_DIRECTIONS) {
    const entry = SITES.find((s) => s.site === site)
    assert.ok(entry, `BOTH_DIRECTIONS names a site that is not in SITES: ${site}`)
    assert.ok(
      entry.fixtures.some((f) => f.tab.includes(' \t')),
      `site "${site}" carries no <SP><TAB> fixture. A slot rule implemented as ` +
        `"the FIRST character must be a space" passes every tab-first fixture and ` +
        `still admits this one - measured as a surviving mutant under carve#907.`,
    )
    assert.ok(
      entry.fixtures.some((f) => f.tab.includes('\t ')),
      `site "${site}" carries no <TAB><SP> fixture. A slot rule implemented as ` +
        `"the LAST character must be a space" passes every tab-first fixture and ` +
        `still admits this one - the same defect from the other end.`,
    )
  }
})

// A deferral is a claim about the engines, so it has to be written down and
// readable. An empty string is not a reason, and a MISSING field is not one
// either: with the engine loop gone, a padding site that declared nothing
// would look identical to one that had been checked, which is precisely the
// carve#755 shape. So the field is required at every padding site, and adding
// one more without a reason fails here.
test('every site states why its engine half is deferred', () => {
  for (const s of SITES) {
    assert.ok(
      typeof s.engineDeferred === 'string' && s.engineDeferred.length > 0,
      `site "${s.site}" must state why the engine half is deferred. ` +
        `carve-js accepts a tab at every padding slot, and the PINNED build also ` +
        `accepts one in the separator slot; if either has changed, assert it here ` +
        `instead of deferring.`,
    )
  }
})

// The deferral REASON is itself a measurement, so it is measured rather than
// asserted in prose. carve#896's first attempt at a deferral gave a rationale
// that measurement showed was false for the engine actually executed, and
// nothing caught it - a written reason nobody re-runs is a claim, not a check.
//
// This is NOT pinning the divergence. The assertion is "the reason for
// deferring still holds", and its failure mode is the useful one: the day
// carve-js narrows a padding slot to `space`, this goes red and says to delete
// the deferral and assert the corrected behavior instead. A test that pinned
// the bug would go red on the FIX and have to be deleted to allow it; this one
// goes red on the fix and tells you what to write in its place.
for (const { role, site, fixtures } of SITES) {
  for (const { slot, tab, space } of fixtures) {
    test(`the engine deferral still holds - carve-js admits a tab: ${site} - ${slot}`, () => {
      assert.equal(
        carveToHtml(tab),
        carveToHtml(space),
        `carve-js no longer parses a tab in this padding slot as the space form.\n` +
          `  slot:       ${slot}\n` +
          `  tab form:   ${JSON.stringify(tab)}\n  space form: ${JSON.stringify(space)}\n` +
          `  This is GOOD NEWS: the engine has caught up with the production ` +
          `(PART 7, carve#901).\n` +
          `  Drop \`engineDeferred\` at this site and assert the corrected behavior ` +
          `instead of deferring it.`,
      )
    })
  }
}

// The ORACLE half, at EVERY padding site. resources/carve-core.ohm and
// scripts/spec/layout.mjs are the executable spelling of these productions, so
// a slot they widen to admit a tab is the same defect as grammar.ebnf spelling
// it `whitespace` - and it is invisible everywhere else, because no corpus
// document carries a tab in one of these slots (measured: core:check is
// 675/675 both before and after carve#901 narrowed them).
//
// The direction is the one carve#901 settled: a tab must NOT parse as the space
// form does. carve#888 ran this same pair the other way round, when the
// production was `whitespace`; the pair is what makes either reading
// observable.
for (const { role, site, fixtures } of SITES) {
  for (const { slot, tab, space } of fixtures) {
    test(`${role} slot rejects a tab in the oracle: ${site} - ${slot}`, () => {
      assert.notEqual(
        renderDoc(parse(tab)),
        renderDoc(parse(space)),
        `a tab in this ${role} slot parsed as the space form does in the ` +
          `executable spec (scripts/spec/layout.mjs, resources/carve-core.ohm).\n` +
          `  slot:       ${slot}\n` +
          `  tab form:   ${JSON.stringify(tab)}\n  space form: ${JSON.stringify(space)}\n` +
          `  The production says \`space\` here: a tab is syntax only in a leading\n` +
          `  indentation run (PART 7, carve#901).`,
      )
    })
  }
}

// A SECOND character outside the slot's class, at both spellings of the one
// production that is used at two sites.
//
// The loop above already rejects a TAB at `link_title`. This one rejects NBSP,
// and it is not redundant: the two would be rejected for different reasons if
// the slot ever regressed. scripts/spec/layout.mjs matched `\p{White_Space}`
// before the definition form's title until carve#888, which is a bug a tab
// fixture alone cannot see - a tab is inside `\p{White_Space}`, so the tab
// fixture would still have said "admits it" while the slot was wide open to
// U+2003 and U+0085. NBSP is the fixture that separates "narrowed to `' '`"
// from "narrowed to a whitespace PROPERTY". Both spellings of `link_title` are
// checked, because the production is one production used at two sites and the
// carve#888 bug was that they disagreed.
//
// Checked against the ORACLE ONLY, deliberately. carve-js accepts the whole
// White_Space property in this slot (measured: U+00A0, U+2003, U+202F and
// U+0085 all yield `title="T"`), so it is wider than the production here and
// an engine assertion would pin that. That divergence is reported upstream
// rather than encoded, and no corpus case carries one of these characters, so
// no cross-engine golden takes a position on it.
const OUTSIDE_CLASS = '\u00a0' // NBSP: White_Space, but not ' '

for (const [form, outside, spaceForm] of [
  ['inline', `[t](/u${OUTSIDE_CLASS}"T")\n`, '[t](/u "T")\n'],
  ['reference definition', `[a]: /u${OUTSIDE_CLASS}"T"\n\n[a][]\n`, '[a]: /u "T"\n\n[a][]\n'],
]) {
  test(`link_title admits no whitespace outside ' ' in the oracle: ${form}`, () => {
    assert.notEqual(
      renderDoc(parse(outside)),
      renderDoc(parse(spaceForm)),
      `the oracle read a title after a whitespace character the production does not ` +
        `admit.\n  outside-class form: ${JSON.stringify(outside)}\n` +
        `  space form:         ${JSON.stringify(spaceForm)}\n` +
        `  \`link_title\` takes \`space\` (PART 7, carve#901; carve#888).`,
    )
  })
}

// The SAME second character, at the frontmatter opener, and it is not a
// duplicate of the loop above: this is the one slot in the file where the
// oracle was measurably the WIDEST artifact in the org rather than the
// narrowest.
//
// The tab fixtures in SITES pass because the oracle's guard was a NOT-A-TAB
// test - `(?![ \t]*\t)` - rather than a space-only one, and its alternation
// then admitted `\s`. JavaScript's `\s` covers U+000C, U+000B, U+00A0 and
// U+2000, so all four opened frontmatter in the executable spec while
// `frontmatter_open = "---", [space], [frontmatter_format]` admits none of
// them, and while all three reference engines reject every one (measured under
// carve#907 on carve-js `3d95e94`, carve-php `876e312`, carve-rs `378f0d5`).
// A tab fixture cannot see that: a tab is inside `\s` too, so it went on
// reporting the slot narrow while four other characters walked through - the
// same shape carve#888 found at `link_title`, which is why the fixture is the
// same idea rather than a new one.
//
// The mixed form is here for the reason the whole file is: the run, not the
// first character. `--- <FF>yaml` starts with a space and is still not padding.
const OUTSIDE_CLASS_FRONTMATTER = [
  ['a form feed', '\f'],
  ['a vertical tab', '\v'],
  ['a no-break space', ' '],
  ['an en quad', ' '],
]
for (const [name, ch] of OUTSIDE_CLASS_FRONTMATTER) {
  for (const [shape, run] of [
    ['alone', ch],
    ['after a space', ' ' + ch],
  ]) {
    test(`frontmatter_open admits no whitespace outside ' ' in the oracle: ${name}, ${shape}`, () => {
      const outside = `---${run}yaml\na: 1\n---\nx\n`
      const spaceForm = '--- yaml\na: 1\n---\nx\n'
      assert.notEqual(
        renderDoc(parse(outside)),
        renderDoc(parse(spaceForm)),
        `the oracle opened frontmatter after a whitespace character the production does ` +
          `not admit.\n  outside-class form: ${JSON.stringify(outside)}\n` +
          `  space form:         ${JSON.stringify(spaceForm)}\n` +
          `  \`frontmatter_open\` takes \`space\` (PART 7, carve#901; carve#907).\n` +
          `  A not-a-tab guard is not a space-only guard: JavaScript's \`\\s\` covers\n` +
          `  U+000C, U+000B, U+00A0 and U+2000, and every one of them reached the\n` +
          `  format token while the tab fixture reported the slot narrow.`,
      )
    })
  }
}
