// carve#4278, carve#4449: an attribute run after a lone `+` is skipped, and the line after it decides.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')
const asLetter = (source) => html(source.replace(/^((?:> )?)\+$/m, '$1Z')).replace('Z', '+')

test('a sublist at the content column refuses the + in every spelling of the run', () => {
  for (const run of ['{x}', '{x}\n{y}', '{x\ny}']) {
    const attrs = run === '{x}' ? ' x=""' : ' x="" y=""'
    assert.equal(html(`- a\n+\n${run}\n  - c\n`), `<ul><li>a+</li></ul><ul${attrs}><li>c</li></ul>`, run)
    assert.equal(html(`1. a\n+\n${run}\n   - c\n`), `<ol><li>a+</li></ol><ul${attrs}><li>c</li></ul>`, run)
  }
})

test('a quoted item reads the same, and the quote closes after an attached block', () => {
  assert.equal(html('> - a\n> +\n> {x}\n>   - c\n'), '<blockquote><ul><li>a+</li></ul><ul x=""><li>c</li></ul></blockquote>')
  assert.equal(html('> - a\n> +\n> {x}\n> # h\nz\n'), '<blockquote><ul><li>a<h1 x="" id="h">h</h1></li></ul></blockquote><p>z</p>')
  assert.equal(html('> - a\n> +\n> {x}\n> ```\n> k\n> ```\nz\n'), '<blockquote><ul><li>a<pre x=""><code>k</code></pre></li></ul></blockquote><p>z</p>')
})

test('the neighbors follow the first visible line', () => {
  assert.equal(html('- a\n+\n{x}\n# h\n\nz\n'), '<ul><li>a<h1 x="" id="h">h</h1></li></ul><p>z</p>')
  assert.equal(html('- a\n+\n{x}\ntail\n'), '<ul><li>a<p x="">tail</p></li></ul>')
  for (const source of ['- a\n+\n{x}\n  # h\n\nz\n', '- a\n+\n{x}\n  para\n', '- a\n+\n{x}\n- b\n', '- a\n+\n{x}\n  %% c\nz\n', '- a\n+\n{x}\n  [r]: /u\n  - c\n']) {
    assert.equal(html(source), asLetter(source), source)
    assert.match(html(source), /\+/, source)
  }
})
