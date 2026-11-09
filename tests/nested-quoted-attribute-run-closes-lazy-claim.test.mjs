import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

for (const depth of [1, 2, 3]) {
  test(`a wrapped attribute at quote depth ${depth} closes every lazy claim (#5629)`, () => {
    const prefix = '> '.repeat(depth)
    const source = `${prefix}[^a]: +\n${prefix}  {#i\n${prefix}   .y}\nnext\n\nsee[^a]\n`
    const output = html(source)
    assert.ok(output.includes('</blockquote>\n<p>next</p>'), output)
    assert.ok(!output.includes('<blockquote>\n  <p>next</p>'), output)
  })
}
