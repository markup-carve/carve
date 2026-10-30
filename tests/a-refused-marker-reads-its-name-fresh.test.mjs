/*
 * A `#` or `@` refused by the left boundary is an ordinary character and what
 * follows is read fresh, so a name run's `-` still forms an arrow (carve#4329).
 * The escaped marker is the reference reading.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('the ruling cases', () => {
  assert.equal(html('b#->\n'), '<p>b#→</p>')
  assert.equal(html('b@->\n'), '<p>b@→</p>')
  assert.equal(html('b#-->\n'), '<p>b#→</p>')
})

test('a tag that opens keeps its dash', () => {
  assert.equal(html('x #->\n'), '<p>x <span class="tag"><strong>#-</strong></span>&gt;</p>')
})

for (const left of ['b', '1', 'b_', '#i', '@a'])
  for (const m of ['#', '@'])
    for (const run of ['-', 'x-', 'x--', '-x-', '_-', '_x_-'])
      for (const tail of ['>', '>=', '>*a*'])
        for (const [o, c] of [['', ''], ['*', '*'], ['{+', '+}'], ['- ', '']]) {
          const src = `${o}${left}${m}${run}${tail}${c}\n`
          test(JSON.stringify(src), () => {
            assert.equal(html(src), html(`${o}${left}\\${m}${run}${tail}${c}\n`))
          })
        }
