// A braced opener whose later closers all close spans inside it is text, and
// is decided once instead of scanning to the end of the block (carve#3987).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('the inner spans form and the outer opener is text', () => {
  assert.equal(html('{*a {*b *} {*a {*b *}\n'), '<p>{*a <strong>b </strong> {*a <strong>b </strong></p>')
  assert.equal(html('{*a {*b *} c *} {*d {*e *}\n'), '<p><strong>a <strong>b </strong> c </strong> {*d <strong>e </strong></p>')
  assert.equal(html('{*a {**} *}\n'), '<p><strong>a {*</strong> *}</p>')
})

test('an opener that could hide a closer still pairs as the grammar reads it', () => {
  assert.equal(html('{*a \\{*b *}\n'), '<p><strong>a {*b </strong></p>')
  assert.equal(html('{+a {+b +}\n'), '<p><ins>a {+b </ins></p>')
})

const elapsed = (unit, length) => {
  const src = unit.repeat(Math.ceil(length / unit.length)).slice(0, length) + '\n'
  const start = performance.now()
  renderDoc(parse(src))
  return performance.now() - start
}

for (const unit of ['{*a {*b *} ', '{*a {_b _} ', '{/a {/b. /} ', '{*a {*b (x) :y: *} ', '{~a {~b ~} ']) {
  test(`${JSON.stringify(unit)} repeated is read in linear time`, () => {
    elapsed(unit, 500)
    const small = elapsed(unit, 1000)
    const large = elapsed(unit, 8000)
    assert.ok(large < small * 24, `1,000 characters: ${small.toFixed(0)} ms, 8,000: ${large.toFixed(0)} ms`)
  })
}
