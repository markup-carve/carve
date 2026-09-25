/*
 * The gate's ruled-`style` matcher must accept the messages the engines ACTUALLY
 * emit. It was anchored `$` straight after the element's tag, so it matched only
 * a bare form no engine writes: `isRuledStyleRow` was always 0, and the gate
 * could never reach its "this engine ships the ruled shape, drop it from
 * CLAUSE_PENDING" branch. It would have gone on printing PENDING for an engine
 * that had already shipped (carve-php#2368).
 *
 * These are the emitted strings, copied from carve-js#2052 and carve-php#2391.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { isRuledStyleRow } from '../scripts/lib/ruled-style-message.mjs'

const preserved = (message) => ({ code: 'attribute-preserved', message })

const EMITTED = [
  'Preserved style with a denied URL scheme in a declaration value on <form> in the raw HTML this element is kept as',
  'Preserved style with a construct the CSS sanitizer refuses on <p> inside the raw HTML <form> is kept as',
]

test('the matcher accepts the messages the engines emit', () => {
  for (const message of EMITTED) {
    assert.equal(isRuledStyleRow(preserved(message)), true, message)
  }
})

test('the pinned text alone still counts, so the clause can be quoted bare', () => {
  assert.equal(
    isRuledStyleRow(preserved('Preserved style with a denied URL scheme in a declaration value on <form>')),
    true,
  )
})

test('it refuses a style row that is not the ruled shape', () => {
  for (const message of [
    'Preserved attribute style on <form> in the raw HTML this element is kept as',
    'CSS declaration background was not mapped',
    'CSS declarations may not have a Carve mapping',
  ]) {
    assert.equal(isRuledStyleRow(preserved(message)), false, message)
  }
})

test('it refuses a ruled message carried by another code', () => {
  assert.equal(
    isRuledStyleRow({ code: 'style-unmapped', message: EMITTED[0] }),
    false,
  )
})

test('a tag is required, so the reason alone is not a match', () => {
  assert.equal(
    isRuledStyleRow(preserved('Preserved style with a denied URL scheme in a declaration value')),
    false,
  )
})
