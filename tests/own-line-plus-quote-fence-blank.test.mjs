import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('an own-line plus fence keeps a quote blank and later prefixed payload (#5635)', () => {
  const html = renderDoc(parse('> p\n+\n```\na\n\n> zq'))
  assert.match(html, /<blockquote>[\s\S]*<pre><code>a\n\nzq<\/code><\/pre>[\s\S]*<\/blockquote>/)
  assert.doesNotMatch(html, /<\/blockquote>\n<blockquote>/)
})

test('an exact quote closer still ends the attached fence', () => {
  const html = renderDoc(parse('> p\n+\n```\na\n\n> ```\n> zq'))
  assert.match(html, /<pre><code>a\n\n<\/code><\/pre>\n  <p>zq<\/p>/)
})
