import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('reference labels contribute before resolution in headings and task names', () => {
  assert.match(html('# [a][missing]'), /<section id="a">/)
  assert.match(html('# ![alt][missing]'), /<section id="alt">/)
  assert.match(html('- [x] done [a][missing]'), /aria-label="done a"/)
})

test('nested reference labels contribute at every depth to heading text', () => {
  assert.equal(html('# a [[x][]][]'), '<section id="a-x">\n  <h1>a [[x][]][]</h1>\n</section>')
  assert.equal(html('# [[x][]][]'), '<section id="x">\n  <h1><a href="#x">x</a></h1>\n</section>')
  assert.equal(html('# z [[[x][]][]][]'), '<section id="z-x">\n  <h1>z [[[x][]][]][]</h1>\n</section>')
  assert.equal(html('# a [[x][]][]\n\n[a x][]'), '<section id="a-x">\n  <h1>a [[x][]][]</h1>\n  <p><a href="#a-x">a x</a></p>\n</section>')
})

test('a promoted image in a definition body uses block layout', () => {
  assert.match(html(':: term\n:  ![alt](url)'), /<dd>\n    <img src="url" alt="alt">\n  <\/dd>/)
  assert.match(html(':: term\n:  text'), /<dd>text<\/dd>/)
})

test('authored block IDs are reserved before heading slugs', () => {
  assert.match(html('# x\n{#x}\nbody'), /<section id="x-2">/)
  assert.match(html('# x\n{#x}\nbody'), /<p id="x">body<\/p>/)
  assert.match(html('# x\n{#x}\n{#y}\nbody'), /<section id="x">/)
  assert.match(html('# x\n\n[body]{#x}'), /<section id="x-2">/)
})

test('structural image attributes precede authored block attributes', () => {
  assert.match(html('{#x .photo}\n![](url)'), /<img src="url" alt="" id="x" class="photo">/)
})

test('math text joins adjacent heading text before slugging', () => {
  assert.match(html('# a$`x`'), /<section id="ax">/)
  assert.match(html('# $`x`a'), /<section id="xa">/)
})
