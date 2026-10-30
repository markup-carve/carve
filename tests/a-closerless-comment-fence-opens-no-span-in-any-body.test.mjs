/*
 * A `%%%` with no closer ahead is the line form in every body host, so a comment
 * below the column closes the body and the next line stays out of it (CARVE-P9-053,
 * CARVE-P9-052). The item twin already read it so.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))
const below = ['%% below', '%%x%%', ' %% below', '%%%%%']

for (const [name, open, col] of [['description', ':: t\n: head\n\n', 2], ['wide description', ':: t\n:  head\n\n', 3], ['note', '[^n]: head\n\n', 2], ['item', '- head\n\n', 2]]) {
  for (const opener of ['%%%', '%%%%']) {
    for (const comment of below.filter((line) => line.trim() !== opener)) {
      for (const shift of [0, 1, 3]) {
        const pad = ' '.repeat(col)
        test(`${name}: ${opener} at +${shift} then ${JSON.stringify(comment)} ends the body`, () => {
          const out = html(`${open}${pad}${' '.repeat(shift)}${opener}\n${comment}\n\n${pad}tail\n`)
          assert.match(out, /^<p>tail<\/p>$/m, out)
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
