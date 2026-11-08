import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

test('a footnote definition ends a child list at its marker column', () => {
  const html = render('- a\n  - b\n  [^n]: t\n\n  - c\n')
  assert.match(html, /<li><p>a<\/p>/)
  assert.equal((html.match(/<ul>/g) ?? []).length, 3)
})

test('a definition inside a child item keeps that child list open', () => {
  const html = render('- a\n  - b\n    [^n]: t\n\n  - c\n')
  assert.match(html, /<li>a\n/)
  assert.equal((html.match(/<ul>/g) ?? []).length, 2)
})

test('without a blank the separate child lists keep their owner tight', () => {
  const html = render('- a\n  - b\n  [^n]: t\n  - c\n')
  assert.match(html, /<li>a\n/)
  assert.equal((html.match(/<ul>/g) ?? []).length, 3)
})

test('the boundary holds inside nested, quoted, and ordered items', () => {
  for (const source of [
    '- host\n  - a\n    - b\n    [^n]: t\n\n    - c\n',
    '> - a\n>   - b\n>   [^n]: t\n>\n>   - c\n',
    '1. a\n   - b\n   [^n]: t\n\n   - c\n',
  ]) {
    assert.match(render(source), /<li><p>a<\/p>/, source)
  }
})
