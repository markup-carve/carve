import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { commentVariants } from './lint-comment-visibility/variants.mjs'

const corpus = JSON.parse(readFileSync(new URL('./lint-comment-visibility/cases.json', import.meta.url), 'utf8'))

test('comment lint corpus declares visible diagnostics and hidden controls', () => {
  assert.equal(corpus.version, 1)
  assert.equal(corpus.cases.length, 8)
  for (const row of corpus.cases) {
    assert.ok(row.name && row.source && Array.isArray(row.expected))
    for (const finding of row.expected) {
      assert.match(finding[0], /^[a-z][a-z-]+$/)
      assert.ok(finding[1] > 0 && finding[2] > 0)
    }
    const html = renderDoc(parse(row.source))
    if (row.source.includes('hidden')) assert.ok(!html.includes('hidden'), row.name)
  }
})

test('1,000 comment variants hide their payload in the spec model', () => {
  let count = 0
  for (const source of commentVariants()) {
    const html = renderDoc(parse(source))
    assert.ok(!html.includes('secret'), `variant ${count} exposed its payload: ${source}`)
    count++
  }
  assert.equal(count, 1000)
})
