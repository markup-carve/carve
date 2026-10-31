import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('a cloned heading keeps the text of its inner crossref', () => {
  assert.equal(html('# a </#b>\n\n## b\n\n</#a>\n'),
    '<section id="a">\n  <h1>a <a href="#b">b</a></h1>\n  <section id="b">\n    <h2>b</h2>\n    <p><a href="#a">a b</a></p>\n  </section>\n</section>')
})

test('the inner target keeps markup and drops ids in the outer clone', () => {
  const result = html('# a </#b>\n\n## *b*{#inner}\n\n</#a>\n')
  assert.match(result, /<p><a href="#a">a <strong>b<\/strong><\/a><\/p>/)
  assert.equal((result.match(/id="inner"/g) ?? []).length, 1)
})

test('a cycle contributes the target text and remains at the one-level boundary', () => {
  const result = html('# a </#b>\n\n## b </#a>\n\n</#a>\n')
  assert.match(result, /<p><a href="#a">a b <\/a><\/p>/)
})

test('a noncyclic target keeps its own text without expanding another reference', () => {
  const result = html('# a </#b>\n\n## b </#c>\n\n### c\n\n</#a>\n')
  assert.match(result, /<p><a href="#a">a b <\/a><\/p>/)
})

test('a reference link in the inner target contributes text without a nested link', () => {
  const result = html('# a </#b-Link>\n\n## b [Link][x]\n\n[x]: https://example.com\n\n</#a>\n')
  assert.match(result, /<p><a href="#a">a b Link<\/a><\/p>/)
})

test('a missing inner target contributes its visible literal text', () => {
  const result = html('# a </#missing>\n\n</#a>\n')
  assert.match(result, /<p><a href="#a">a &lt;\/#missing&gt;<\/a><\/p>/)
})

test('a caption target contributes its label without nesting links', () => {
  const result = html('# a </#t>\n\n{#t}\n| a |\n^ Figure #: x\n\n</#a>\n')
  assert.match(result, /<p><a href="#a">a Figure 1<\/a><\/p>/)
})
