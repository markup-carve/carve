/*
 * A malformed colon opener is text and leaves no state (carve#4863). The bare
 * run below it opens a div, which leaves no paragraph for a lazy line; the
 * valid opener spelling ends the item the same way.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()

test('the bare run below a malformed opener ends the paragraph and the lazy line ends the item', () => {
  assert.equal(
    html('- item\n  :::note\n  body\n  :::\ntail\n'),
    '<ul><li>item :::note body <div></div></li></ul><p>tail</p>',
  )
})

test('a VALID opener closes the paragraph and the lazy line ends the item', () => {
  assert.equal(
    html('- item\n  ::: note\n  body\n  :::\ntail\n'),
    '<ul><li>item <aside class="admonition note" aria-label="Note"><p>body</p></aside></li></ul><p>tail</p>',
  )
})

test('the lazy line reads from column 1 as it does from column 0', () => {
  assert.equal(
    html('- item\n  :::note\n  body\n  :::\n tail\n'),
    html('- item\n  :::note\n  body\n  :::\ntail\n'),
  )
})

test('the malformed fence may be the paragraph first line, on the marker line', () => {
  assert.equal(
    html('- :::note\n  body\n  :::\ntail\n'),
    '<ul><li>:::note body <div></div></li></ul><p>tail</p>',
  )
})

test('the same shape inside a block quote reads the same', () => {
  assert.equal(
    html('> - item\n>   :::note\n>   body\n>   :::\n> tail\n'),
    '<blockquote><ul><li>item :::note body <div></div></li></ul><p>tail</p></blockquote>',
  )
})

test('a malformed opener alone is a paragraph of its own', () => {
  assert.equal(
    html('- item\n\n  :::note\n\n  ::: note\n  body\n  :::\ntail\n'),
    '<ul><li><p>item</p><p>:::note</p><aside class="admonition note" aria-label="Note"><p>body</p></aside></li></ul><p>tail</p>',
  )
})

test('a bare fence after a blank opens a div', () => {
  assert.equal(
    html('- item\n  :::note\n\n  :::\n  body\n  :::\ntail\n'),
    '<ul><li><p>item :::note</p><div><p>body</p></div></li></ul><p>tail</p>',
  )
})

const exactHtml = (src) => renderDoc(parse(src)).trim()

for (const [source, expected] of [
    ['- one\n::: \tnote\n+\n', '<ul>\n  <li>one\n::: \tnote</li>\n</ul>'],
    ['    - c\n::::>\n', '<ul>\n  <li>c\n::::&gt;</li>\n</ul>'],
    ['    - second\n   tail\n::: \t[First]\n', '<ul>\n  <li>second\ntail\n::: \t[First]</li>\n</ul>'],
    // The fence below it opens without a closer (carve#4018).
    ['- b\n:::>\n     ```\n y\n', '<ul>\n  <li>b\n:::&gt;\n    <pre><code></code></pre>\n  </li>\n</ul>\n<p>y</p>'],
  ]) {
  test(`rejected colon opener stays in list paragraph: ${JSON.stringify(source)}`, () => {
    assert.equal(exactHtml(source), expected)
  })
}

test('a valid colon opener still interrupts a list paragraph', () => {
  assert.equal(
    exactHtml('- one\n::: note\n+\n'),
    '<ul>\n  <li>one</li>\n</ul>\n<aside class="admonition note" aria-label="Note">\n  <p>+</p>\n</aside>',
  )
})
