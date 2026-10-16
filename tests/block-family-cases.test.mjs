import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blockFamilyCases, PROBES, FOLLOWERS } from '../scripts/lib/block-family-cases.mjs'

test('the block-family generator is deterministic and bounded', () => {
  const cases = blockFamilyCases()
  assert.deepEqual(cases, blockFamilyCases())
  assert.equal(cases.length, 6025)
  assert.equal(new Set(cases.map(c => c.name)).size, cases.length)
  assert.equal(new Set(cases.map(c => c.source)).size, cases.length)
})

test('every probe and every follower reaches every single container', () => {
  const cases = blockFamilyCases()
  for (const stack of ['none', 'note', 'quote', 'item', 'ordered', 'desc', 'footnote'])
    for (const probe of Object.keys(PROBES)) for (const follower of Object.keys(FOLLOWERS)) {
      // At column 0 the content-column follower is the column-0 one, deduplicated.
      if (follower === 'content' && (stack === 'none' || stack === 'note')) continue
      assert.ok(cases.some(c => c.name.startsWith(`s:${stack}-`) && c.meta.probe === probe && c.meta.follower === follower),
        `${stack} / ${probe} / ${follower}`)
    }
})

test('a quoted stack is probed with and without its markers', () => {
  const quoted = blockFamilyCases().filter(c => c.meta.stack?.includes('quote'))
  assert.ok(quoted.some(c => c.meta.marked) && quoted.some(c => c.meta.marked === false))
})
