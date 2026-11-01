import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

test('an own-line nested div ends before two separated outer paragraphs', () => {
  const html = render('- outer\n  - head\n    :::\n  p\n\n    q\n')
  assert.match(html, /<li><p>outer<\/p>/)
  assert.match(html, /<\/ul>\n    <p>p<\/p>\n    <p>q<\/p>/)
})

test('the same ownership rule applies after a nested code fence and inline residue', () => {
  const html = render('- outer\n  - head\n     ```\n  ``\n\n\n     tail\n')
  assert.match(html, /<\/ul>\n    <p><code><\/code><\/p>\n    <p>tail<\/p>/)
})

test('a blank inside the live nested item does not loosen the outer list', () => {
  const html = render('- outer\n  - head\n\n    body\n')
  assert.doesNotMatch(html, /<li><p>outer<\/p>/)
  assert.match(html, /<li><p>head<\/p>\n        <p>body<\/p>/)
})
