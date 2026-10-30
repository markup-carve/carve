import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// Layout whitespace is not the subject, so every line break goes.
const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, '')

test('an invisible line a nested + pulls does not take the closer of the open div', () => {
  for (const line of ['%%', '%% c', '{.c}', '[l]: /u', '{.c}\n%%']) {
    assert.equal(html(`::: d\n- a\n  - +\n${line}\n:::\nafter\n`),
      '<div class="d"><ul><li>a<ul><li></li></ul></li></ul></div><p>after</p>', line)
    assert.equal(html(`::: d\n- :: t\n  : +\n${line}\n:::\nafter\n`),
      '<div class="d"><ul><li><dl><dt>t</dt><dd></dd></dl></li></ul></div><p>after</p>', line)
  }
})

test('an invisible line a nested + pulls still leads the block after it', () => {
  assert.equal(html('- a\n  - +\n%%\nx\ny\n'), '<ul><li>a<ul><li>xy</li></ul></li></ul>')
})

test('an unclosed fence a nested + takes keeps a marker line as payload', () => {
  assert.equal(html('- - +\n```\n- z\n'), '<ul><li><ul><li><pre><code>- z</code></pre></li></ul></li></ul>')
  assert.equal(html('- a\n  - +\n```\n- z\n'), '<ul><li>a<ul><li><pre><code>- z</code></pre></li></ul></li></ul>')
  assert.equal(html('- 1. +\n~~~\n1. z\n- w\n'), '<ul><li><ol><li><pre><code>1. z- w</code></pre></li></ol></li></ul>')
})

test('a blank line still bounds that unclosed fence, as for the one-level item', () => {
  assert.equal(html('- - +\n```\n- z\n\nq\n'), '<ul><li><ul><li><pre><code></code></pre></li></ul></li><li>z</li></ul><p>q</p>')
})

test('a + inside the fence a nested + takes is payload', () => {
  assert.equal(html('- - +\n```\n+\nz\n'), '<ul><li><ul><li><pre><code>+z</code></pre></li></ul></li></ul>')
  assert.equal(html('- a\n  - +\n```\nq\n+\nz\n```\nw\n'), '<ul><li>a<ul><li><pre><code>q+z</code></pre></li></ul></li></ul><p>w</p>')
})

test('a + after the block a nested + took still attaches to the outer item', () => {
  assert.equal(html('- - +\n```\nq\n```\n+\nz\n'), '<ul><li><ul><li><pre><code>q</code></pre></li></ul>z</li></ul>')
})
