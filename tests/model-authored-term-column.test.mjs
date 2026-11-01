import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const cases = [
  {
    name: 'two ordered levels at the inner marker column',
    source: '1. 1. :: t\n   : a\n',
    afterTerm: '</ol>\n    : a',
  },
  {
    name: 'three mixed levels at the innermost marker column',
    source: '* - a.  :: t\n    : a\n',
    afterTerm: '</ol>\n        : a',
  },
  {
    name: 'ordered levels inside a quote',
    source: '> 1. 1. :: t\n>    : a\n',
    afterTerm: '</ol>\n      : a',
  },
]

for (const { name, source, afterTerm } of cases) {
  test(name, () => {
    const html = renderDoc(parse(source))
    assert.match(html, /<dt>t<\/dt>/)
    assert.ok(html.includes(afterTerm), html)
  })
}

test('one column past the marker stays inside the term', () => {
  const html = renderDoc(parse('1. 1. :: t\n    : a\n'))
  assert.match(html, /<dt>t\n: a<\/dt>/)
})
