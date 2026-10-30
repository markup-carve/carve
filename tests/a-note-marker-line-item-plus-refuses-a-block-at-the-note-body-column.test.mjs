import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))
const flat = (src) => html(src).replace(/\n *(?=<)/g, '').replace(/>\n *(?=\S)/g, '>').replace(/<a href="#fnref1"[^>]*>↩<\/a>/, '')
const note = (src) => flat(src).replace(/^[^]*<li id="fn1">/, '').replace(/<\/li><\/ol><\/section>$/, '')

test('a block at the note body column refuses a marker-line item + (carve#4222)', () => {
  assert.equal(note('[^a]: - - +\n  para\ntail\n\nr[^a]\n'), '<ul><li><ul><li>+\npara\ntail</li></ul></li></ul><p></p>')
  assert.equal(note('[^a]: - +\n  para\ntail\n\nr[^a]\n'), '<ul><li>+\npara\ntail</li></ul><p></p>')
  assert.equal(note('[^a]: - +\n   # h\n\nr[^a]\n'), '<ul><li>+</li></ul><h1 id="h">h</h1><p></p>')
})

test('no walk frame reaches the output (carve#4222)', () => {
  for (const c of [0, 1, 2, 3, 4, 5, 6]) {
    for (const head of ['- +', '- - +', '- [ ] +']) {
      const src = `[^a]: ${head}\n${' '.repeat(c)}para\ntail\n\nr[^a]\n`
      assert.doesNotMatch(html(src), /\u0000/, JSON.stringify(src))
    }
  }
})

test('the item marker column takes the block, as for the description twin', () => {
  assert.equal(note('[^a]: - +\n      para\ntail\n\nr[^a]\n'), '<ul><li>para\ntail</li></ul><p></p>')
  assert.equal(note('[^a]: - +\n    para\ntail\n\nr[^a]\n'), '<ul><li>+\npara\ntail</li></ul><p></p>')
  assert.equal(note('[^a]: - +\n      # h\n\nr[^a]\n'), '<ul><li><h1 id="h">h</h1></li></ul><p></p>')
  assert.equal(note('[^a]: - - +\n        para\n\nr[^a]\n'), '<ul><li><ul><li>para</li></ul></li></ul><p></p>')
  for (const c of [0, 2, 3, 4, 6]) {
    // The note's markers stand four columns right of the description's.
    const dd = flat(`:: t\n: - - +\n${' '.repeat(c)}para\ntail\n`).replace(/^<dl><dt>t<\/dt><dd>|<\/dd><\/dl>$/g, '')
    const fn = note(`[^a]: - - +\n${' '.repeat(c + 4)}para\ntail\n\nr[^a]\n`).replace(/<p><\/p>$/, '')
    if (c >= 2) assert.equal(fn, dd, `column ${c}`)
  }
})

test('a paragraph at column zero refuses the item + and folds into it (carve#4356)', () => {
  const out = flat('[^a]: - +\npara\ntail\n\nr[^a]\n')
  assert.match(out, /^<p>r.*<li id="fn1"><ul><li>\+\npara\ntail<\/li>/s)
})
