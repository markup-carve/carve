/*
 * The VALUE panel's signature and its declaration.
 *
 * `scripts/spec/ast-values.mjs` had no test file at all: it is reachable only
 * from `npm run ast:check`, which needs three built engine checkouts, so every
 * rule in it was exercised nowhere on a host without them.
 *
 * The reconciliation is the part that most needed one. Its three directions
 * lived inline in `reportValueDisagreements`, BELOW an early return taken
 * whenever nothing diverged - so the direction that fires when a field stops
 * diverging could not fire in the state it names. Proven rather than argued:
 * appending a fabricated `table_cell.align  42  x` to
 * resources/ast-value-divergence.txt and running `npm run ast:check` printed
 * "the engines publish the same values everywhere" and exited 0 (carve#534).
 *
 * So the first test below is the one that would have caught it, and it is a
 * real A/B: it fails against the code as it was.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { compareValues, reconcileDeclared, valueSignature } from '../scripts/spec/ast-values.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('FIXED fires when NOTHING diverges', () => {
  const problems = reconcileDeclared(new Map(), 'table_cell.align  42  carve#784\n')
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^FIXED\s+table_cell\.align no longer diverges - delete its line$/)
})

test('NEW: a field that diverges and is not declared', () => {
  const problems = reconcileDeclared(
    new Map([['heading.attrs.id', new Set(['a.crv', 'b.crv'])]]),
    '# nothing declared\n',
  )
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^NEW\s+heading\.attrs\.id diverges in 2 document\(s\)/)
})

test('COUNT: a declared field whose document count moved', () => {
  const problems = reconcileDeclared(
    new Map([['table_cell.align', new Set(['a.crv', 'b.crv', 'c.crv'])]]),
    'table_cell.align  5  carve#784\n',
  )
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^COUNT\s+table_cell\.align declares 5 document\(s\), measured 3$/)
})

test('an exact declaration produces no problem', () => {
  const problems = reconcileDeclared(
    new Map([['table_cell.align', new Set(['a.crv', 'b.crv'])]]),
    '# comment\n\ntable_cell.align  2  carve#784\n',
  )
  assert.deepEqual(problems, [])
})

test('DOCUMENTS, not occurrences', () => {
  // The unit the file's own header declares. An array with a repeat is two
  // occurrences in one document, and must count as one.
  const problems = reconcileDeclared(
    new Map([['table_cell.align', ['a.crv', 'a.crv', 'b.crv']]]),
    'table_cell.align  2  carve#784\n',
  )
  assert.deepEqual(problems, [])
})

test('a malformed declaration line is an error, never a silent zero', () => {
  const problems = reconcileDeclared(new Map(), 'table_cell.align  lots  carve#784\n')
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^MALFORMED\s+line 1/)
})

test('the shipped declaration parses', () => {
  const problems = reconcileDeclared(
    new Map(),
    readFileSync(resolve(root, 'resources/ast-value-divergence.txt'), 'utf8'),
  )
  // Every problem must be a FIXED - i.e. a real declared line - and never a
  // MALFORMED one. The file is comment-only today, so this is currently the
  // empty list; it is asserted this way so the test keeps meaning something
  // once a line is added.
  for (const p of problems) assert.match(p, /^FIXED/, p)
})

test('the signature keeps scalars and drops positions', () => {
  const sig = valueSignature({
    type: 'table_cell',
    align: 'right',
    pos: { startOffset: 0, endOffset: 3 },
    children: [{ type: 'text', value: 'a' }],
  })
  assert.deepEqual(sig.map((s) => s.type), ['table_cell', 'text'])
  assert.deepEqual(sig[0].fields, ['align="right"'])
  assert.ok(!JSON.stringify(sig).includes('startOffset'))
})

test('a value disagreement is attributed to the engine that stands alone', () => {
  const tree = (align) => valueSignature({ type: 'table_cell', align, children: [] })
  const found = compareValues(
    new Map([
      ['carve-js', tree('right')],
      ['carve-rs', tree('right')],
      ['carve-php', tree('left')],
    ]),
    'x.crv',
  )
  assert.equal(found.length, 1)
  assert.equal(found[0].key, 'table_cell.align')
  assert.equal(found[0].engines['carve-php'], '"left"')
  assert.equal(found[0].engines['carve-js'], '"right"')
})
