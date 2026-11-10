import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const F = '```'
const code = (src) => [...renderDoc(parse(src)).matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => m[1])

// Ruling A of carve#5855: verbatim from the opener's column in every host.
const hosts = {
  item: (body) => `- p\n+\n${body}`,
  note: (body) => `x[^a]\n\n[^a]: p\n+\n${body}`,
  description: (body) => `:: t\n: p\n+\n${body}`,
}

for (const [name, host] of Object.entries(hosts)) {
  test(`an own-line plus fence in a ${name} keeps body-column payload after a blank (#5855)`, () => {
    assert.deepEqual(code(host(`${F}\ncode\n\n  tail\n\nsee\n`)), ['code\n\n  tail\n\n'])
  })

  test(`a closer after the blank still ends the ${name}'s attached fence`, () => {
    assert.deepEqual(code(host(`${F}\na\n\n${F}\n  more\n`)), ['a\n\n'])
  })

  test(`the ${name}'s attached fence keeps the payload inside a quote too`, () => {
    const quoted = host(`${F}\ncode\n\n  tail`).split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n')
    assert.deepEqual(code(quoted), ['code\n\n  tail'])
  })
}
