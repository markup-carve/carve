import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a refused continuation before a description list sibling adds no separator', () => {
  for (const [middle, first] of [['', 'li'], ['   text\n', 'li\ntext']]) {
    const source = `:: t\n: +\n1. li\n${middle}+\n1. sib\n`
    assert.equal(renderDoc(parse(source)), `<dl>\n  <dt>t</dt>\n  <dd>\n    <ol>\n      <li>${first}</li>\n      <li>sib</li>\n    </ol>\n  </dd>\n</dl>`, source)
  }
})
