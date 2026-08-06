/*
 * The separator/padding split is a spec decision that nothing else can see.
 *
 * PART 7's MARKER SEPARATORS AND PADDING SLOTS clause divides the whitespace
 * on a marker line into two roles: the slot that decides WHICH construct the
 * line opens is a `space` and a tab never satisfies it, while whitespace
 * between two tokens on an already-decided line is a `whitespace` padding slot
 * and a tab does. Nine productions were classified under that rule (carve#878).
 *
 * Without this file the classification is unobservable. Every other gate reads
 * behavior, and no engine reads resources/grammar.ebnf, so flipping any of the
 * nine terminals back leaves the whole suite green - the defect class tracked
 * in carve#755. Each site below therefore pins BOTH directions: the terminal
 * the production must carry, and the terminal it must NOT carry, so a silent
 * re-spelling in either direction fails here.
 *
 * The engine half is deliberately asymmetric. The four PADDING sites are
 * additionally checked against the pinned engine, because the spec and the
 * implementations already agree there and must keep agreeing. The four MARKER
 * SEPARATOR sites are NOT checked against an engine: all four implementations
 * still accept a tab after the colon fence, which is what carve#878 step 2
 * corrects. Pinning today's behavior there would be pinning the bug, and the
 * test would have to be deleted by the fix.
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
    // metadata slots and still spells them `space+`. That is deliberate - the
    // code fence is NOT one of the nine sites carve#878 ruled on - so an
    // unanchored pattern would match it and this test would be about the
    // wrong production.
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
]

test('all nine classified sites are present', () => {
  assert.equal(SITES.length, 8, 'the nine slots live in eight productions')
  assert.equal(SITES.filter((s) => s.role === 'separator').length, 4)
  assert.equal(SITES.filter((s) => s.role === 'padding').length, 4)
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

// The padding half is the half the implementations already get right, so the
// spec and the engine are checked against each other. A regression here means
// either the engine narrowed a padding slot to a literal space, or the spec
// widened a slot the engine never widened.
for (const { site, tab, space } of SITES.filter((s) => s.role === 'padding')) {
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
