// carve#4906: only an id the document renders reserves a heading slug: a resolved reference, an inline note, a referenced definition (CARVE-P2-004).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a resolved reference id reserves the slug', () => {
  assert.match(html('x[^n]{#i}\n\n[^n]: body\n\n## {#i}\n'), /<a id="i" href="#fn1" role="doc-noteref"><sup>1<\/sup><\/a><\/p>\s*<section id="i-2">/)
  assert.match(html('[^n]: body\n\n## i\n\nx[^n]{#i}\n'), /<section id="i-2">\s*<h2>i<\/h2>/)
})

test('an inline note id reserves the slug', () => {
  assert.match(html('x^[note]{#i}\n\n## i\n'), /<section id="i-2">/)
})

test('the reference id reserves from inside a container', () => {
  assert.match(html('> x[^n]{id=i}\n\n## i\n\n[^n]: body\n'), /<section id="i-2">/)
  assert.match(html('| x[^n]{#i} |\n\n## i\n\n[^n]: body\n'), /<section id="i-2">/)
})

test('an unresolved reference still reserves nothing', () => {
  assert.match(html('x[^n]{#i}\n\n## i\n'), /<section id="i">/)
})

test('an unreferenced definition reserves nothing', () => {
  assert.match(html('[^a]: x^[note]{#i}\n\n## i\n'), /<section id="i">/)
  assert.match(html('[^a]: [t]{#i}\n\n## i\n'), /<section id="i">/)
  assert.match(html('[^a]: {#i}\n  para\n\n## i\n'), /<section id="i">/)
})

test('a definition reached through another body reserves', () => {
  assert.match(html('y[^b]\n\n[^b]: x[^a]{#i}\n\n[^a]: z\n\n## i\n'), /<section id="i-2">/)
  assert.match(html('x^[a [t]{#i}]\n\n## i\n'), /<section id="i-2">/)
})

test('code text and attribute values reserve and reference nothing', () => {
  assert.match(html('```\n[t]{#i}\n```\n\n## i\n'), /<section id="i">/)
  assert.match(html('```\nx[^n]\n```\n\n[^n]: [t]{#i}\n\n## i\n'), /<section id="i">/)
  assert.match(html('{title="[t]{#i}"}\n```js\nx\n```\n\n## i\n'), /<section id="i">/)
})

test('a resolved reference link exposes the ids in its text', () => {
  assert.match(html('[x[^n]{#i}][l]\n\n[l]: u\n\n[^n]: b\n\n## i\n'), /<section id="i-2">/)
  assert.match(html('[x[^n]{#i}][nol]\n\n[^n]: b\n\n## i\n'), /<section id="i">/)
})

test('a link definition title and a dropped raw block reference nothing', () => {
  assert.match(html('[l]: /x "[^n]"\n\n[^n]: [t]{#i}\n\n## i\n'), /<section id="i">/)
  assert.match(html('```=latex\nx[^n]\n```\n\n[^n]: [t]{#i}\n\n## i\n'), /<section id="i">/)
  assert.match(html('[l]: /x "[t]{#i}"\n\n## i\n'), /<section id="i">/)
})
