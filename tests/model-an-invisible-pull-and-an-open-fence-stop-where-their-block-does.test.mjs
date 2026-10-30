import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// Layout whitespace is not the subject, so every line break goes.
const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, '')

const letter = (source) => html(source.replace('+', 'Z')).replace('Z', '+')

test('a closer after the invisible lines refuses a nested + and stays the div\'s, carve#4449', () => {
  for (const line of ['%%', '%% c', '{.c}', '[l]: /u', '{.c}\n%%']) {
    const held = line.replace(/^/gm, '  ')
    assert.equal(html(`::: d\n- a\n  - +\n${held}\n:::\nafter\n`),
      '<div class="d"><ul><li>a<ul><li>+</li></ul></li></ul></div><p>after</p>', line)
    assert.equal(html(`::: d\n- :: t\n  : +\n${held}\n:::\nafter\n`),
      '<div class="d"><ul><li><dl><dt>t</dt><dd>+</dd></dl></li></ul></div><p>after</p>', line)
  }
})

test('an invisible line at column 0 is refused by a nested +', () => {
  for (const line of ['%%', '%% c', '{.c}', '[l]: /u', '{.c}\n%%']) {
    const source = `::: d\n- a\n  - +\n${line}\n:::\nafter\n`
    assert.equal(html(source), letter(source), line)
  }
})

test('an invisible line a nested + takes still leads the block after it', () => {
  assert.equal(html('- a\n  - +\n  %%\n  x\n  y\n'), '<ul><li>a<ul><li>xy</li></ul></li></ul>')
})

test('an unclosed fence a nested + takes keeps a marker line as payload', () => {
  assert.equal(html('- - +\n  ```\n  - z\n'), '<ul><li><ul><li><pre><code>- z</code></pre></li></ul></li></ul>')
  assert.equal(html('- a\n  - +\n  ```\n  - z\n'), '<ul><li>a<ul><li><pre><code>- z</code></pre></li></ul></li></ul>')
  assert.equal(html('- 1. +\n  ~~~\n  1. z\n  - w\n'), '<ul><li><ol><li><pre><code>1. z- w</code></pre></li></ol></li></ul>')
})

test('a fence at column 0 is refused by a nested +', () => {
  assert.equal(html('- - +\n```\n- z\n'), letter('- - +\n```\n- z\n'))
})

test('a blank line still bounds that unclosed fence, as for the one-level item', () => {
  assert.equal(html('- - +\n  ```\n  - z\n\nq\n'), '<ul><li><ul><li><pre><code></code></pre></li><li>z</li></ul></li></ul><p>q</p>')
})

test('a + inside the fence a nested + takes is payload', () => {
  assert.equal(html('- - +\n  ```\n  +\n  z\n'), '<ul><li><ul><li><pre><code>+z</code></pre></li></ul></li></ul>')
  assert.equal(html('- a\n  - +\n  ```\n  q\n  +\n  z\n  ```\nw\n'), '<ul><li>a<ul><li><pre><code>q+z</code></pre></li></ul></li></ul><p>w</p>')
})

test('a + after the block a nested + took still attaches to the outer item', () => {
  assert.equal(html('- - +\n  ```\n  q\n  ```\n+\nz\n'), '<ul><li><ul><li><pre><code>q</code></pre></li></ul>z</li></ul>')
})
