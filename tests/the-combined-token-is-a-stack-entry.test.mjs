// PART 9 §9 THE COMBINED TOKEN: `/*` is read on the delimiter stack, not by
// the grammar's `bold_italic` production (carve#3952, carve#3987).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('the rest of a split combined token is read again as inline content', () => {
  assert.equal(html('x */*~/**b a*/~\n'), '<p>x <strong>/</strong><s><strong><em>*b a</em></strong></s></p>')
  assert.equal(html('x a/*b~/*/*/*/\n'), '<p>x a/<strong>b~/</strong><strong><em>/</em></strong></p>')
  assert.equal(html('x */*{.c}{.c}*b*/_{.c}\n'), '<p>x <strong class="c">/</strong><strong>b</strong>/_{.c}</p>')
})

test('the clause examples of the combined token', () => {
  assert.equal(html('/**/\n'), '<p><em>**</em></p>')
  assert.equal(html('/**/*/\n'), '<p><strong><em>*/</em></strong></p>')
  assert.equal(html('/*a* b*/\n'), '<p><strong><em>a* b</em></strong></p>')
  assert.equal(html('/*a _b*/ c_\n'), '<p><strong><em>a _b</em></strong> c_</p>')
  assert.equal(html('{_/*a_}\n'), '<p><u>/*a</u></p>')
  assert.equal(html('/*a {*b*} c*/\n'), '<p><strong><em>a <strong>b</strong> c</em></strong></p>')
})

test('a closer that removes the entry from below reads the opener again as two candidates', () => {
  assert.equal(html('~/*a* b~ c*/\n'), '<p><s>/<strong>a</strong> b</s> c*/</p>')
  assert.equal(html('=a /*b= c*/\n'), '<p><mark>a /*b</mark> c*/</p>')
})

test('a line comment inside the token ends at its closer and otherwise at the line end', () => {
  assert.equal(html('/*a %% b*/ y\n'), '<p><strong><em>a</em></strong> y</p>')
  assert.equal(html('a %% b*/ y\n'), '<p>a</p>')
  assert.equal(html('/*a b %% c*/ d */\n'), '<p><strong><em>a b</em></strong> d */</p>')
})

test('a combined token nests in a braced span of either of its kinds', () => {
  assert.equal(html('{*a /*b*/ c*}\n'), '<p><strong>a <strong><em>b</em></strong> c</strong></p>')
  assert.equal(html('{/a /*x*/ b/}\n'), '<p><em>a <strong><em>x</em></strong> b</em></p>')
  assert.equal(html('{/a /b/ c/}\n'), '<p><em>a /b/ c</em></p>')
})

const elapsed = (unit, length) => {
  const src = unit.repeat(Math.ceil(length / unit.length)).slice(0, length) + '\n'
  const start = performance.now()
  renderDoc(parse(src))
  return performance.now() - start
}

for (const unit of ['/*a ', '*a /*b*/ ', '~/*a* b~ c*/ ']) {
  test(`${JSON.stringify(unit)} repeated is read in linear time`, () => {
    elapsed(unit, 500)
    const small = elapsed(unit, 1000)
    const large = elapsed(unit, 8000)
    assert.ok(large < small * 24, `1,000 characters: ${small.toFixed(0)} ms, 8,000: ${large.toFixed(0)} ms`)
  })
}
