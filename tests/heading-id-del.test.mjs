import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('DEL is a nonalphanumeric ASCII separator in heading IDs', () => {
  for (const [text, id] of [
    ['a\u007fb', 'a-b'],
    ['a\u007f\u007fb', 'a-b'],
    ['\u007fa', 'a'],
    ['a\u007f', 'a'],
    ['\u007f', 's'],
  ]) {
    const html = renderDoc(parse(`# ${text}\n`))
    assert.match(html, new RegExp(`^<section id="${id}">`), JSON.stringify(text))
    assert.ok(html.includes(`<h1>${text}</h1>`), JSON.stringify(text))
  }
})
