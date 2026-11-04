/*
 * A fenced body is not a paragraph, so a line below the column of the item that
 * opened the fence closes the fence and the item (CARVE-P0-013). A `%%%` written
 * there opens a span owned by the enclosing body, and a line that misses that
 * body ends the span and the body (PART 0 S1, carve#5103).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\s*\n\s*/g, '')

test('a column-zero line after a description comment below an item fence is a document paragraph', () => {
  assert.equal(html(':: t\n: - ```\n  %%%\n  y\nx\n'), '<dl><dt>t</dt><dd><ul><li><pre><code></code></pre></li></ul></dd></dl><p>x</p>')
})

test('a nested item fence leaves the line to the document too', () => {
  assert.equal(html(':: t\n:   - 1. ~~~\n       %%%\n        y\nx\n'),
    '<dl><dt>t</dt><dd><ul><li><ol><li><pre><code></code></pre></li></ol></li></ul></dd></dl><p>x</p>')
})

test('the open fence reads like a closed item paragraph', () => {
  assert.equal(html(':: t\n: - ```\n  %%%\n  y\nx\n').replace('<pre><code></code></pre>', 'a'), html(':: t\n: - a\n  %%%\n  y\nx\n'))
})

test('a %%% at the item column stays code payload', () => {
  assert.equal(html(':: t\n: - ```\n    %%%\n    y\nx\n'), '<dl><dt>t</dt><dd><ul><li><pre><code>%%%y</code></pre></li></ul></dd></dl><p>x</p>')
})

test('a line at the body column stays in the description span', () => {
  assert.equal(html(':: t\n: - ```\n  %%%\n  y\n  z\n'), '<dl><dt>t</dt><dd><ul><li><pre><code></code></pre></li></ul></dd></dl>')
})
