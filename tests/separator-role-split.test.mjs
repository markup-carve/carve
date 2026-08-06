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
 * TWO CHECKS RUN PER PADDING SITE, against two different artifacts:
 *
 *   1. the grammar text - what resources/grammar.ebnf spells.
 *   2. the ORACLE (scripts/spec/layout.mjs + resources/carve-core.ohm), which
 *      is executable, so every padding site is checked and none is skipped.
 *
 * Check 2 is why every padding site carries a tab/space fixture pair: the
 * oracle is a spec artifact rather than an implementation, so it tracks the
 * production immediately. carve#888 found the gap this closes from the other
 * direction - the oracle read `[t](/u<TAB>"T")` as literal text while
 * grammar.ebnf had spelled that slot `whitespace`, and nothing could see it.
 * The same pair now catches the reverse: an oracle that still admits a tab
 * where the production says `space`.
 *
 * THE ENGINE HALF IS GONE, deliberately, and this is the third time its scope
 * has moved - so the reason is written down rather than inferred.
 *
 * The loop that used to live here ran ONE engine, the pinned
 * `@markup-carve/carve` (carve-js), and asserted that a tab in a padding slot
 * parses as the space form does. Under carve#901 that assertion is exactly
 * backwards: carve-js DOES still accept a tab at all six padding slots
 * (measured while writing this - all six tab forms render byte-identical to
 * their space forms), which is now a divergence from the production rather
 * than conformance with it. Asserting today's behavior would pin the bug and
 * the fix would have to delete the assertion; asserting the corrected behavior
 * would fail on an engine that has not been changed yet.
 *
 * So every padding site carries `engineDeferred` with its reason, and the test
 * below requires it. The engine question belongs in the cross-engine gates
 * (claims:check, compare:impls), which is where it should gain a row once the
 * engines narrow.
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

const SITES = [
  // --- MARKER SEPARATORS: `space`, a tab never satisfies them ---------------
  {
    role: 'separator',
    site: 'admonition_open, the slot after the colon fence',
    required: /admonition_open = colon_fence:open, space, admonition_type/,
    forbidden: /admonition_open = colon_fence:open, whitespace/,
    why: 'the type word selects an admonition over a div, a line block or a hard-break block',
  },
  {
    role: 'separator',
    site: 'div_open, the slot after the colon fence',
    required: /div_open = colon_fence:open, \[\[space\], label\]/,
    forbidden: /div_open = colon_fence:open, \[\[whitespace\]/,
    why: 'the same physical slot as the other three openers; optional is not a different role',
  },
  {
    role: 'separator',
    site: 'line_block_open, the slot after the colon fence',
    required: /line_block_open = colon_fence:open, space, "\|"/,
    forbidden: /line_block_open = colon_fence:open, whitespace/,
    why: 'the `|` token selects a line block',
  },
  {
    role: 'separator',
    site: 'local_hard_break_block_open, the slot after the colon fence',
    required: /local_hard_break_block_open = colon_fence:open, space, backslash/,
    forbidden: /local_hard_break_block_open = colon_fence:open, whitespace/,
    why: 'the backslash token selects a local hard-break block',
  },

  // --- PADDING SLOTS: `space`, a tab satisfies them either -------------------
  //
  // Same terminal as the separators above, different reason. A separator is a
  // `space` because the token after it selects the construct; a padding slot is
  // a `space` because it sits after the first non-whitespace character of the
  // line, where a tab is not syntax (PART 7, carve#901).
  //
  // Every one of these carries `engineDeferred`: carve-js accepts a tab at all
  // six and so diverges from the production. See the file header.
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
    fixtures: [
      { slot: 'the format-token slot', tab: '---\tyaml\na: 1\n---\nx\n', space: '--- yaml\na: 1\n---\nx\n' },
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
    fixtures: [
      { slot: 'the inline form', tab: '[t](/u\t"T")\n', space: '[t](/u "T")\n' },
      { slot: 'the definition form', tab: '[a]: /u\t"T"\n\n[a][]\n', space: '[a]: /u "T"\n\n[a][]\n' },
    ],
    engineDeferred: ENGINE_DEFERRED,
  },
  {
    role: 'padding',
    site: 'reference_definition, the slot before the trailing attributes',
    required: /\[link_title\], \[space, attributes\], newline/,
    forbidden: /\[link_title\], \[whitespace, attributes\]/,
    why: 'the definition is complete at `[a]: /url`; the attribute block sits inline after it',
    fixtures: [
      { slot: 'the trailing-attributes slot', tab: '[a]: /u\t{.c}\n\n[a][]\n', space: '[a]: /u {.c}\n\n[a][]\n' },
    ],
    engineDeferred: ENGINE_DEFERRED,
  },
  {
    role: 'padding',
    site: 'fenced_code_block, the slot before the info string',
    required: /fenced_code_block = code_fence_open, \[space\], \[code_fence_info\]/,
    forbidden: /fenced_code_block = code_fence_open, \[whitespace\]/,
    why: 'the fence run has already decided the block; the info string sits inline after it',
    fixtures: [
      { slot: 'the info-string slot', tab: '```\tjs\nx\n```\n', space: '``` js\nx\n```\n' },
    ],
    engineDeferred: ENGINE_DEFERRED,
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
    fixtures: [
      { slot: 'the "header" slot', tab: '```js\t"T" [L]\nx\n```\n', space: '```js "T" [L]\nx\n```\n' },
      { slot: 'the [label] slot', tab: '```js "T"\t[L]\nx\n```\n', space: '```js "T" [L]\nx\n```\n' },
    ],
    engineDeferred: ENGINE_DEFERRED,
  },
]

test('all twelve classified slots are present', () => {
  assert.equal(SITES.length, 10, 'the twelve slots live in ten entries')
  assert.equal(SITES.filter((s) => s.role === 'separator').length, 4)
  assert.equal(SITES.filter((s) => s.role === 'padding').length, 6)
})

for (const { role, site, required, forbidden, why } of SITES) {
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
  })
}

// Every padding site carries fixtures, with no exception: the oracle loop
// below runs them all, and a site with no fixtures would silently drop out of
// it - the check-that-cannot-fail class tracked in carve#755. `engineDeferred`
// does not substitute for fixtures; it only says why the ENGINE half of the
// pair is skipped, which is a statement about carve-js, not about the oracle.
test('every padding site carries a tab/space fixture pair per slot', () => {
  for (const s of SITES.filter((x) => x.role === 'padding')) {
    assert.ok(
      Array.isArray(s.fixtures) && s.fixtures.length > 0,
      `padding site "${s.site}" must carry at least one tab/space fixture pair; ` +
        `the oracle check runs at every padding site and cannot skip one.`,
    )
    for (const f of s.fixtures) {
      assert.ok(
        typeof f.slot === 'string' &&
          typeof f.tab === 'string' &&
          typeof f.space === 'string',
        `padding site "${s.site}" has a fixture entry missing slot/tab/space.`,
      )
      assert.notEqual(
        f.tab,
        f.space,
        `padding site "${s.site}" fixture "${f.slot}" has identical tab and space ` +
          `forms, so it can never discriminate.`,
      )
      assert.ok(
        f.tab.includes('\t'),
        `padding site "${s.site}" fixture "${f.slot}" is named a tab fixture but ` +
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
const MULTI_SLOT = {
  'admonition_open, the "title" and [label] metadata slots': 2,
  'code_fence_info, the "header" and [label] metadata slots': 2,
  'link_title, the slot before the quoted run': 2,
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

// A deferral is a claim about the engines, so it has to be written down and
// readable. An empty string is not a reason, and a MISSING field is not one
// either: with the engine loop gone, a padding site that declared nothing
// would look identical to one that had been checked, which is precisely the
// carve#755 shape. So the field is required at every padding site, and adding
// a seventh without a reason fails here.
test('every padding site states why its engine half is deferred', () => {
  for (const s of SITES.filter((x) => x.role === 'padding')) {
    assert.ok(
      typeof s.engineDeferred === 'string' && s.engineDeferred.length > 0,
      `padding site "${s.site}" must state why the engine half is deferred. ` +
        `carve-js accepts a tab at every padding slot and so diverges from the ` +
        `production; if that has changed, assert it here instead of deferring.`,
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
for (const { site, fixtures } of SITES.filter((s) => s.role === 'padding')) {
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
for (const { site, fixtures } of SITES.filter((s) => s.role === 'padding')) {
  for (const { slot, tab, space } of fixtures) {
    test(`padding slot rejects a tab in the oracle: ${site} - ${slot}`, () => {
      assert.notEqual(
        renderDoc(parse(tab)),
        renderDoc(parse(space)),
        `a tab in this padding slot parsed as the space form does in the ` +
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
