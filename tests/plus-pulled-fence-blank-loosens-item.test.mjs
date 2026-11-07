import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

test('the blank that ends a `+` pulled fence loosens the item before its next block (carve#5367 shape 2)', () => {
  assert.equal(render('- +\n~~~\n\n  # h\n  x\n'),
    '<ul>\n  <li>\n    <pre><code></code></pre>\n    <h1 id="h">h</h1>\n    <p>x</p>\n  </li>\n</ul>')
})

test('every paragraph after the blank that ends a `+` pulled fence is loose (carve#5367 shape 2)', () => {
  let count = 0
  for (const host of ['- +', '1. +', '* +', '- [ ] +'])
    for (const fence of ['~~~', '```', '````'])
      for (const after of [['# h', 'x'], ['x'], ['> q', 'x']]) {
        const ind = host.startsWith('1.') ? '   ' : host.startsWith('- [ ]') ? '      ' : '  '
        const source = [host, fence, '', ...after.map((l) => ind + l)].join('\n') + '\n'
        assert.match(render(source), /<p>x<\/p>|<p>q\nx<\/p>/, source)
        assert.doesNotMatch(render(source), /<li[^>]*>(?:<input[^>]*> )?\n\s*<pre>[\s\S]*\n\s*x\n/, source)
        count++
      }
  assert.equal(count, 36)
})
