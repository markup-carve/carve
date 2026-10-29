// A braced or editorial opener with no closer of its mark after it fails at
// once instead of scanning to the end of the block (carve#3987, carve#3923).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a closerless opener is text and a closed one still forms', () => {
  assert.equal(html('{*a {*a {*a\n'), '<p>{*a {*a {*a</p>')
  assert.equal(html('{*a {_b {/c {*a {_b {/c\n'), '<p>{*a {_b {/c {*a {_b {/c</p>')
  assert.equal(html('={_a={c ={_a={c\n'), '<p><mark>{_a</mark>{c <mark>{_a</mark>{c</p>')
  assert.equal(html('{+x {+y+}\n'), '<p><ins>x {+y</ins></p>')
  assert.equal(html('{*a {_b_} c*} {*d\n'), '<p><strong>a <u>b</u> c</strong> {*d</p>')
})

const elapsed = (unit, length) => {
  const src = unit.repeat(Math.ceil(length / unit.length)).slice(0, length) + '\n'
  const start = performance.now()
  renderDoc(parse(src))
  return performance.now() - start
}

for (const unit of ['{*a ', '{*a {_b {/c ', '={_a={c ', '{+x ', '{~a~>{+b ', '{%a ']) {
  test(`${JSON.stringify(unit)} repeated is read in linear time`, () => {
    elapsed(unit, 500)
    const small = elapsed(unit, 1000)
    const large = elapsed(unit, 8000)
    assert.ok(large < small * 24, `1,000 characters: ${small.toFixed(0)} ms, 8,000: ${large.toFixed(0)} ms`)
  })
}
