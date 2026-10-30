import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))
const flat = (src) => html(src).replace(/\n *(?=<)/g, '').replace(/>\n *(?=\S)/g, '>').replace(/<a href="#fnref1"[^>]*>↩<\/a>/, '')
const note = (src) => flat(src).replace(/^[^]*<li id="fn1">/, '').replace(/<\/li><\/ol><\/section>$/, '')

test('a block at the note body column refuses a marker-line item + (carve#4222)', () => {
  assert.equal(note('[^a]: - - +\n  para\ntail\n\nr[^a]\n'), '<ul><li><ul><li></li></ul></li></ul><p>para\ntail</p>')
  assert.equal(note('[^a]: - +\n  para\ntail\n\nr[^a]\n'), '<ul><li></li></ul><p>para\ntail</p>')
  assert.equal(note('[^a]: - +\n   # h\n\nr[^a]\n'), '<ul><li></li></ul><h1 id="h">h</h1><p></p>')
})

test('no walk frame reaches the output (carve#4222)', () => {
  for (const c of [0, 1, 2, 3, 4, 5, 6]) {
    for (const head of ['- +', '- - +', '- [ ] +']) {
      const src = `[^a]: ${head}\n${' '.repeat(c)}para\ntail\n\nr[^a]\n`
      assert.doesNotMatch(html(src), /\u0000/, JSON.stringify(src))
    }
  }
})

test('the item content column still takes the block, as for the description twin', () => {
  assert.equal(note('[^a]: - +\n    para\ntail\n\nr[^a]\n'), '<ul><li>para\ntail</li></ul><p></p>')
  assert.equal(note('[^a]: - +\n      # h\n\nr[^a]\n'), '<ul><li><h1 id="h">h</h1></li></ul><p></p>')
  assert.equal(note('[^a]: - - +\n    para\n\nr[^a]\n'), '<ul><li><ul><li></li></ul>para</li></ul><p></p>')
  for (const c of [0, 2, 3, 4, 6]) {
    const body = `${' '.repeat(c)}para\ntail\n`
    const dd = flat(`:: t\n: - - +\n${body}`).replace(/^<dl><dt>t<\/dt><dd>|<\/dd><\/dl>$/g, '')
    const fn = note(`[^a]: - - +\n${body}\nr[^a]\n`).replace(/<p><\/p>$/, '')
    if (c >= 2) assert.equal(fn, dd, `column ${c}`)
  }
})

test('below the body column the line ends the note, as it ends the description', () => {
  const out = flat('[^a]: - +\npara\ntail\n\nr[^a]\n')
  assert.match(out, /^<p>para\ntail<\/p><p>r/)
})
