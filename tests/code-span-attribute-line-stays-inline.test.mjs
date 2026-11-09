import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('a block-shaped attribute inside open inline code remains code text (carve#5638)', () => {
  assert.equal(html('p\n`open\n{.x}\nclose`\nz'), '<p>p\n<code>open\n{.x}\nclose</code>\nz</p>')
})

test('an attribute outside the code span still interrupts (carve#5638)', () => {
  assert.equal(html('p\n`open`\n{.x}\nz'), '<p>p\n<code>open</code></p>\n<p class="x">z</p>')
})
