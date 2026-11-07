import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

test('an attribute run leads a nested note pulled paragraph without taking its next block', () => {
  for (const marker of ['-', '1.']) {
    for (const depth of [0, 1, 2]) {
      const prefix = '  '.repeat(depth)
      const source = `${prefix}${marker} a\n${prefix}  [^1]: +\n${prefix}  {.a}\n${prefix}  h\n${prefix}    # g\n\nsee[^1]\n`
      const html = render(source)
      const note = html.slice(html.indexOf('<li id="fn1">'))
      assert.match(note, /<p class="a">h<\/p>\s*<h1 id="g">g<\/h1>/, source)
      assert.doesNotMatch(html.slice(0, html.indexOf('<section role="doc-endnotes"')), /<h1/, source)
    }
  }
})
