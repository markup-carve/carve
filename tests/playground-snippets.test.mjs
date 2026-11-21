// Every example the playground offers is canonical 0.2 source and lints clean.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { format, lint } from '../docs/.vitepress/engine.js'
import { SNIPPETS } from '../docs/.vitepress/examples/snippets.js'

test('the picker offers six to ten examples with unique ids', () => {
  assert.ok(SNIPPETS.length >= 6 && SNIPPETS.length <= 10)
  assert.equal(new Set(SNIPPETS.map((s) => s.id)).size, SNIPPETS.length)
})

for (const snippet of SNIPPETS) {
  test(`${snippet.id}: format leaves it unchanged and lint finds nothing`, () => {
    assert.equal(format(snippet.source), snippet.source)
    assert.deepEqual(lint(snippet.source), [])
  })
}
