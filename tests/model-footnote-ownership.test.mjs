import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a link definition in a note closes the claim for a following document line', () => {
  const source = '[^n]: d\n  - para\n    [r]: /u\nx\n\n[r][] [^n]\n'
  const html = renderDoc(parse(source))
  assert.match(html, /^<p>x<\/p>\n<p><a href="\/u">r<\/a>/)
  assert.doesNotMatch(html, /<p>x<a href="#fnref/)
})

test('a quoted definition closes the note claim after an interior blank', () => {
  const source = 'see[^n]\n\n[^n]: a\n\n    > [r]: /x\n[x][r]\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<p><a href="\/x">x<\/a><\/p>\n<section role="doc-endnotes"/)
})

for (const marker of ['-', '*', '1.']) {
  test(`a ${marker} marker at the item column owns the next paragraph`, () => {
    const source = `- outer\n  - see[^n]\n    [^n]: a\n    ${marker} li\nx\n`
    const html = renderDoc(parse(source))
    assert.match(html, /<li>li\nx<\/li>/)
    assert.doesNotMatch(html, /<p>a\n/)
  })
}

test('a marker one column past the item column still opens in that item', () => {
  const source = '- outer\n  - see[^n]\n    [^n]: a\n     - li\nx\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<li>li\nx<\/li>/)
  assert.doesNotMatch(html, /<p>a\n- li/)
})
