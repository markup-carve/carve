import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToHtml } from '@markup-carve/carve'

test('the HTML API returns a fragment without a final LF', () => {
  assert.equal(carveToHtml('x'), '<p>x</p>')
})
