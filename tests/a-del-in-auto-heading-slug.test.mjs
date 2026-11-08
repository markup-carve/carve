import test from 'node:test'
import assert from 'node:assert/strict'
import { makeSlugger } from '../scripts/spec/render.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('DEL follows the ASCII nonalphanumeric heading slug rule', () => {
  for (const [source, expected] of [
    ['a\u007fb', 'a-b'],
    ['a!\u007f?b', 'a-b'],
    ['\u007fa\u007f', 'a'],
    ['\u007f', 's'],
  ]) assert.equal(makeSlugger()(source), expected)
  assert.equal(renderDoc(parse('# a\u007fb\n')),
    '<section id="a-b">\n  <h1>a\u007fb</h1>\n</section>')
})
