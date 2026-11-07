import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a list in an attached quote does not absorb a later outer list', () => {
  const source = '- a\n  > +\n  - t\n\n  - r\n'
  assert.equal(renderDoc(parse(source)), `<ul>
  <li><p>a</p>
    <blockquote>
      <ul>
        <li>t</li>
      </ul>
    </blockquote>
    <ul>
      <li>r</li>
    </ul>
  </li>
</ul>`)
})

test('the ticket footnote shape keeps its already correct loose result', () => {
  const source = '- a\n  > +\n  [^x]: note\n  :: t\n  : u\n\n    > r\n'
  assert.match(renderDoc(parse(source)), /<li><p>a<\/p>/)
})

test('a list after an ordinary quote stays the outer item child across the blank', () => {
  const source = '- a\n  > x\n  - t\n\n  - r\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<li>a\n/)
  assert.match(html, /<li><p>t<\/p><\/li>\n      <li><p>r<\/p><\/li>/)
})

test('two items in the attached quote end together at the blank', () => {
  const source = '- a\n  > +\n  - t\n  - u\n\n  - r\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<li><p>a<\/p>/)
  assert.match(html, /<li>t<\/li>\n        <li>u<\/li>/)
  assert.match(html, /<\/blockquote>\n    <ul>\n      <li>r<\/li>/)
})
