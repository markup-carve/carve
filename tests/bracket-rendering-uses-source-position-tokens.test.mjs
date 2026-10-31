import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderInline } from '../scripts/spec/render.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a deep attributed bracket chain renders each wrapper once', () => {
  const depth = 150
  const source = '['.repeat(depth) + 'x' + ']{.a}'.repeat(depth)
  assert.equal(renderInline(source), '<span class="a">'.repeat(depth) + 'x' + '</span>'.repeat(depth))
})

test('the 200th attributed bracket remains literal at the shared inline cap', () => {
  const depth = 200
  const source = '['.repeat(depth) + 'x' + ']{.a}'.repeat(depth)
  const expected = '<span class="a">'.repeat(depth - 1) + '[x]{.a}' + '</span>'.repeat(depth - 1)
  assert.equal(renderInline(source), expected)
})

test('nested bracket tails keep their link and span semantics', () => {
  const samples = [
    ['[[x](u)]{.a}', '<span class="a"><a href="u">x</a></span>'],
    ['[[x]{.a}]{}', '<span><span class="a">x</span></span>'],
    ['[[x](u)](v)', '<a href="v">x</a>'],
    ['[a [b]{.a} c]{.b}', '<span class="b">a <span class="a">b</span> c</span>'],
  ]
  for (const [source, expected] of samples) assert.equal(renderInline(source), expected, source)
})

test('a reference tail stops before a following empty span tail', () => {
  const source = '[[x][r]{}]{}\n\n[r]: /u\n'
  assert.equal(renderDoc(parse(source)).trim(), '<p><span><a href="/u">x</a>{}</span></p>')
})
