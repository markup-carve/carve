/*
 * The two normative files, at the two slots carve#888 found them contradicting
 * each other about a LINE BREAK.
 *
 * Both are invisible to every other gate, for two different reasons, and that
 * is why they need a file rather than a corpus document.
 *
 *   1. `quoted_value` -- `resources/grammar.ebnf` built the value out of
 *      `character`, which is any Unicode character, so a newline inside the
 *      quotes was CONTENT; `resources/carve-core.ohm` excluded one at the same
 *      slot. Corpus 274 pins the behavior, but the corpus is rendered through
 *      the oracle, which is the ohm side - so the EBNF could be respelled back
 *      and nothing would move. No engine reads `resources/grammar.ebnf`
 *      (carve#755).
 *
 *   2. `blockAttrs` accepted a BLANK line at every one of its slots, where the
 *      EBNF says a blank line ENDS a block attribute and is never interior
 *      padding. That one is not merely unpinned, it is UNREACHABLE:
 *      `scripts/spec/layout.mjs` bails on a blank line before `blockAttrs` is
 *      matched, so no document can show it in either direction. The rule is
 *      driven directly here, the way tests/ohm-block-layer.test.mjs drives the
 *      block layer (carve#916).
 *
 * Both directions are asserted at both slots. A rule pinned only by its
 * rejections is satisfied by a rule that matches nothing, and a rule pinned
 * only by its accepts is satisfied by one widened to `any*`.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ohm from 'ohm-js'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const grammarText = readFileSync(resolve(repo, 'resources/grammar.ebnf'), 'utf8')
const g = ohm.grammar(readFileSync(resolve(repo, 'resources/carve-core.ohm'), 'utf8'))

// Productions wrap, so match against the flattened text, as
// tests/separator-role-split.test.mjs does.
const flat = grammarText.replace(/\n\s*/g, ' ')

test('grammar.ebnf excludes a newline from a quoted attribute value', () => {
  assert.match(
    flat,
    /quoted_value = '"', \{ escaped_char \| \(character - '"' - '\\' - newline\) \}, '"' \| "'", \{ escaped_char \| \(character - "'" - '\\' - newline\) \}, "'" ;/,
    'resources/grammar.ebnf no longer excludes `newline` from `quoted_value`.\n' +
      '  `character` is ANY Unicode character, so dropping the term makes a line break\n' +
      '  content inside the quotes - which lets an INLINE attribute block span lines,\n' +
      '  the one thing carve#897 ruled it cannot do, and contradicts the ohm file at the\n' +
      '  same slot. See A QUOTED VALUE STOPS AT THE NEWLINE in PART 4.',
  )
})

// The executable side of the same production, in both forms it is read in.
const QUOTED_VALUE = [
  { rule: 'attrs', src: '{k="a b"}', accept: true, what: 'a quoted value on one line, inline' },
  { rule: 'attrs', src: '{k="a\nb"}', accept: false, what: 'a newline inside a quoted value, inline' },
  { rule: 'attrs', src: "{k='a\nb'}", accept: false, what: 'the single-quoted form, inline' },
  { rule: 'blockAttrs', src: '{k="a b"}', accept: true, what: 'a quoted value on one line, block' },
  { rule: 'blockAttrs', src: '{k="a\nb"}', accept: false, what: 'a newline inside a quoted value, block' },
]

// `block_attributes` admits a line break BETWEEN tokens and never inside one,
// and admits AT MOST ONE per slot: `opt_pad = opt_ws, [continuation]`,
// `attr_separator = (whitespace | continuation), opt_ws`, and
// `continuation = newline, opt_ws` - "a single line break + indent; NOT a blank
// line". Every slot is listed, because they revert independently.
const BLOCK_LINE_BREAKS = [
  { src: '{.a .b}', accept: true, what: 'no line break at all' },
  { src: '{.a\n.b}', accept: true, what: 'one break as the separator' },
  { src: '{\n.a}', accept: true, what: 'one break as the opening padding' },
  { src: '{.a\n}', accept: true, what: 'one break as the closing padding' },
  { src: '{\n .a\n}', accept: true, what: 'a break plus indentation, both slots' },
  { src: '{.a\n\n.b}', accept: false, what: 'a BLANK line as the separator' },
  { src: '{\n\n.a}', accept: false, what: 'a BLANK line as the opening padding' },
  { src: '{.a\n\n}', accept: false, what: 'a BLANK line as the closing padding' },
  { src: '{.a\n\n\n.b}', accept: false, what: 'three breaks' },
  { src: '{.a\n.b\n.c}', accept: true, what: 'one break at each of two separators' },
]

for (const { rule, src, accept, what } of QUOTED_VALUE) {
  test(`${rule}: ${what}`, () => {
    assert.equal(
      g.match(src, rule).succeeded(),
      accept,
      `resources/carve-core.ohm ${accept ? 'must accept' : 'must reject'} ${JSON.stringify(src)} ` +
        `as \`${rule}\`. A quoted value stops at the newline in both forms (carve#888).`,
    )
  })
}

for (const { src, accept, what } of BLOCK_LINE_BREAKS) {
  test(`blockAttrs: ${what}`, () => {
    assert.equal(
      g.match(src, 'blockAttrs').succeeded(),
      accept,
      `resources/carve-core.ohm ${accept ? 'must accept' : 'must reject'} ${JSON.stringify(src)} ` +
        'as `blockAttrs`. A block attribute admits AT MOST ONE line break per slot; a BLANK ' +
        'line ends the block and is never interior padding (grammar.ebnf, `continuation`).',
    )
  })
}

test('both directions are covered at both slots, and the counts are asserted', () => {
  // Zero rejections out of zero rejecting fixtures reads exactly like a rule
  // that rejects correctly. The denominators are what make the two loops above
  // a check rather than a list.
  assert.equal(QUOTED_VALUE.length, 5, 'the quoted-value table lost or gained rows')
  assert.equal(BLOCK_LINE_BREAKS.length, 10, 'the block-line-break table lost or gained rows')
  for (const [name, table] of [['QUOTED_VALUE', QUOTED_VALUE], ['BLOCK_LINE_BREAKS', BLOCK_LINE_BREAKS]]) {
    assert.ok(table.some((r) => r.accept), `${name} has no ACCEPT row; a rule matching nothing would pass`)
    assert.ok(table.some((r) => !r.accept), `${name} has no REJECT row; a rule widened to any* would pass`)
  }
  const inlineRows = QUOTED_VALUE.filter((r) => r.rule === 'attrs')
  const blockRows = QUOTED_VALUE.filter((r) => r.rule === 'blockAttrs')
  assert.ok(inlineRows.length >= 2 && blockRows.length >= 2, 'one production, and both of its readers')
})
