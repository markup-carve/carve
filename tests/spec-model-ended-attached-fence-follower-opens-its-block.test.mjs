import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// After the blank that ends an unclosed fence a marker-line `+` took, a line between the
// host's marker and content columns opens its block, as after the colon form (carve#5401).
const render = (src) => renderDoc(parse(src)).replace(/<aside[^>]*>\s*<\/aside>|<div>\s*<\/div>|<pre><code><\/code><\/pre>/g, 'B')
const quoted = (src, prefix) => src.split('\n').map((l) => (l === '' ? prefix.trimEnd() : prefix + l)).join('\n')

for (const next of [' # h', ' > q', ' | a |', ' ::: x', ' tail']) {
  for (const [label, host, inner] of [['top-level', '* +', ''], ['nested', '- a\n  * +', '  ']]) {
    for (const prefix of ['', '> ']) {
      test(`${label} ${JSON.stringify(prefix)} ${next.trim()} after an ended attached fence reads as after the colon form`, () => {
        const doc = (opener) => quoted(`${host}\n${inner}${opener}\n\n${inner}${next}\n`, prefix)
        assert.equal(render(doc('```')), render(doc(':::')))
      })
    }
  }
}

test('a heading one column in after an ended attached fence is a heading', () => {
  assert.match(renderDoc(parse('* +\n```\n\n # q\n')), /<h1>q<\/h1>/)
})

test('a closed attached fence keeps its interior blank and the line after it', () => {
  const html = renderDoc(parse('* +\n```\n\n # q\n```\n'))
  assert.match(html, /<pre><code>\n # q\n<\/code><\/pre>/)
})
