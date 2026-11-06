import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

test('a marker-column description line continues the paragraph after the description closes', () => {
  const html = render('- a\n  :: t\n  : u\n\n  p\n: c\n')
  assert.match(html, /<p>p\n: c<\/p>/)
  assert.doesNotMatch(html, /<\/ul>\n<p>: c<\/p>/)
})

test('the closed-description rule also reaches a two-level quoted paragraph', () => {
  const html = render('- - a\n    :: m\n    : d\n\n    > z\n: l\n')
  assert.match(html, /<blockquote><p>z\n: l<\/p><\/blockquote>/)
})

test('a lazy continuation keeps the description open', () => {
  const html = render('- a\n   :: m\n   : d\n   more\n: l\n')
  assert.match(html, /<dd>d\nmore<\/dd>/)
  assert.match(html, /<\/ul>\n<p>: l<\/p>$/)
})
