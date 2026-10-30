/*
 * Openers that never close do not nest (PART 9 §25, carve#4236). A long run of
 * `[` in front of one `[x](u)` renders the link and keeps the rest literal, the
 * way carve-js, carve-php and carve-rs do, instead of refusing at the nesting
 * bound. Pairs that do nest past the bound still refuse.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, Refuse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

for (const [open, count] of [['[', 201], ['[', 1500]]) {
  test(`${count} of ${open} before one link render`, () => {
    const run = open.repeat(count)
    assert.equal(html(`${run}x](u)\n`), `<p>${run.slice(0, -1)}<a href="u">x</a></p>`)
  })
}

test('an image alt chain renders the image', () => {
  const run = '!['.repeat(400)
  assert.equal(html(`${run}a](i.png)\n`), `<p>${run.slice(0, -2)}<img src="i.png" alt="a"></p>`)
})

test('a chain on several lines of one paragraph renders each link', () => {
  const line = '['.repeat(150) + 'x](u)'
  const out = html(`${line}\n${line}\n`)
  assert.equal(out.match(/<a href="u">x<\/a>/g).length, 2)
})

test('pairs nested past the bound still refuse', () => {
  assert.throws(() => html('['.repeat(300) + 'x' + ']'.repeat(300) + '\n'), Refuse)
})
