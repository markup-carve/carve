import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (src) => renderDoc(parse(src))

test('an unprefixed continuation refuses a note marker-line quote run (#5830)', () => {
  for (let col = 0; col <= 10; col++) {
    const html = render(`[^q]: > {.x\n${' '.repeat(col)}.y}\n\nx[^q]\n`)
    assert.match(html, /<blockquote><p>\{\.x\n\.y\}<\/p><\/blockquote>/, `column ${col}`)
  }
})

test('an unprefixed continuation refuses an item marker-line quote run (#5830)', () => {
  for (let col = 0; col <= 6; col++) {
    const html = render(`- > {.x\n${' '.repeat(col)}.y}\n`)
    assert.match(html, /\{\.x\n\.y\}/, `column ${col}`)
  }
})

test('a task box and nested quote refuse unprefixed brace continuations (#5830)', () => {
  const cases = [['- [ ] > {.x', 8], ['- [ ] > > {.x', 10], ['[^q]: > > {.x', 10], ['- [^q]: > {.x', 10]]
  for (const [first, brace] of cases) {
    for (let col = 0; col <= brace + 2; col++) {
      const html = render(`${first}\n${' '.repeat(col)}.y}\n\nx[^q]\n`)
      assert.match(html, /\{\.x\n\.y\}/, `${first} column ${col}`)
    }
  }
})
