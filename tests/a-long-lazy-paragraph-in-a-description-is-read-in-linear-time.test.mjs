import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'

// carve#4308: 8,000 lazy lines took 37 s when each one rescanned the body.
test('a long lazy paragraph in a description parses within a generous bound', () => {
  const words = Array.from({ length: 32000 }, (_, k) => `w${k}`)
  const started = performance.now()
  const doc = parse(`:: s\n: a\n${words.join('\n')}\n`)
  assert.ok(performance.now() - started < 10000)
  assert.deepEqual(doc.blocks[0].items[1].ddBlocks, [{ t: 'para', lines: ['a', ...words] }])
})

test('an indented lazy line is read in linear time too', () => {
  const words = Array.from({ length: 32000 }, (_, k) => `w${k}`)
  const started = performance.now()
  const doc = parse(`:: s\n:   a\n${words.map((word) => ` ${word}`).join('\n')}\n`)
  assert.ok(performance.now() - started < 10000)
  assert.deepEqual(doc.blocks[0].items[1].ddBlocks, [{ t: 'para', lines: ['a', ...words] }])
})

test('a line that cannot fold still ends the description after a long lazy paragraph', () => {
  const doc = parse(':: s\n: a\nb\nc\n# h\n')
  assert.deepEqual(doc.blocks.map((block) => block.t), ['deflist', 'heading'])
  assert.deepEqual(doc.blocks[0].items[1].ddBlocks, [{ t: 'para', lines: ['a', 'b', 'c'] }])
})
