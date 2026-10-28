import test from 'node:test'
import assert from 'node:assert/strict'
import { targetDriftKeys } from '../scripts/lib/target-drift.mjs'

test('a matching fixture can identify two declared lagging engines', () => {
  const slug = 'example'
  const outputs = [['js', 'old'], ['php', 'new'], ['rust', 'old']]
  const entries = new Map([
    [`html/js/${slug}`, {}],
    [`html/rust/${slug}`, {}],
  ])
  assert.deepEqual(targetDriftKeys('html', slug, outputs, entries, 'new'), [
    `html/js/${slug}`,
    `html/rust/${slug}`,
  ])
  assert.equal(targetDriftKeys('html', slug, outputs, entries, 'old'), null)
  entries.delete(`html/rust/${slug}`)
  assert.equal(targetDriftKeys('html', slug, outputs, entries, 'new'), null)
})
