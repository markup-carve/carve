import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a closer past the opening column keeps a wrapped attribute', () => {
  assert.equal(html('  {.c\n   }\nx\n'), '<p class="c">x</p>')
  assert.equal(html('- d\n  {.c\n   }\n  x\n'), '<ul>\n  <li>d\n    <p class="c">x</p>\n  </li>\n</ul>')
})

test('a closer at or below the opening column makes the entire run paragraph text (#5080)', () => {
  assert.equal(html('  {.c\n  }\nx\n'), '<p>{.c\n}\nx</p>')
  assert.equal(html('- d\n  {.c\n  }\n  x\n'), '<ul>\n  <li>d\n{.c\n}\nx</li>\n</ul>')
})
