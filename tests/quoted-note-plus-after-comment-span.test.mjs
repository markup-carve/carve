import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('an unprefixed line after an invisible span cannot lazily enter a quoted note', () => {
  const source = '> [^m]: +\n> %%%\n> x\n> %%%\nafter\n\nsee[^m]\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<\/blockquote>\n<p>after<\/p>/)
  assert.match(html, /<li id="fn1">\n\s*<p><a href="#fnref1"/)
})
