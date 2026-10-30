import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')

test('an attribute run before an unclosed + attached fence runs the fence to the item end', () => {
  assert.equal(html('- a\n+\n{x}\n```\n- x\n'), '<ul><li>a<pre x=""><code>- x</code></pre></li></ul>')
  assert.equal(html('- a\n+\n{x}\n```\nb\n- x\n'), '<ul><li>a<pre x=""><code>b- x</code></pre></li></ul>')
  assert.equal(html('- a\n+\n{x}\n```\nb\n```\n- x\n'), '<ul><li>a<pre x=""><code>b</code></pre></li><li>x</li></ul>')
})
