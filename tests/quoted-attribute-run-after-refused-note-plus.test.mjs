import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a wrapped block attribute leaves no lazy quoted paragraph after a refused note plus', () => {
  let checked = 0
  for (const depth of [1, 2, 3, 4]) {
    const quote = '> '.repeat(depth)
    for (const label of ['a', 'bee', 'c3', 'delta', 'e']) {
      for (const id of ['i', 'two', 'x3', 'long-id', 'z']) {
        for (let variant = 0; variant < 10; variant++) {
          const tail = `next${variant}`
          const source = `${quote}[^${label}]: +\n${quote} {#${id}\n${quote}  .c${variant}}\n${tail}\n\nsee[^${label}]\n`
          const html = renderDoc(parse(source))
          assert.ok(html.includes(`</blockquote>\n<p>${tail}</p>`), source)
          checked++
        }
      }
    }
  }
  assert.equal(checked, 1000)
})
