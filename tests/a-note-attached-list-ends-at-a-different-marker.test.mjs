import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a different bullet starts a sibling after a note-attached list', () => {
  const output = html('[^a]: +\n* li\n- sib\n\nsee[^a]\n')
  assert.match(output, /^<ul>\n  <li>sib<\/li>\n<\/ul>/)
  assert.match(output, /<li id="fn1">\n      <ul>\n        <li>li<\/li>\n      <\/ul>/)
})

test('an ordered sibling follows an attached list with a child fence', () => {
  const output = html('[^a]: +\n- li\n  ```\n\n1. sib\n\nsee[^a]\n')
  assert.match(output, /^<ol>\n  <li>sib<\/li>\n<\/ol>/)
  assert.match(output, /<li id="fn1">\n      <ul>\n        <li>li\n          <pre><code>\n<\/code><\/pre>/)
})

test('a same-axis marker remains in the attached list', () => {
  const output = html('[^a]: +\n- one\n- two\n\nsee[^a]\n')
  assert.match(output, /<li id="fn1">\n      <ul>\n        <li>one<\/li>\n        <li>two<\/li>/)
})

test('a different marker inside an open child fence remains payload', () => {
  const output = html('[^a]: +\n- li\n  ```\n  * payload\n\nsee[^a]\n')
  assert.match(output, /<pre><code>\* payload\n\n<\/code><\/pre>/)
})

test('leading attributes remain with the first list, not its new sibling', () => {
  const output = html('[^a]: +\n{#id}\n* li\n- sib\n\nsee[^a]\n')
  assert.match(output, /^<ul>\n  <li>sib<\/li>\n<\/ul>/)
  assert.match(output, /<li id="fn1">\n      <ul id="id">\n        <li>li<\/li>/)
})

test('a resolved ordered dialect ends before a different dialect', () => {
  const output = html('[^a]: +\ni) one\nii) two\nj) three\n\nsee[^a]\n')
  assert.match(output, /^<ol type="a" start="10" data-delim="\)">\n  <li>three<\/li>/)
  assert.match(output, /<li id="fn1">\n      <ol type="i" data-delim="\)">\n        <li>one<\/li>\n        <li>two<\/li>/)
})
