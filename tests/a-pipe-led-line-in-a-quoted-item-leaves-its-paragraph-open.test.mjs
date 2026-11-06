import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#5311: `| x` with no closing pipe is paragraph text, so a quoted item's
// paragraph stays open for a lazy line (PART 0 S4, CARVE-P0-006).
const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

test('the reported document folds `b` into the item', () => {
  assert.equal(html('> - u\n>   | x\nb\n'), '<blockquote><ul><li>u\n| x\nb</li></ul></blockquote>')
})

test('a nested quoted item folds it too', () => {
  assert.match(html('> - a\n>   - u\n>     | x\nb\n'), /<li>u\n\| x\nb<\/li>/)
})

test('a table row still closes the paragraph', () => {
  assert.match(html('> - u\n>   | x |\nb\n'), /<\/blockquote><p>b<\/p>$/)
})
