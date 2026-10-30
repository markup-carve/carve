/*
 * A span's closer is not the next character for a quote after a dash
 * (CARVE-P3-023 R1): the quote reads as at the end of a paragraph (carve#4318).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const text = (s) => s.replace(/<[^>]+>/g, '')

test('the ruling case', () => {
  assert.equal(html('*"Wait-"*\n'), '<p><strong>“Wait-”</strong></p>')
  assert.equal(html('_"Wait-"_\n'), '<p><u>“Wait-”</u></p>')
})

const spans = [['*', '*'], ['_', '_'], ['/', '/'], ['~', '~'], ['{*', '*}'], ['{_', '_}'], ['{=', '=}'], ['{^', '^}'],
  ['{+', '+}'], ['{-', '-}'], ['[', ']{.x}']]
for (const [o, c] of spans)
  for (const pre of ['', 'a '])
    for (const q of ['"', "'"])
      for (const d of ['-', '--', '—', '/'].filter((d) => d !== o.at(-1)))
        for (const after of ['', ' x']) {
          const inner = `${pre}${q}Wait${d}${q}`
          const src = `${o}${inner}${c}${after}\n`
          test(JSON.stringify(src), () => {
            assert.ok(text(html(src)).includes(text(html(`${inner}\n`))), html(src))
          })
        }
