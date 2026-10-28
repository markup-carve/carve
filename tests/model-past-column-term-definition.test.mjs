import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const prefix = '- a\n  :: outer\n  :  detail\n       :: inner\n      :  tail\n'

test('a footnote definition past the description column stays in the open term', () => {
  const source = `${prefix}        [^n]: note\n         q\n\nsee[^n]\n`
  const html = renderDoc(parse(source))
  assert.match(html, /<dt>inner\n :  tail\n\[\^n\]: note\nq<\/dt>/)
  assert.doesNotMatch(html, /role="doc-endnotes"/)
  assert.match(html, /<p>see\[\^n\]<\/p>/)
})

test('a link definition past the description column stays literal', () => {
  const source = `${prefix}        [r]: /u\n\n[x][r]\n`
  const html = renderDoc(parse(source))
  assert.match(html, /<dt>inner\n :  tail\n\[r\]: \/u<\/dt>/)
  assert.match(html, /<p>\[x\]\[r\]<\/p>/)
})

test('a definition at the description column still registers', () => {
  const source = `${prefix}     [^n]: note\n\nsee[^n]\n`
  const html = renderDoc(parse(source))
  assert.match(html, /role="doc-endnotes"/)
  assert.doesNotMatch(html, /<dt>inner[^<]*\[\^n\]: note<\/dt>/)
})
