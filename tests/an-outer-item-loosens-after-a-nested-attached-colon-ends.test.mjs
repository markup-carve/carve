import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a blank ending a nested attached colon separates the outer item from its next block', () => {
  for (const next of ['> q', '- q', '# q']) {
    const source = `- a\n  * +\n  ::: note\n\n    ${next}\n`
    const html = renderDoc(parse(source))
    assert.match(html, /<li><p>a<\/p>/, source)
  }
})
