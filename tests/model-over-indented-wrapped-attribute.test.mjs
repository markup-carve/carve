import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('an over-indented wrapped attribute in a description is an attribute line (carve#4089)', () => {
  assert.equal(html(':: t\n: d\n   {c\n}\na\n'), '<dl>\n  <dt>t</dt>\n  <dd>d</dd>\n</dl>\n<p>a</p>')
})

test('a wrapped attribute below a description column reads like the one-line form (carve#4089)', () => {
  assert.equal(html(':: t\n: d\n {c\n}\n'), '<dl>\n  <dt>t</dt>\n  <dd>d</dd>\n</dl>')
  assert.equal(html(':: t\n: d\n {c\n}\n'), html(':: t\n: d\n {c}\n'))
})

test('an over-indented wrapped attribute in a list item is an attribute line (carve#4089)', () => {
  assert.equal(html('- d\n   {.c\n}\npara\n'), '<ul>\n  <li>d</li>\n</ul>\n<p>para</p>')
})

test('a wrapped attribute at a content column is still one construct', () => {
  assert.equal(html('- d\n  {.c\n}\n  x\n'), '<ul>\n  <li>d\n    <p class="c">x</p>\n  </li>\n</ul>')
  assert.equal(html('- a\n  - b\n    {.c\n}\npara\n'), '<ul>\n  <li>a\n    <ul>\n      <li>b</li>\n    </ul>\n  </li>\n</ul>\n<p>para</p>')
})
