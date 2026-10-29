import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// An attribute run glued to a closed span attaches (PART 3 `attribute_run`),
// also when the span's guard closes only inside a later unattached block
// (carve#3915).
const html = (src) => renderDoc(parse(src + '\n')).trim()

test('the first block attaches once the outer span closes in the second', () => {
  assert.equal(html('_/a/{t="q"} _/a/{t="_"}'), '<p><u><em t="q">a</em> _/a/{t=“</u>”}</p>')
})

for (const inner of ['/', '*', '~', '=']) for (const value of ['q', 'x y']) {
  for (const later of ['/', '*', '~', '=']) {
    const src = `_${inner}a${inner}{t="${value}"} _${later}a${later}{t="_"}`
    test(`attaches: ${src}`, () => {
      assert.ok(html(src).startsWith(`<p><u><`) && html(src).includes(` t="${value}">a</`), src)
    })
  }
}

// A delimiter inside the first block that closes the outer span keeps the block text.
test('a block whose own delimiter closes the outer span stays text', () => {
  assert.equal(html('_/a/{t="_"} _*a*{t="_"}'), '<p><u><em>a</em>{t=“</u>”} <u><strong>a</strong>{t=“</u>”}</p>')
})
