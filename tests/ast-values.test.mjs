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

const shippedDeclaration = () =>
  readFileSync(resolve(root, 'resources/ast-value-divergence.txt'), 'utf8')

test('the shipped declaration parses and currently needs no baseline rows', () => {
  // Held to EMPTY, the way `tests/ast-spans.test.mjs` holds its own ledger.
  //
  // This assertion used to be `for (const p of problems) assert.match(p,
  // /^FIXED/)`, which cannot fail on a declared row: reconciling against an
  // empty measurement turns EVERY row into a FIXED, so the loop was handed the
  // exact shape it accepts. Appending `text.value  3  x` to the shipped file
  // left this suite green at 9 passing (carve#1271) - the same measurement that
  // opened carve#534 against the script, now reproduced against the test that
  // replaced it.
  //
  // NO FLOOR still, and the old comment was right about that much: a ledger of
  // zero divergences is the state the panel is trying to reach, so requiring a
  // minimum row count would be a gate that only works while something is wrong.
  // The defect was the other end. Refusing to require rows is not the same as
  // accepting any, and only one of those two was implemented.
  //
  // What the empty measurement means here: this suite runs on a host with no
  // engine checkouts, so it cannot measure divergence itself. `npm run
  // ast:check` does that, and it has verified the file empty against all three
  // engines. Between those runs, the honest per-PR statement is "the ledger is
  // still empty", and that is what this asserts. A row that is genuinely owed
  // gets established by ast:check and moves this line with it - deliberately,
  // in the commit that measures it, rather than slipping past unread.
  assert.deepEqual(reconcileDeclared(new Map(), shippedDeclaration()), [])
})

test('and a real divergence the shipped file does not declare is caught', () => {
  // The other direction, against the SHIPPED text rather than a literal. The
  // test above would still pass if the file somehow declared everything, and
  // the NEW case two tests up proves the reconciler on a fabricated
  // declaration; neither one asserts that the file as shipped still lets an
  // undeclared divergence through.
  const problems = reconcileDeclared(
    new Map([['table_cell.align', new Set(['a.crv', 'b.crv'])]]),
    shippedDeclaration(),
  )
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^NEW\s+table_cell\.align diverges in 2 document\(s\)/)
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
