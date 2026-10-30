// A batch member glued to an opener attaches to nothing, so the re-read does not
// take it back and a run of them is escaped in one pass (carve#4324).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src + '\n')).trim()

const pair = '%<s id="i">{<span class="tag"><strong>#i</strong></span>} %</s>'
const lone = '%~{<span class="tag"><strong>#i</strong></span>}'

test('every second ~ pairs and takes the block after its closer', () => {
  assert.equal(html('%~{#i} %~{#i} %~{#i}'), `<p>${pair} ${lone}</p>`)
  assert.equal(html(Array(8).fill('%~{#i}').join(' ')), `<p>${Array(4).fill(pair).join(' ')}</p>`)
})

const elapsed = (unit, length) => {
  const src = unit.repeat(Math.ceil(length / unit.length)).slice(0, length)
  const start = performance.now()
  html(src)
  return performance.now() - start
}

for (const unit of ['%~{#i} ', '%*{#i} ']) {
  test(`${JSON.stringify(unit)} repeated is read in linear time`, () => {
    elapsed(unit, 70)
    const small = elapsed(unit, 140)
    const large = elapsed(unit, 1120)
    assert.ok(large < small * 24, `140 characters: ${small.toFixed(0)} ms, 1,120: ${large.toFixed(0)} ms`)
  })
}
