import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, '')

test('a top-level sibling marker in an unclosed attached fence is code with a later blank, carve#5531', () => {
  assert.equal(html('- +\n```\n- z\n\nq\n'), '<ul><li><pre><code>- z</code></pre></li></ul><p>q</p>')
  assert.equal(html('1. +\n```\n- z\n\n  y\n'), '<ol><li><pre><code>- z</code></pre></li></ol><p>y</p>')
})

test('a sibling marker reads as a plain line at the same column, with or without a later blank', () => {
  const firstCode = (h) => h.match(/<pre><code[^>]*>(.*?)<\/code><\/pre>/)?.[1] ?? null
  for (const host of ['- +', '* +', '1. +', '2) +']) {
    for (const fence of ['```', '~~~', '````']) {
      for (const sibling of ['- z', '* z', '1. z', '2) z']) {
        for (const tail of ['\n', '\n\nq\n', '\n\n  q\n', '\n\n- w\n']) {
          const source = `${host}\n${fence}\n${sibling}${tail}`
          const plain = firstCode(html(source.replace(sibling, 'QQ')))
          assert.equal(firstCode(html(source)), plain.replace('QQ', sibling), source)
        }
      }
    }
  }
})
