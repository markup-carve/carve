import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a losing note plus preserves the nesting of the winning note follower', () => {
  const withLosingLine = '[^a]: +\n[^a]: +\n  - item\n    - sub\n\nsee[^a]\n'
  const withoutLosingLine = '[^a]: +\n  - item\n    - sub\n\nsee[^a]\n'
  assert.equal(renderDoc(parse(withLosingLine)), renderDoc(parse(withoutLosingLine)))
})

test('a losing note after the winner attached a paragraph ends that note', () => {
  const source = '[^a]: +\npara\n[^a]: +\n  next\n\nsee[^a]\n'
  const html = renderDoc(parse(source))
  assert.ok(html.startsWith('<p>next</p>\n<p>see'))
  assert.match(html, /<li id="fn1">\n      <p>para<a/)
  assert.doesNotMatch(html, /<li id="fn1">\n      <p>para\n/)
})
