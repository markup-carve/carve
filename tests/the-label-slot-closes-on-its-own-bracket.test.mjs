/*
 * carve#2573. The `[label]` slot read to the first `]` at any depth, so a label
 * holding a link matched the LINK's closer and the opener never completed. A
 * colon fence then degraded to a paragraph and lost the container with its
 * children; a code fence lost its payload to an inline code span.
 *
 * Both openers carry the one `label` production, and both spelled the scan
 * themselves - the fourth and fifth copy of the `[^\]]*` shape `bracketRunEnd`
 * exists to replace. So the fence half is asserted here beside the container
 * half, and the arbiter for the shapes that stay closed is `link_text`, whose
 * close this slot now shares.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))
const label = (source) => /<p class="div-label">(.*)<\/p>/.exec(html(source))?.[1] ?? null

test('a container label holding a link keeps its container', () => {
  assert.equal(label('::: note [see [t](/u)]\nx\n:::\n'), 'see <a href="/u">t</a>')
  assert.match(html('::: note [see [t](/u)]\nx\n:::\n'), /^<aside class="admonition note"/)
})

test('a nested bracket run needs no link to balance', () => {
  assert.equal(label('::: note [see [t]]\nx\n:::\n'), 'see [t]')
})

test('the close is escape-aware and skips a literal span', () => {
  assert.equal(label('::: note [a \\] b]\nx\n:::\n'), 'a ] b')
  assert.equal(label('::: note [a `]` b]\nx\n:::\n'), 'a <code>]</code> b')
})

test('the slot reaches past a quoted header and a glued opener alike', () => {
  assert.equal(label('::: note "H" [see [t](/u)]\nx\n:::\n'), 'see <a href="/u">t</a>')
  assert.equal(label(':::[see [t](/u)]\nx\n:::\n'), 'see <a href="/u">t</a>')
})

test('a code fence label holding a link keeps the fence', () => {
  assert.equal(html('``` js [see [t](/u)]\nc\n```\n'), '<pre><code class="language-js">c\n</code></pre>')
  assert.equal(html('``` [see [t](/u)]\nc\n```\n'), '<pre><code>c\n</code></pre>')
})

test('an unclosed backtick run takes the bracket, and the line is prose', () => {
  // `link_text` reads the same shape the same way: `[a `b](/u)` is not a link,
  // because the run opens a verbatim span that reaches past the closer.
  assert.match(html('::: note [a `b]\nx\n:::\n'), /^<p>::: note \[a <code>b\]/)
  assert.equal(html('[a `b](/u)\n'), '<p>[a <code>b](/u)</code></p>')
})

test('a bare `]` after the close is still trailing junk', () => {
  assert.match(html('::: note [a] b]\nx\n:::\n'), /^<p>::: note \[a\] b\]/)
})

test('a slot with no close on the line is still prose', () => {
  assert.match(html('::: note [a\nx\n:::\n'), /^<p>::: note \[a/)
})

test('a label with no nesting is untouched', () => {
  assert.equal(label('::: note [see t]\nx\n:::\n'), 'see t')
  assert.equal(label('::: note []\nx\n:::\n'), '')
  assert.equal(label('::: figure [g]\nx\n:::\n'), 'g')
})
