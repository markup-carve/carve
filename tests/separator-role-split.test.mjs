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
    engineDeferred:
      'carve-js already renders ```<tab>js identically to ``` js, so an assertion here ' +
      'would pass; it is omitted because carve#894 reports carve-rs as still rejecting ' +
      'the tab, and one green engine would misreport the ruling as implemented. See the ' +
      'file header.',
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
    engineDeferred:
      'same as the slot above, and separably testable (a tab after `js` needs no tab in ' +
      'the opener slot): carve-js already agrees, carve-rs is reported not to, so the ' +
      'cross-engine gates carry this rather than one engine here.',
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

// A padding site is engine-checked unless it says in writing why it cannot be.
// Without this, a site added with no `tab`/`space` fixtures would simply not
// appear in the loop below and nobody would notice the engine half quietly
// shrinking - the check-that-cannot-fail class tracked in carve#755.
test('every padding site is either engine-checked or deferred with a reason', () => {
  for (const s of SITES.filter((x) => x.role === 'padding')) {
    const hasFixtures = typeof s.tab === 'string' && typeof s.space === 'string'
    const deferred = typeof s.engineDeferred === 'string' && s.engineDeferred.length > 0
    assert.ok(
      hasFixtures !== deferred,
      `padding site "${s.site}" must carry either a tab/space fixture pair or a ` +
        `written engineDeferred reason, and not both.`,
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
