/*
 * A `%%%` with no closer ahead is the line form in every body host (CARVE-P9-053).
 * A comment below the column closes no body, so the next line's column decides
 * (carve#4862).
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
        test(`${name}: ${opener} at +${shift} then ${JSON.stringify(comment)} leaves the body open`, () => {
          const out = html(`${open}${pad}${' '.repeat(shift)}${opener}\n${comment}\n\n${pad}tail\n`)
          assert.match(out, /^ +<p>tail(?:<a [^>]*>↩<\/a>)?<\/p>$/m, out)
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
