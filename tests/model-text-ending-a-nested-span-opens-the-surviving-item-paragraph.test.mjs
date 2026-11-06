import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

test('text ending a nested comment span opens the surviving item paragraph', () => {
  const source = '- a\n  - - %%%\n    n\nzz\n'
  assert.match(html(source), /        n\nzz\n      <\/li>/)
  assert.doesNotMatch(html(source), /<p>zz<\/p>/)
})

test('a span ending at a deeper text line still leaves the following line lazy', () => {
  const source = '- a\n  - - %%%\n     n\nzz\n'
  assert.match(html(source), /n\nzz/)
})
