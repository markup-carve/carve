import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')
const quoted = (depth, lines) => lines.map((line) => ('> '.repeat(depth) + line).trimEnd()).join('\n') + '\n'

const items = (nesting) => Array.from({ length: nesting }, (_, k) => ' '.repeat(2 * k) + '- item' + k)

// CARVE-P0-004 rebases a recognized opener past the content column, and the
// item then ends on that block. CARVE-P0-009: no frame adopts the line below.
for (const depth of [1, 2]) for (const nesting of [1, 2, 3]) for (const over of [1, 2, 4]) {
  const pad = ' '.repeat(2 * nesting + over)
  for (const block of ['# h', '---', '| a |']) {
    test(`a block past a quoted item's column leaves no paragraph: depth ${depth}, nesting ${nesting}, +${over}, ${block}`, () => {
      const out = html(quoted(depth, [...items(nesting), pad + block]) + 'tail\n')
      assert.match(out, /<\/blockquote><p>tail<\/p>$/)
    })
  }
  test(`text past the column keeps the paragraph open: depth ${depth}, nesting ${nesting}, +${over}`, () => {
    const out = html(quoted(depth, [...items(nesting), pad + 'text']) + 'tail\n')
    assert.match(out, /text tail<\/li>/)
  })
  // An unclosed opener interrupts the item paragraph; the other run is its payload.
  for (const [absorbed, run] of [['```', '~~~'], ['~~~', '```']]) {
    test(`a fence past the column is payload of the unclosed opener above it: depth ${depth}, nesting ${nesting}, +${over}, ${absorbed} then ${run}`, () => {
      const out = html(quoted(depth, [...items(nesting), pad + absorbed, pad + run, pad + 'code', pad + run]) + 'tail\n')
      assert.match(out, new RegExp(`<pre><code>${run} code ${run}</code></pre>`))
      assert.match(out, /<\/blockquote><p>tail<\/p>$/)
    })
    test(`with no closer the second run is payload too: depth ${depth}, nesting ${nesting}, +${over}, ${absorbed} then ${run}`, () => {
      const out = html(quoted(depth, [...items(nesting), pad + absorbed, pad + run, pad + 'code']) + 'tail\n')
      assert.match(out, new RegExp(`<pre><code>${run} code</code></pre>`))
      assert.match(out, /<\/blockquote><p>tail<\/p>$/)
    })
  }
}

// A line-block payload is inline content: a marker in it opens no sublist and
// a fence run after it opens no code block (ruled on carve-php#3137).
for (const payload of ['- ```', '- ~~~', '1. ```', '- - ```', '- `x', '```', '  ```']) {
  test(`the line below an item's line-block payload folds into it: ${payload}`, () => {
    const out = html(['- ::: |', '  ' + payload, 'tail'].join('\n') + '\n')
    assert.match(out, /tail(<\/code>)?<\/p><\/div><\/li><\/ul>$/)
  })
}
