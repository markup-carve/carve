import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (src) => renderDoc(parse(src))

test('a quote on a note marker line measures its `{` where it is written (#5820)', () => {
  // `[^q]: > {` puts the brace at source column 8.
  for (let col = 0; col <= 10; col++) {
    const html = render(`[^q]: > {.x\n${' '.repeat(col)}.y}\n\nx[^q]\n`)
    if (col <= 8) assert.match(html, /<blockquote><p>\{\.x\n\.y\}<\/p><\/blockquote>/, `column ${col}`)
    else assert.doesNotMatch(html, /\{\.x|\.y\}/, `column ${col}`)
  }
})

test('a quote on an item marker line measures a lazy continuation against its written `{` (#5820, #5792)', () => {
  // `- > {` puts the brace at source column 4; column 1 is a lazy line.
  for (let col = 0; col <= 6; col++) {
    const html = render(`- > {.x\n${' '.repeat(col)}.y}\n`)
    if (col <= 4) assert.match(html, /\{\.x\n\.y\}/, `column ${col}`)
    else assert.doesNotMatch(html, /\{\.x|\.y\}/, `column ${col}`)
  }
})

test('a task box and a nested quote on the marker line keep the written `{` column (#5820)', () => {
  const cases = [['- [ ] > {.x', 8], ['- [ ] > > {.x', 10], ['[^q]: > > {.x', 10], ['- [^q]: > {.x', 10]]
  for (const [first, brace] of cases) {
    for (let col = 0; col <= brace + 2; col++) {
      const html = render(`${first}\n${' '.repeat(col)}.y}\n\nx[^q]\n`)
      if (col <= brace) assert.match(html, /\{\.x\n\.y\}/, `${first} column ${col}`)
      else assert.doesNotMatch(html, /\{\.x|\.y\}/, `${first} column ${col}`)
    }
  }
})
