import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a held definition list ends its item after a later block and paragraph', () => {
  for (const block of ['# H', '---', '```\nx\n```']) {
    const source = `- a\n  :: t\n${block.split('\n').map((line) => `  ${line}`).join('\n')}\n  w\n: z\n`
    assert.match(html(source), /<\/ul>\n<p>: z<\/p>$/)
  }
})

test('without a definition list, the marker-column line stays in the open paragraph', () => {
  assert.match(html('- a\n  # H\n  w\n: z\n'), /w\n: z\n  <\/li>/)
})

test('a nested marker-column line leaves the inner item in its outer item', () => {
  assert.match(html('- outer\n  - a\n    :: t\n    # H\n    w\n  : z\n'), /<\/ul>\n    : z\n  <\/li>/)
})
