import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

// carve#5863: a `{%` run on a marker line after a glued attribute is measured
// from its written `{`, as the `{.x` twin is (CARVE-P2-035, carve#5788).
for (const marker of ['-', '1.', '10)']) for (const attr of ['{.g}', '{#i}']) for (const task of marker === '-' ? ['', '[ ] '] : ['']) {
  const head = `${marker}${attr} ${task}`
  const brace = head.length
  for (let col = 0; col <= brace + 2; col++) {
    test(`${head}{% b with a continuation at column ${col}`, () => {
      const pad = ' '.repeat(col)
      const comment = html(`${head}{% b\n${pad}b %}\n`)
      const twin = html(`${head}{.x\n${pad}.y}\n`)
      if (col <= brace) {
        assert.equal(comment, html(`${head}\\{% b\n${pad}b %}\n`))
        assert.equal(twin, html(`${head}\\{.x\n${pad}.y}\n`))
      } else {
        assert.doesNotMatch(comment, /\{%/)
      }
    })
  }
}
