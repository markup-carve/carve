import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const pairs = [
  ['„', '“'], ['‚', '‘'], ['«', '»'],
  ['“', '”'], ['‘', '’'], ['‟', '”'],
]

for (const [open, close] of pairs) {
  test(`paired heading quotes ${open}${close} leave the same slug`, () => {
    const html = renderDoc(parse(`# Title ${open}two${close}\n`))
    assert.match(html, /^<section id="Title-two">/)
    assert.match(html, new RegExp(`<h1>Title ${open}two${close}</h1>`))
  })
}
