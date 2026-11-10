import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const F = '```'
const code = (src) => [...renderDoc(parse(src)).matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => m[1])

const hosts = {
  'list item': (body) => `- p\n+\n${body}`,
  note: (body) => `x[^a]\n\n[^a]: p\n+\n${body}`,
  description: (body) => `:: t\n: p\n+\n${body}`,
}

// A fence line off the opener's column is payload before the blank as after it (carve#5855).
for (const [name, host] of Object.entries(hosts)) {
  test(`an indented fence line does not close a ${name}'s own-line plus fence before a blank`, () => {
    assert.deepEqual(code(host(`${F}\n  ${F}\n\n  x\n`)), [`  ${F}\n\n  x\n`])
  })

  test(`whitespace-only payload lines of a ${name}'s own-line plus fence keep their spaces`, () => {
    assert.deepEqual(code(host(`${F}\ncode\n  \n  tail\n   \n  more\n`)), ['code\n  \n  tail\n   \n  more\n'])
  })

  test(`a closer at the opener's column still ends the ${name}'s fence`, () => {
    assert.deepEqual(code(host(`${F}\na\n${F}\n\n  x\n`)), ['a\n'])
  })
}
