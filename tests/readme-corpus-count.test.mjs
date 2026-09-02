/*
 * The README's conformance row counts the corpus, and nothing ever checked it.
 *
 * It said "492 corpus examples ... plus 28 optional-corpus examples" while the
 * corpus held 1,025 and 41. Both numbers were right the day they were written,
 * and every corpus addition since made them a little more wrong - silently,
 * because the row is prose and the corpus is a directory, and no test joined
 * the two. The row is the first number a reader sees about how much of the
 * language is pinned, so understating it by half is not a cosmetic slip.
 *
 * The required-corpus claim is deliberately a floor ("Over N"), so routine
 * growth does not churn the README on every merge. A floor rots in one
 * direction only - downward, as the corpus grows past it - so this test pins
 * both ends: the floor must be true, and it must not trail the real count by
 * more than a release cycle's worth of growth.
 *
 * The optional corpus is small enough that an exact number stays readable, so
 * it is pinned exactly.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readme = readFileSync(resolve(root, 'README.md'), 'utf8')

/** How far the README's floor may trail the real count before it must be raised. */
const SLACK = 250

const examples = (dir) =>
  readdirSync(resolve(root, dir)).filter((name) => name.endsWith('.crv')).length

test('the README\'s corpus floor is true and not stale', () => {
  const match = readme.match(/More than ([\d,]+) core\s+input\/output tests/)
  assert.ok(match, 'the README states a floor for the core input/output tests')

  const claimed = Number(match[1].replace(/,/g, ''))
  const actual = examples('tests/corpus')

  assert.ok(
    actual >= claimed,
    `README claims more than ${claimed} core tests; tests/corpus holds ${actual}`,
  )
  assert.ok(
    claimed >= actual - SLACK,
    `tests/corpus holds ${actual} examples; the README floor of ${claimed} trails it by more than ${SLACK} - raise it`,
  )
})

test('the README\'s optional-corpus count is exact', () => {
  const match = readme.match(/and ([\d,]+) optional input\/output tests/)
  assert.ok(match, 'the README states the optional input/output test count')

  assert.equal(
    Number(match[1].replace(/,/g, '')),
    examples('tests/corpus-optional'),
    'the README optional-corpus count matches tests/corpus-optional',
  )
})
