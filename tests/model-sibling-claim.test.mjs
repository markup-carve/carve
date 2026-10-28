import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const marker of ['-', '*']) {
  test(`a ${marker} sibling paragraph regains its claim after a footnote`, () => {
    const source = `${marker} outer\n  ${marker} see[^n]\n    [^n]: a\n  ${marker} li\nx\n`
    const html = renderDoc(parse(source))
    assert.match(html, /<li>li\nx<\/li>/)
    assert.doesNotMatch(html, /<\/ul>\n<p>x<\/p>/)
  })
}
