import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('an empty block is a member of a bracketed span run in any position (carve#4077)', () => {
  for (const src of ['[a]{}{.b}', '[a]{}{}{.b}', '[a]{.b}{}', '[a]{ }{.b}', '[a]{.b}{ }', '[a]{}{.b}{}']) {
    assert.equal(html(`${src}\n`), '<p><span class="b">a</span></p>', src)
  }
  assert.equal(html('[a]{.b}{}{#i}\n'), '<p><span class="b" id="i">a</span></p>')
  assert.equal(html('[a]{}{}\n'), '<p><span>a</span></p>')
})

test('the run still ends at a space, a tab or an invalid block', () => {
  assert.equal(html('[a]{} {.b}\n'), '<p><span>a</span> {.b}</p>')
  assert.equal(html('[a]{}{???}\n'), '<p><span>a</span>{???}</p>')
  assert.equal(html('[a]{\t}\n'), '<p>[a]{\t}</p>')
})

test('other carriers take no empty block', () => {
  assert.equal(html('*x*{}{.b}\n'), '<p><strong>x</strong>{}{.b}</p>')
  assert.equal(html('`x`{}{.b}\n'), '<p><code>x</code>{}{.b}</p>')
  assert.equal(html('[a](u){}\n'), '<p><a href="u">a</a>{}</p>')
})
