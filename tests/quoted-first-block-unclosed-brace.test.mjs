import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('a quoted item plus attaches an unclosed brace line as paragraph text', () => {
  assert.equal(html('> - +\n> {\n'), '<blockquote>\n  <ul>\n    <li>{</li>\n  </ul>\n</blockquote>')
})

test('the missing continuation ends a quoted attribute lookahead in each plus host', () => {
  for (const source of ['> - +\n> {.x\n', '> :: t\n> : +\n> {.x\n', '> [^a]: +\n> {.x\n\nsee[^a]\n']) {
    assert.match(html(source), /\{\.x/)
  }
})

test('the missing continuation also ends a quoted comment-like brace run', () => {
  assert.match(html('> - +\n> {% c\n'), /\{% c/)
})
