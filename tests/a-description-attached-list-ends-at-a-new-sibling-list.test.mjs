import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a different bullet starts a sibling after a description-attached list (#5574)', () => {
  const output = html(':: t\n: +\n* li\n- sib\n')
  assert.match(output, /<dd>\n    <ul>\n      <li>li<\/li>\n    <\/ul>\n  <\/dd>\n<\/dl>\n<ul>\n  <li>sib<\/li>\n<\/ul>/)
})

test('an ordered sibling follows a description-attached list with a child fence (#5574)', () => {
  const output = html(':: t\n: +\n- li\n  ```\n\n1. sib\n')
  assert.match(output, /<\/dl>\n<ol>\n  <li>sib<\/li>\n<\/ol>/)
  assert.match(output, /<li>li\n        <pre><code>\n<\/code><\/pre>/)
})

test('a resolved ordered dialect ends before a different dialect under a description (#5574)', () => {
  const output = html(':: t\n: +\ni) one\nii) two\nj) three\n')
  assert.match(output, /<ol type="i" data-delim="\)">\n      <li>one<\/li>\n      <li>two<\/li>\n    <\/ol>\n  <\/dd>/)
  assert.match(output, /<\/dl>\n<ol type="a" start="10" data-delim="\)">\n  <li>three<\/li>/)
})

test('a same-axis marker and a sibling description stay as before', () => {
  assert.match(html(':: t\n: +\n- one\n- two\n'), /<ul>\n      <li>one<\/li>\n      <li>two<\/li>\n    <\/ul>\n  <\/dd>\n<\/dl>/)
  assert.match(html(':: t\n: +\n* li\n: d2\n'), /<\/dd>\n  <dd>d2<\/dd>/)
})

for (const marker of [': +', ':  +']) {
  test(`an open child fence keeps its blank and its list under "${marker}" (#5575)`, () => {
    const output = html(':: t\n' + marker + '\n- li\n  ```\n\n- sib\n')
    assert.match(output, /<li><p>li<\/p>\n        <pre><code>\n<\/code><\/pre>\n      <\/li>\n      <li><p>sib<\/p><\/li>\n    <\/ul>\n  <\/dd>\n<\/dl>/)
  })
}
