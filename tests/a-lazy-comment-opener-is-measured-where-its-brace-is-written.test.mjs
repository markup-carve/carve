import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const escaped = (src) => html(src.replace('{%', '\\{%'))

// carve#5874: a lazy `{%` opener short of the body column is measured where its `{` is written.
const hosts = [
  ['item', 2, (b) => `- b\n${b}`],
  ['ordered item', 3, (b) => `1. b\n${b}`],
  ['nested item', 4, (b) => `- a\n  - b\n${b}`],
  ['note', 2, (b) => `[^n]: p\n${b}\nx[^n]\n`],
]
for (const [name, body, host] of hosts) for (let opener = 1; opener < body; opener++) {
  test(`a ${name} opener at column ${opener} with its closer at the body column is a valid run`, () => {
    const source = host(`${' '.repeat(opener)}{% x\n${' '.repeat(body)}%}\n`)
    assert.equal(html(source), html(host(`${' '.repeat(opener)}{% x %}\n`)))
  })
  test(`a ${name} opener at column ${opener} with its closer short of the body column is refused`, () => {
    const source = host(`${' '.repeat(opener)}{% x\n${' '.repeat(body - 1)}%}\n`)
    assert.equal(html(source), escaped(source))
  })
}

// carve#5755: a leading tab is measured per frame, so a tabbed opener reads as its space spelling.
for (const [name, host, tabbed, spaced] of [
  ['a description in a note', (b) => `[^n]: p\n    :: t\n    : pre\n${b}\nx[^n]\n`, '  \t', '      '],
  ['a description in a note, past the body', (b) => `[^n]: p\n    :: t\n    : pre\n${b}\nx[^n]\n`, '  \t ', '       '],
  ['a nested item', (b) => `- a\n  - b\n${b}`, '  \t', '      '],
]) for (let closer = 4; closer <= 8; closer++) {
  test(`${name}: ${JSON.stringify(tabbed)} reads as its space spelling with the closer at column ${closer}`, () => {
    const run = (lead) => host(`${lead}{% x\n${' '.repeat(closer)}%}\n`)
    assert.equal(html(run(tabbed)), html(run(spaced)))
  })
}
