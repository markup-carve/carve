import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const [name, prefix, suffix] of [
  ['note', '[^a]: +\n', '\n\nsee[^a]\n'],
  ['description', ':: t\n: +\n', '\n'],
  ['item', '- +\n', '\n'],
  ['root', '', '\n'],
]) {
  test(`an unclosed fence follower keeps its payload in the refused run's paragraph in a ${name}`, () => {
    const output = renderDoc(parse(`${prefix}{.x\n.y}\n\`\`\`\nwa${suffix}`))
    assert.match(output, /\{\.x\n\.y\}\n<code>\nwa<\/code>/)
    assert.doesNotMatch(output, /<pre>/)
  })
}

test('a shifted note keeps an unclosed backtick follower and its payload', () => {
  const output = renderDoc(parse('  [^a]: +\n  {.x\n  .y}\n  ```\n  wa\n\nsee[^a]\n'))
  assert.match(output, /<p>\{\.x\n\.y\}\n<code>\nwa<\/code><a href=/)
  assert.doesNotMatch(output, /<pre>/)
})

test('a later heading ends the one block an item plus attached', () => {
  const output = renderDoc(parse('- +\n{.x\n.y}\n```\nwa\n# h\n'))
  assert.match(output, /<code>\nwa<\/code><\/li>\n<\/ul>\n<section id="h">/)
})

test('a later list starts outside a note or description plus', () => {
  const note = renderDoc(parse('[^a]: +\n{.x\n.y}\n```\nwa\n- li\n\nsee[^a]\n'))
  const description = renderDoc(parse(':: t\n: +\n{.x\n.y}\n```\nwa\n- li\n'))
  assert.match(note, /^<ul>\n  <li>li<\/li>\n<\/ul>\n<p>see/)
  assert.match(description, /<code>\nwa<\/code><\/dd>\n<\/dl>\n<ul>/)
})

test('a root paragraph folds a later list marker into its unclosed code span', () => {
  const output = renderDoc(parse('{.x\n.y}\n```\nwa\n- li\n'))
  assert.match(output, /<code>\nwa\n- li<\/code><\/p>/)
})

test('a matching closer keeps block-shaped lines inside the code span', () => {
  const output = renderDoc(parse('[^a]: +\n{.x\n.y}\n```\nwa\n# h\n```\n\nsee[^a]\n'))
  assert.match(output, /<code>\nwa\n# h\n<\/code>/)
  assert.doesNotMatch(output, /<h1|<pre>/)
  assert.match(output, /<section role="doc-endnotes"/)
})
