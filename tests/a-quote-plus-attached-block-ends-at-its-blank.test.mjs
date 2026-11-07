import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('the blank after a quote-attached list closes its body frames', () => {
  const source = '> +\n- t\n\n  > r\n'
  assert.equal(html(source), '<blockquote>\n  <ul>\n    <li>t</li>\n  </ul>\n</blockquote>\n<blockquote><p>r</p></blockquote>')
  assert.equal(html(source), html('> - t\n\n  > r\n'))
})

test('the blank after a quote-attached definition closes its description frame', () => {
  const source = '> +\n:: t\n: u\n\n  # r\n'
  assert.equal(html(source), '<blockquote>\n  <dl>\n    <dt>t</dt>\n    <dd>u</dd>\n  </dl>\n</blockquote>\n<section id="r">\n  <h1>r</h1>\n</section>')
  assert.equal(html(source), html('> :: t\n> : u\n\n  # r\n'))
})

test('a surrounding item survives the blank that ends its attached quote', () => {
  const source = '- a\n  > +\n  :: t\n  : u\n\n    > r\n'
  assert.equal(html(source), html('- a\n  > :: t\n  > : u\n\n    > r\n'))
})
