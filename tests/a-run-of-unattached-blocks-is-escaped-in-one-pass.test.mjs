import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// The inline re-read escapes a run of unattached blocks together and keeps the
// text of every one of them, however many the paragraph holds (carve#3936).
const html = (src) => renderDoc(parse(src + '\n')).trim()

for (const [unit, out] of [
  ['_*a*{t="_"} b/{t=c_}', '<u><strong t="_">a</strong> b/{t=c</u>}'],
  ['_/a/{t="q"} _*a*{t="_"}', '<u><em t="q">a</em> _*a*{t=“</u>”}'],
]) {
  for (const n of [1, 3, 8, 40]) {
    test(`${n} x ${unit}`, () => {
      assert.equal(html(Array(n).fill(unit).join(' ')), `<p>${Array(n).fill(out).join(' ')}</p>`)
    })
  }
}

test('a block that attaches once an earlier one is text is not escaped with it', () => {
  assert.equal(
    html('_/a/{.c}/ x_~{t="_"}{t="*"}/{.c}*{t=c_}'),
    '<p><u><em class="c">a</em>/ x</u>~{t=“_”}{t=“<strong t="c_">“}/{.c}</strong></p>',
  )
  assert.equal(
    html('_/a/{t="q"} _*a*{t="_"} _*a*{t="_"} b/{t=c_}'),
    '<p><u><em t="q">a</em> _*a*{t=“</u>”} <u><strong t="_">a</strong> b/{t=c</u>}</p>',
  )
})

test('a block whose text opens a code span is escaped before the blocks it covers', () => {
  assert.equal(html('_/a/{t="q`} "} _/a/{t="_"}'), '<p>_/a/{t=“q<code>} "} _/a/{t="_"}</code></p>')
})

test('a run of 400 blocks reads in well under the one-pass-per-block time', () => {
  const src = Array(200).fill('_*a*{t="_"} b/{t=c_}').join(' ')
  const start = performance.now()
  html(src)
  assert.ok(performance.now() - start < 20000)
})

test('blocks left after many passes are still text', () => {
  assert.equal(
    html('a_/a/{t="q"} _*a*{t="_"}_*a*{t="_"} b/{t=c_} {t="*"}{t=c_}_*a*{t="_"} b/{t=c_}'),
    '<p>a_/a/{t=“q”} <u><strong t="_">a</strong></u>*a*{t=“<u>“} b/{t=c</u>} {t=“<strong t="_">“}{t=c_}_*a</strong> b/{t=c_}</p>',
  )
})
