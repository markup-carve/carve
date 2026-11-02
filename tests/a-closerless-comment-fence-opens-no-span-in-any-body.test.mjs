/*
 * A `%%%` with no closer ahead still opens a span in every body host (§28,
 * carve#4907, which replaced the line-form reading of CARVE-P9-053 here). A
 * comment below the column closes no body and ends no span, so the span runs to
 * the end of the body and hides `tail` (carve#4862).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))
const below = ['%% below', '%%x%%', ' %% below', '%%%%%']

for (const [name, open, col] of [['description', ':: t\n: head\n\n', 2], ['wide description', ':: t\n:  head\n\n', 3], ['note', 'x[^n]\n\n[^n]: head\n\n', 2], ['item', '- head\n\n', 2]]) {
  for (const opener of ['%%%', '%%%%']) {
    for (const comment of below.filter((line) => line.trim() !== opener)) {
      for (const shift of [0, 1, 3]) {
        const pad = ' '.repeat(col)
        test(`${name}: ${opener} at +${shift} then ${JSON.stringify(comment)} hides the rest of the body`, () => {
          const out = html(`${open}${pad}${' '.repeat(shift)}${opener}\n${comment}\n\n${pad}tail\n`)
          assert.doesNotMatch(out, /tail/, out)
          assert.match(out, /head/, out)
        })
      }
    }
  }
}

test('a closer below the column still closes a real span in a description', () => {
  const out = html(':: t\n: head\n\n  %%%\n  hidden\n%%%\n\n  tail\n')
  assert.doesNotMatch(out, /hidden/)
  assert.match(out, /<p>tail<\/p>/)
})
