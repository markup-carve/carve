import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

// carve#4031 shape 2: the block a sub-item's `+` attaches at its marker column
// is the sub-item's (PART 9 §17 L3), so a later line at its content column
// stays in the sub-item and the outer item has no blank between its blocks.
for (const block of ['# H', '---', '> q', '| a |']) for (const blanks of ['\n', '\n\n']) {
  test(`a ${block} a nested + attaches keeps the follower in the sub-item (${blanks.length} blank)`, () => {
    const out = html(`- foo\n  - +\n  ${block}\n${blanks}    x\n`)
    assert.match(out, /^<ul><li>foo<ul><li>/)
    assert.match(out, /<p>x<\/p><\/li><\/ul><\/li><\/ul>$/)
  })
}

test('the reproduction renders as the ticket expects', () => {
  assert.equal(html('- foo\n  - +\n  # H\n\n    x\n'),
    '<ul><li>foo<ul><li><h1 id="H">H</h1><p>x</p></li></ul></li></ul>')
})

test('a block past the marker column is refused and belongs to the outer item', () => {
  assert.equal(html('- foo\n  - +\n   # H\n\n    x\n'),
    '<ul><li><p>foo</p><ul><li>+</li></ul><h1 id="H">H</h1><p>x</p></li></ul>')
})

test('a line at the outer content column still ends the sub-item', () => {
  const out = html('- foo\n  - +\n  # H\n\n  y\n')
  assert.match(out, /<li><h1 id="H">H<\/h1><\/li><\/ul><p>y<\/p><\/li><\/ul>$/)
})
