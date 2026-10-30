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

// The note's open paragraph is not the item's own, so no sublist (carve#4160).
for (const marker of ['-', '*', '1.']) {
  test(`a ${marker} marker at the item column is text of the note paragraph`, () => {
    const source = `- outer\n  - see[^n]\n    [^n]: a\n    ${marker} li\nx\n`
    const html = renderDoc(parse(source))
    assert.ok(html.includes(`<p>a\n${marker} li\nx<a href`))
    assert.doesNotMatch(html, /<li>li/)
  })
}

test('a marker one column past the item column is text of the note paragraph', () => {
  const source = '- outer\n  - see[^n]\n    [^n]: a\n     - li\nx\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<p>a\n- li\nx<a href/)
  assert.doesNotMatch(html, /<li>li/)
})
