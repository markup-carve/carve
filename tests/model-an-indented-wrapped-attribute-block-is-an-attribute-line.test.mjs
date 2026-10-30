import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('an indented wrapped block interrupts a paragraph (carve#4089)', () => {
  assert.equal(html('a\n {.c\n }\npara\n'), '<p>a</p>\n<p class="c">para</p>')
  assert.equal(html('a\n  {#i\n  .x\n  k=v}\npara\n'), '<p>a</p>\n<p id="i" class="x" k="v">para</p>')
})

test('the line after an indented wrapped block in an item is not lazy (carve#4089)', () => {
  assert.equal(html('- a\n   {.c\n   }\npara\n'), '<ul>\n  <li>a</li>\n</ul>\n<p>para</p>')
  assert.equal(html('- a\n  {.c\n}\npara\n'), '<ul>\n  <li>a</li>\n</ul>\n<p>para</p>')
  assert.equal(html(':: t\n: a\n   {.c\n}\npara\n'), '<dl>\n  <dt>t</dt>\n  <dd>a</dd>\n</dl>\n<p>para</p>')
})

test('an indented wrapped block attaches inside its container', () => {
  assert.match(html('- a\n   {.c\n   }\n  para\n'), /<li>a\n\s*<p class="c">para<\/p>/)
  assert.match(html('> a\n>  {.c\n> }\n> para\n'), /<p>a<\/p>\n\s*<p class="c">para<\/p>/)
  assert.match(html('::: d\na\n {.c\n }\npara\n:::\n'), /<p>a<\/p>\n\s*<p class="c">para<\/p>/)
})

test('a continuation without the quote prefix does not continue the block', () => {
  assert.doesNotMatch(html('> a\n>  {.c\n}\npara\n'), /class=/)
  assert.doesNotMatch(html('a\n {.c\n\n }\npara\n'), /class=/)
})

test('the decision trace keeps the description body line after the block out of the body', () => {
  const trace = []
  parse(':: t\n: a\n   {.c\n}\npara\n', { trace })
  assert.deepEqual(trace.map((r) => [r.line, r.form, r.owner]).slice(2),
    [[3, 'leaf', 'doc/dd:2'], [4, 'leaf', 'doc/dd:2'], [5, 'text', 'doc']])
})
