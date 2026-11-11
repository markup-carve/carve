import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()
const backlink = '<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a>'

// carve#5892: the continuation misses the note's body column, so the run is refused (carve#5830 rule B).
test('a wrapped attribute run left of a nested item in a note is refused', () => {
  const rendered = html('[^n]: p\n  - a\n  {.a\n .b}\n  x\n\nx[^n]\n')
  assert.ok(rendered.includes(`      <ul>\n        <li>a\n{.a\n.b}\nx</li>\n      </ul>\n      <p>${backlink}</p>`), rendered)
})

test('the same run in an item and in a note read alike', () => {
  for (const run of [['{.a', '.b}'], ['{.c', 'k=v}']]) {
    for (const cont of [0, 1]) {
      const body = `  - a\n  ${run[0]}\n${' '.repeat(cont)}${run[1]}\n  x\n`
      assert.ok(html(`- p\n${body}`).includes(`<li>a\n${run[0]}\n${run[1]}\nx</li>`), run[0])
      assert.ok(html(`[^n]: p\n${body}\nx[^n]\n`).includes(`<li>a\n${run[0]}\n${run[1]}\nx</li>`), run[0])
    }
  }
})

test('a wrapped run that reaches the note body stays valid', () => {
  assert.ok(html('[^n]: p\n  - a\n  {.a\n   .b}\n  x\n\nx[^n]\n').includes(`<p class="a b">x${backlink}</p>`))
})

test('a wrapped run at column 0 after a nested item is a root block', () => {
  assert.ok(html('- p\n  - a\n{.a\n .b}\nx\n').endsWith('<p class="a b">x</p>'))
})
