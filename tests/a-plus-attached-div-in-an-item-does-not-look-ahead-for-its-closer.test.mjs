// A `+`-attached div in a list item ends at its host's next sibling marker,
// whether or not a later `:::` exists (CARVE-P9-084, carve#4717).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()
const list = (source) => /^[\s\S]*?<\/(?:ul|ol)>/.exec(html(source).replace(/^<blockquote>\s*/, ''))[0]

const UNCLOSED = [
  '- +\n:::\n- b\n',
  '1. +\n::: note\nx\n2. b\n',
  '> - +\n> :::\n> - b\n',
  '- a\n  - +\n  :::\n  - b\n',
  '- +\n:::\n  - c\n',
]

for (const source of UNCLOSED) {
  test(`a later closer leaves the list of ${JSON.stringify(source)} unchanged`, () => {
    const prefix = /^(?:> |  )?/.exec(source.split('\n').at(-2))[0]
    assert.equal(list(source + prefix + ':::\n'), list(source))
  })
}

test('the later colon line opens a div after the list', () => {
  assert.match(html('- +\n:::\n- b\n:::\n'), /<\/ul>\n<div>/)
})

test('a sibling marker inside a nested code fence stays code', () => {
  assert.match(html('- +\n:::\n```\n- b\n```\n:::\n'), /<pre><code>- b\n<\/code><\/pre>/)
})
