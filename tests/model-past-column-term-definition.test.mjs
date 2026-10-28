import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const prefix = '- a\n  :: outer\n  :  detail\n       :: inner\n      :  tail\n'

test('a footnote definition past the description column registers in the outer description', () => {
  const source = `${prefix}        [^n]: note\n         q\n\nsee[^n]\n`
  const html = renderDoc(parse(source))
  assert.match(html, /<dt>inner<\/dt>\n\s*<dd>tail<\/dd>/)
  assert.match(html, /role="doc-endnotes"/)
  assert.match(html, /<li id="fn1">\n\s*<p>note\nq<a href="#fnref1"/)
})

test('a link definition past the description column registers', () => {
  const source = `${prefix}        [r]: /u\n\n[x][r]\n`
  const html = renderDoc(parse(source))
  assert.match(html, /<dt>inner<\/dt>\n\s*<dd>tail<\/dd>/)
  assert.match(html, /<p><a href="\/u">x<\/a><\/p>/)
})

test('a definition at the description column still registers', () => {
  const source = `${prefix}     [^n]: note\n\nsee[^n]\n`
  const html = renderDoc(parse(source))
  assert.match(html, /role="doc-endnotes"/)
  assert.doesNotMatch(html, /<dt>inner[^<]*\[\^n\]: note<\/dt>/)
})
