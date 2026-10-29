/*
 * A prefixed run (`$`, `$$`, `!`) takes its payload the way a plain code run
 * does (PART 3, UNCLOSED RUN): in a line block the newlines it swallows are
 * content, not soft breaks, so none is stripped (carve#4024).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const lineBlock = (inner) => `<div class="line-block">\n  <p>${inner}</p>\n</div>`

test('an unclosed math or literal run in a line block keeps its newline', () => {
  assert.equal(html('::: |\n`\n%%\n:::\n'), lineBlock('<code>\n</code>'))
  assert.equal(html('::: |\n$`\n%%\n:::\n'), lineBlock('<span class="math inline" role="math">\\(\n\\)</span>'))
  assert.equal(html('::: |\n$$`\n%%\n:::\n'), lineBlock('<span class="math display" role="math">\\[\n\\]</span>'))
  assert.equal(html('::: |\n!`\n%%\n:::\n'), lineBlock('\n'))
})

test('outside a line block the trailing newline is still stripped', () => {
  assert.equal(html('$`a\n'), '<p><span class="math inline" role="math">\\(a\\)</span></p>')
  assert.equal(html('$`\na\n'), '<p><span class="math inline" role="math">\\(\na\\)</span></p>')
})
