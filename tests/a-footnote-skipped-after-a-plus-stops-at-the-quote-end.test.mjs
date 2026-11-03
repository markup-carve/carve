// carve#4870, PART 4: a line without the quote prefix ends the quote, also inside a skipped footnote body.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/>\s+</g, '><').trim()

test('a footnote body skipped after a + ends at the blank that ends its quote', () => {
  assert.equal(html('> - +\n> [^f]: x\n\n> %%\n> text\n'), '<blockquote><ul><li></li></ul></blockquote><blockquote><p>text</p></blockquote>')
  assert.equal(html('> . +\n> [^f]: x\n\n> %%\n> text\n'), '<blockquote><ol><li></li></ol></blockquote><blockquote><p>text</p></blockquote>')
})

test('a line that leaves the quote after a skipped footnote does not throw', () => {
  for (const line of ['text', '%%%']) {
    assert.match(html(`> - +\n> [^f]: x\n${line}\n> %%%\n> text\n`), /<li><\/li>/)
  }
})
