// A delimiter's glued block whose bare value runs to the end of the line, with
// no `}` to close it, is rejected without rescanning that line (carve#4092).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('an unclosed bare value is text and a closed one still attaches', () => {
  assert.equal(html('*{k=x*{k=x*{k=x\n'), '<p><strong>{k=x</strong>{k=x*{k=x</p>')
  assert.equal(html('*a*{k=x*y}\n'), '<p><strong k="x*y">a</strong></p>')
  assert.equal(html('*a*{k=x .c}\n'), '<p><strong k="x" class="c">a</strong></p>')
  assert.equal(html('*a*{k=x\r\n'), '<p><strong>a</strong>{k=x</p>')
  assert.equal(html('[a]{k=😀}\n'), '<p><span k="😀">a</span></p>')
})

const elapsed = (unit, length) => {
  const src = unit.repeat(Math.ceil(length / unit.length)).slice(0, length) + '\n'
  const start = performance.now()
  renderDoc(parse(src))
  return performance.now() - start
}

for (const unit of ['*{k=x', 'b*{k=x', '/*b*/{k=x', '_{k=x', '*a*{k=x']) {
  test(`${JSON.stringify(unit)} repeated is read in linear time`, () => {
    elapsed(unit, 500)
    const small = elapsed(unit, 1000)
    const large = elapsed(unit, 8000)
    assert.ok(large < small * 24, `1,000 characters: ${small.toFixed(0)} ms, 8,000: ${large.toFixed(0)} ms`)
  })
}
