// carve#4278: after a lone `+`, an attribute run leads the attached block wherever that block stands.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')

test('a sublist at the content column is the attached block in every spelling of the run', () => {
  for (const run of ['{x}', '{x}\n{y}', '{x\ny}']) {
    const attrs = run === '{x}' ? ' x=""' : ' x="" y=""'
    assert.equal(html(`- a\n+\n${run}\n  - c\n`), `<ul><li>a<ul${attrs}><li>c</li></ul></li></ul>`, run)
    assert.equal(html(`1. a\n+\n${run}\n   - c\n`), `<ol><li>a<ul${attrs}><li>c</li></ul></li></ol>`, run)
  }
})

test('a quoted item keeps the run and the block it leads, and the quote closes after it', () => {
  assert.equal(html('> - a\n> +\n> {x}\n>   - c\n'), '<blockquote><ul><li>a<ul x=""><li>c</li></ul></li></ul></blockquote>')
  assert.equal(html('> - a\n> +\n> {x}\n>   # h\nz\n'), '<blockquote><ul><li>a<h1 x="" id="h">h</h1></li></ul></blockquote><p>z</p>')
  assert.equal(html('> - a\n> +\n> {x}\n>   ```\n>   k\n>   ```\nz\n'), '<blockquote><ul><li>a<pre x=""><code>k</code></pre></li></ul></blockquote><p>z</p>')
})

test('the neighbors keep their reading', () => {
  assert.equal(html('- a\n+\n{x}\n  # h\n\nz\n'), '<ul><li>a<h1 x="" id="h">h</h1></li></ul><p>z</p>')
  assert.equal(html('- a\n+\n{x}\n  para\n'), '<ul><li>a<p x="">para</p></li></ul>')
  assert.equal(html('- a\n+\n{x}\ntail\n'), '<ul><li>a<p x="">tail</p></li></ul>')
  assert.equal(html('- a\n+\n{x}\n- b\n'), '<ul><li>a</li><li>b</li></ul>')
  // A comment is invisible, so the run leads the paragraph after it.
  assert.equal(html('- a\n+\n{x}\n  %% c\nz\n'), '<ul><li>a<p x="">z</p></li></ul>')
  assert.equal(html('- a\n+\n{x}\n  %% c\n  - c\n'), '<ul><li>a<ul x=""><li>c</li></ul></li></ul>')
  assert.equal(html('- a\n+\n{x}\n  [r]: /u\n  - c\n'), '<ul><li>a<ul x=""><li>c</li></ul></li></ul>')
})
