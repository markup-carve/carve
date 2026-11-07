import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a term-only definition list releases the marker boundary after a later block and paragraph (carve#5368)', () => {
  for (const block of ['# H', '---', '```\nx\n```']) {
    const source = `- a\n  :: t\n${block.split('\n').map((line) => `  ${line}`).join('\n')}\n  w\n: z\n`
    assert.match(html(source), /w\n: z\n  <\/li>\n<\/ul>$/)
  }
})

test('without a definition list, the marker-column line stays in the open paragraph', () => {
  assert.match(html('- a\n  # H\n  w\n: z\n'), /w\n: z\n  <\/li>/)
})

test('a nested marker-column line folds into the deepest open paragraph (carve#5379)', () => {
  assert.match(html('- outer\n  - a\n    :: t\n    # H\n    w\n  : z\n'), /w\n: z\n      <\/li>/)
})

test('term-shaped text in a code fence creates no definition boundary', () => {
  const source = '- a\n  ```\n  :: t\n  ```\n  w\n: z\n'
  assert.match(html(source), /w\n: z\n  <\/li>/)
})
