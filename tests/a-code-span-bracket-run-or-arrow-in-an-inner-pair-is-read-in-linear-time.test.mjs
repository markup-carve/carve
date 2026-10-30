// A closed, brace-free code span or bracket run inside an inner pair hides no
// closer, and an arrow does not move a `{~` closer, so the outer opener is
// still decided once (carve#4098).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('the inner spans form and the outer opener is text', () => {
  assert.equal(html('{*a {*b `c` *} {*a {*b `c` *}\n'), '<p>{*a <strong>b <code>c</code> </strong> {*a <strong>b <code>c</code> </strong></p>')
  assert.equal(html('{*a {*b [c] *} {*a {*b [c] *}\n'), '<p>{*a <strong>b [c] </strong> {*a <strong>b [c] </strong></p>')
  assert.equal(html('{~a ~> {~b ~} {~a ~> {~b ~}\n'), '<p>{~a ~&gt; <s>b </s> {~a ~&gt; <s>b </s></p>')
})

test('a construct that could hide a closer still pairs as the grammar reads it', () => {
  assert.equal(html('{*a {*b `*}` *} c *}\n'), '<p><strong>a <strong>b <code>*}</code> </strong> c </strong></p>')
  assert.equal(html('{*a :x[{*b] *}\n'), '<p><strong>a <span class="ext-x">{*b</span> </strong></p>')
  assert.equal(html('{~a~>b~} {~c ~> d~}\n'), '<p><del>a</del><ins>b</ins> <del>c </del><ins> d</ins></p>')
})

const elapsed = (unit, length) => {
  const src = unit.repeat(Math.ceil(length / unit.length)).slice(0, length) + '\n'
  const start = performance.now()
  renderDoc(parse(src))
  return performance.now() - start
}

for (const unit of ['{*a {*b `c` *} ', '{*a {*b [c] *} ', '{~a ~> {~b ~} ']) {
  test(`${JSON.stringify(unit)} repeated is read in linear time`, () => {
    elapsed(unit, 500)
    const small = elapsed(unit, 1000)
    const large = elapsed(unit, 8000)
    assert.ok(large < small * 24, `1,000 characters: ${small.toFixed(0)} ms, 8,000: ${large.toFixed(0)} ms`)
  })
}
