import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source)).trim()

test('a refused description attachment leaves no quote paragraph to continue', () => {
  const source = '> :: t\n> : +\n h\n'
  assert.equal(render(source), `<blockquote>
  <dl>
    <dt>t</dt>
    <dd></dd>
  </dl>
</blockquote>
<p>h</p>`)
})

test('an ordinary description paragraph still accepts a lazy line', () => {
  const source = '> :: t\n> : a\n h\n'
  assert.match(render(source), /<dd>a\nh<\/dd>/)
})

test('a refused description attachment releases every nested quote', () => {
  for (const depth of [2, 3]) {
    const prefix = '> '.repeat(depth)
    const source = `${prefix}:: t\n${prefix}: +\n h\n`
    assert.ok(render(source).endsWith('</blockquote>\n<p>h</p>'), source)
  }
})
