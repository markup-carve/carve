/*
 * The separator/padding split is a spec decision that nothing else can see.
 *
 * PART 7's MARKER SEPARATORS AND PADDING SLOTS clause divides the whitespace
 * on a marker line into two roles: the slot that decides WHICH construct the
 * line opens is a `space` and a tab never satisfies it, while whitespace
 * between two tokens on an already-decided line is a `whitespace` padding slot
 * and a tab does. Nine slots were classified under that rule (carve#878); the
 * code fence's three joined them in carve#894, for twelve.
 *
 * Without this file the classification is unobservable. Every other gate reads
 * behavior, and no engine reads resources/grammar.ebnf, so flipping any of the
 * terminals back leaves the whole suite green - the defect class tracked in
 * carve#755. Each site below therefore pins BOTH directions: the terminal the
 * production must carry, and the terminal it must NOT carry, so a silent
 * re-spelling in either direction fails here.
 *
 * THREE CHECKS RUN PER PADDING SITE, against three different artifacts:
 *
 *   1. the grammar text, above - what resources/grammar.ebnf spells.
 *   2. the ORACLE (scripts/spec/layout.mjs + resources/carve-core.ohm), which
 *      is executable, so every padding site is checked and none is skipped.
 *   3. the pinned ENGINE, which is skipped where `engineDeferred` says why.
 *
 * Check 2 is why every padding site now carries a tab/space fixture pair even
 * when its engine half is deferred: the two artifacts are deferred for engine
 * reasons that say nothing about the oracle, and the oracle is a spec artifact
 * rather than an implementation. carve#888 found the gap this leaves - the
 * oracle read `[t](/u<TAB>"T")` as literal text while grammar.ebnf had spelled
 * that slot `whitespace` since carve#878, and nothing could see it.
 *
 * The engine half is deliberately partial, and the two gaps are NOT the same
 * gap. The loop below runs one engine: the pinned `@markup-carve/carve`
 * (carve-js). So "checked against the engine" never means "checked against the
 * implementations", and the two omissions have to be read separately.
 *
 *   - The four MARKER SEPARATOR sites are omitted because carve-js gives the
 *     PRE-ruling answer: it still accepts a tab after the colon fence, which
 *     carve#878 step 2 corrects. Asserting it would pin the bug, and the fix
 *     would have to delete the assertion.
 *
 *   - The two code-fence PADDING sites are omitted for a different reason.
 *     carve-js already gives the POST-ruling answer here - measured while
 *     writing this, ```<tab>js and ```js<tab>"T"<tab>[L] render byte-identical
 *     to their space forms - so an assertion would pass today and keep
 *     passing. It is left out because it would be misleading rather than
 *     wrong: carve#894 reports carve-rs as still rejecting the tab, so the
 *     ruling is not yet implemented across the engines, and a green
 *     single-engine assertion in this file would read as though it were. The
 *     cross-engine gates (claims:check, compare:impls) are where that question
 *     belongs, and they are what should gain a row once carve-rs relaxes.
 *
 * Note the two corrections run in opposite directions: the colon fence tightens
 * (four implementations lose the tab), the code fence relaxes (one gains it).
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

  // --- PADDING SLOTS: `whitespace`, a tab satisfies them --------------------
  {
    role: 'padding',
    site: 'admonition_open, the "title" and [label] metadata slots',
    // Anchored on the production: `code_fence_info` carries the same two
    // metadata slots, and since carve#894 spells them the same way. An
    // unanchored pattern would match either production, so each site's
    // assertion would stop being about the site it names.
    required: /admonition_open = [^;]*\[whitespace\+, quoted_title\], \[whitespace\+, label\] ;/,
    forbidden: /admonition_open = [^;]*\[space\+, (?:quoted_title|label)\]/,
    why: 'the type word has already decided the block; the title and label are metadata',
    // `::: note` is fixed before either slot is reached.
    tab: '::: note\t"T"\t[L]\nx\n:::\n',
    space: '::: note "T" [L]\nx\n:::\n',
  },
  {
    role: 'padding',
    site: 'frontmatter_open, the slot before the format token',
    required: /frontmatter_open = "---", \[whitespace\], \[frontmatter_format\]/,
    forbidden: /frontmatter_open = "---", \[space\]/,
    why: 'the `---` pair has already decided the block; the token names the metadata dialect',
    tab: '---\tyaml\na: 1\n---\nx\n',
    space: '--- yaml\na: 1\n---\nx\n',
  },
  {
    role: 'padding',
    site: 'link_title, the slot before the quoted run',
    // Both alternatives, double- and single-quoted, carry the same terminal.
    required: /link_title = whitespace, \('"'.*\| whitespace, \("'"/,
    forbidden: /link_title = space,|\| space, \("'"/,
    why: 'a link is a link once its destination is read; the title is trailing metadata',
    tab: '[t](/u\t"T")\n',
    space: '[t](/u "T")\n',
  },
  {
    role: 'padding',
    site: 'reference_definition, the slot before the trailing attributes',
    required: /\[link_title\], \[whitespace, attributes\], newline/,
    forbidden: /\[link_title\], \[space, attributes\]/,
    why: 'the definition is complete at `[a]: /url`; the attribute block is trailing metadata',
    tab: '[a]: /u\t{.c}\n\n[a][]\n',
    space: '[a]: /u {.c}\n\n[a][]\n',
  },
  {
    role: 'padding',
    site: 'fenced_code_block, the slot before the info string',
    required: /fenced_code_block = code_fence_open, \[whitespace\], \[code_fence_info\]/,
    forbidden: /fenced_code_block = code_fence_open, \[space\]/,
    why: 'the fence run has already decided the block; the info string names a language',
    tab: '```\tjs\nx\n```\n',
    space: '``` js\nx\n```\n',
    engineDeferred:
      'carve-js already renders ```<tab>js identically to ``` js, so an assertion here ' +
      'would pass; it is omitted because carve#894 reports carve-rs as still rejecting ' +
      'the tab, and one green engine would misreport the ruling as implemented. See the ' +
      'file header. The ORACLE half runs regardless - it is not an engine.',
  },
  {
    role: 'padding',
    site: 'code_fence_info, the "header" and [label] metadata slots',
    // One pattern covers all three spellings on purpose. The label slot is
    // written twice, once per alternative, and it is one slot with one role:
    // pinning them separately would let a half-revert pass.
    required:
      /code_fence_info = \( language_info, \[whitespace\+, quoted_title\], \[whitespace\+, label\] \) \| \( quoted_title, \[whitespace\+, label\] \) \| label ;/,
    forbidden: /code_fence_info = [^;]*\[space\+/,
    why: 'the same two metadata slots the admonition opener carries, after the block is decided',
    tab: '``` js\t"T"\t[L]\nx\n```\n',
    space: '``` js "T" [L]\nx\n```\n',
    engineDeferred:
      'same as the slot above, and separably testable (a tab after `js` needs no tab in ' +
      'the opener slot): carve-js already agrees, carve-rs is reported not to, so the ' +
      'cross-engine gates carry this rather than one engine here. The ORACLE half runs ' +
      'regardless - it is not an engine.',
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
      `resources/grammar.ebnf no longer spells this slot as a ${role} ` +
        `(${role === 'separator' ? '`space`' : '`whitespace`'}).\n` +
        `  ${site}\n  role: ${why}\n` +
        `  See PART 7, MARKER SEPARATORS AND PADDING SLOTS (carve#878).`,
    )
    assert.doesNotMatch(
      flat,
      forbidden,
      `resources/grammar.ebnf spells this slot with the OTHER role's terminal.\n` +
        `  ${site}\n  role: ${why}\n` +
        `  See PART 7, MARKER SEPARATORS AND PADDING SLOTS (carve#878).`,
    )
  })
}

// Every padding site carries fixtures, with no exception: the oracle loop
// below runs them all, and a site with no fixtures would silently drop out of
// it - the check-that-cannot-fail class tracked in carve#755. `engineDeferred`
// no longer substitutes for fixtures; it only says why the ENGINE half of the
// pair is skipped, which is a statement about carve-rs, not about the oracle.
test('every padding site carries a tab/space fixture pair', () => {
  for (const s of SITES.filter((x) => x.role === 'padding')) {
    assert.ok(
      typeof s.tab === 'string' && typeof s.space === 'string',
      `padding site "${s.site}" must carry a tab/space fixture pair; the oracle ` +
        `check runs at every padding site and cannot skip one.`,
    )
  }
})

// A deferral is a claim about the engines, so it has to be written down and
// readable. An empty string is not a reason.
test('an engine deferral states its reason', () => {
  for (const s of SITES.filter((x) => x.role === 'padding' && 'engineDeferred' in x)) {
    assert.ok(
      typeof s.engineDeferred === 'string' && s.engineDeferred.length > 0,
      `padding site "${s.site}" declares engineDeferred but gives no reason.`,
    )
  }
})

// The engine-checked padding sites are the ones the implementations already get
// right, so the spec and the engine are checked against each other. A
// regression there means either the engine narrowed a padding slot to a literal
// space, or the spec widened a slot the engine never widened.
//
// The code-fence sites are deliberately absent: carve-rs still rejects a tab in
// a fence opener, so asserting today's behavior would pin exactly what
// carve#894 rules against. Same reasoning as the separator half above.
for (const { site, tab, space } of SITES.filter(
  (s) => s.role === 'padding' && !s.engineDeferred,
)) {
  test(`padding slot admits a tab in the pinned engine: ${site}`, () => {
    assert.equal(
      carveToHtml(tab),
      carveToHtml(space),
      `a tab in this padding slot no longer parses as the space form does.\n` +
        `  tab form:   ${JSON.stringify(tab)}\n  space form: ${JSON.stringify(space)}\n` +
        `  The production says \`whitespace\` here (PART 7, carve#878).`,
    )
  })
}

// The ORACLE half, at EVERY padding site including the engine-deferred ones.
// resources/carve-core.ohm and scripts/spec/layout.mjs are the executable
// spelling of these productions, so a slot they narrow to a literal space is
// the same defect as grammar.ebnf spelling it `space` - and it is invisible
// everywhere else, because the corpus only carries a tab in a padding slot
// where someone thought to write one. carve#888: `destTitle` in the ohm file
// read `" "+` while grammar.ebnf said `whitespace`, so `[t](/u<TAB>"T")`
// rendered as literal text here and as a titled link in all three engines.
for (const { site, tab, space } of SITES.filter((s) => s.role === 'padding')) {
  test(`padding slot admits a tab in the oracle: ${site}`, () => {
    assert.equal(
      renderDoc(parse(tab)),
      renderDoc(parse(space)),
      `a tab in this padding slot does not parse as the space form does in the ` +
        `executable spec (scripts/spec/layout.mjs, resources/carve-core.ohm).\n` +
        `  tab form:   ${JSON.stringify(tab)}\n  space form: ${JSON.stringify(space)}\n` +
        `  The production says \`whitespace\` here (PART 7, carve#878).`,
    )
  })
}

// The OTHER direction, for the one slot carve#888 narrowed.
//
// `whitespace` is `' ' | '\t'` and nothing else, so widening a padding slot
// past that pair is as wrong as narrowing it - and scripts/spec/layout.mjs had
// done exactly that, matching `\p{White_Space}` before the definition form's
// title. Both spellings of `link_title` are checked, because the production is
// one production used at two sites and the bug was that they disagreed.
//
// Checked against the ORACLE ONLY, deliberately. carve-js accepts the whole
// White_Space property in this slot (measured: U+00A0, U+2003, U+202F and
// U+0085 all yield `title="T"`), so it is wider than the production here and
// an engine assertion would pin that. That divergence is reported upstream
// rather than encoded, and no corpus case carries one of these characters, so
// no cross-engine golden takes a position on it.
//
// Scope note, so a later reader does not mistake this for a general rule: the
// oracle still admits the wider class at three other padding slots - the
// frontmatter format token, the definition's trailing attributes, and the code
// fence opener. That inconsistency is real and unfixed; it is simply not what
// carve#888 changed, and pinning it here would assert a claim no artifact yet
// makes good on.
const OUTSIDE_CLASS = '\u00a0' // NBSP: White_Space, but neither ' ' nor '\t'

for (const [form, outside, spaceForm] of [
  ['inline', `[t](/u${OUTSIDE_CLASS}"T")\n`, '[t](/u "T")\n'],
  ['reference definition', `[a]: /u${OUTSIDE_CLASS}"T"\n\n[a][]\n`, '[a]: /u "T"\n\n[a][]\n'],
]) {
  test(`link_title admits no whitespace outside ' ' | '\\t' in the oracle: ${form}`, () => {
    assert.notEqual(
      renderDoc(parse(outside)),
      renderDoc(parse(spaceForm)),
      `the oracle read a title after a whitespace character the production does not ` +
        `admit.\n  outside-class form: ${JSON.stringify(outside)}\n` +
        `  space form:         ${JSON.stringify(spaceForm)}\n` +
        `  \`whitespace\` is \`' ' | '\\t'\` (PART 7, carve#878; carve#888).`,
    )
  })
}
