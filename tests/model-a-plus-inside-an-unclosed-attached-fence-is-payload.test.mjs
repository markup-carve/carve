import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, '')

test('a refused + inside an unclosed attached fence stays the author\'s +, carve#5484', () => {
  for (const fence of ['```', '~~~', '````']) {
    assert.equal(html(`- +\n${fence}\n+\n`), '<ul><li><pre><code>+</code></pre></li></ul>', fence)
    assert.equal(html(`1. +\n${fence}\n+\n`), '<ol><li><pre><code>+</code></pre></li></ol>', fence)
    assert.equal(html(`> +\n${fence}\n+\n`), '<blockquote><pre><code>+</code></pre></blockquote>', fence)
    assert.equal(html(`- - +\n  ${fence}\n  +\n`), '<ul><li><ul><li><pre><code>+</code></pre></li></ul></li></ul>', fence)
    assert.equal(html(`- +\n${fence}\nx\n+\n`), '<ul><li><pre><code>x+</code></pre></li></ul>', fence)
  }
})

test('no refused-marker placeholder reaches a code payload', () => {
  for (const host of ['- +', '> +', '[^1]: +', '- a\n+', '- - +']) {
    const col = host === '- - +' ? '  ' : ''
    for (const tail of ['', '\n', '\n\ny\n', '\n+\n']) {
      const source = `${host}\n${col}${'```'}\n${col}+${tail}\nsee[^1]\n`
      assert.ok(!html(source).includes('%%'), source)
    }
  }
})

test('a + after the closed attached fence still reaches the item', () => {
  assert.equal(html('- +\n```\nq\n```\n+\nz\n'), '<ul><li><pre><code>q</code></pre>z</li></ul>')
})
