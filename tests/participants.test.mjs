/*
 * The participant guard (carve#755, variant 2: "asserts over an empty set").
 *
 * These are the assertions a runner makes about ITSELF, so they are the ones
 * least likely to be exercised by ordinary use: a run that compared nothing
 * looks like a run that compared everything, and the number printed in the
 * report only helps a reader who already knows what it should be.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { miscount, shortfall } from '../scripts/spec/participants.mjs'

test('a sufficient count is silent', () => {
  assert.equal(shortfall({ label: 'CORPUS', actual: 610, atLeast: 100 }), null)
  assert.equal(miscount({ label: 'CORPUS', actual: 610, expected: 610 }), null)
})

test('an empty population is a finding, not a pass', () => {
  // The case that motivated the whole issue: zero participants reported as
  // success.
  const message = shortfall({ label: 'CORPUS', actual: 0, atLeast: 1, of: 'documents' })
  assert.match(message, /compared 0 documents but expected at least 1/)
  assert.match(message, /not a pass/)
})

test('one short is still a finding', () => {
  // A filter that quietly drops a single file is the realistic version, and the
  // one a "greater than zero" check would miss.
  assert.ok(shortfall({ label: 'x', actual: 99, atLeast: 100 }))
  assert.ok(miscount({ label: 'x', actual: 609, expected: 610 }))
})

test('miscount catches a population that GREW, which a floor cannot', () => {
  // Counting a category twice reads as more coverage under a floor check.
  assert.equal(shortfall({ label: 'x', actual: 611, atLeast: 610 }), null)
  assert.match(miscount({ label: 'x', actual: 611, expected: 610 }), /expected exactly 610/)
})

test('a count that is not a count fails loudly', () => {
  // `undefined` arrives when a runner renames the variable it counts and the
  // guard keeps reading the old one - silently true under any comparison.
  assert.match(
    shortfall({ label: 'x', actual: undefined, atLeast: 1 }),
    /not a count at all/,
  )
  assert.match(shortfall({ label: 'x', actual: NaN, atLeast: 1 }), /not a count at all/)
  assert.match(shortfall({ label: 'x', actual: -1, atLeast: 1 }), /not a count at all/)
})
