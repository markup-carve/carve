import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))
for (const source of [
  '- {#a\n }\n',
  '  - {#a\n   }\n',
  '[^n]: {#a\n }\n\nx[^n]\n',
]) test('a refused marker-line brace is literal but its following text is inline', () => {
  assert.equal(render(source), render(source.replace('{', '\\{')))
})

test('a continuation past the authored brace still accepts a block attribute', () => {
  assert.equal(render('- {.a\n   .b}\n  x\n'), '<ul>\n  <li><p class="a b">x</p></li>\n</ul>')
})
