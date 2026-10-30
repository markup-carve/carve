import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))
const note = (src) => html(src).replace(/\n *(?=<)/g, '').replace(/^[^]*<li id="fn1">/, '').replace(/<p><a href="#fnref1"[^]*$/, '')

test('a list after a refused item + on a note marker line takes a lazy line (carve#4259)', () => {
  assert.equal(note('[^a]: 1. +\n  - y\ntail\n\nr[^a]\n'), '<ol><li>+</li></ol><ul><li>y\ntail</li></ul>')
  assert.equal(note('[^a]: * - +\n   - y\ntail\n\nr[^a]\n'), '<ul><li><ul><li>+\n- y\ntail</li></ul></li></ul>')
  assert.equal(note('[^a]: - - +\n  1. y\ntail\n\nr[^a]\n'), '<ul><li><ul><li>+</li></ul></li></ul><ol><li>y\ntail</li></ol>')
})

test('no walk frame reaches the output', () => {
  for (const head of ['1. +', '- +', '* - +', '- - +', '1. - +'])
    for (const marker of ['- y', '1. y', '* y', '2) y'])
      for (let c = 0; c <= 6; c++) {
        const src = `[^a]: ${head}\n${' '.repeat(c)}${marker}\ntail\n\nr[^a]\n`
        assert.doesNotMatch(html(src), /\u0000/, JSON.stringify(src))
      }
})

test('the description twin reads the same', () => {
  const dd = html(':: t\n: 1. +\n  - y\ntail\n').replace(/\n *(?=<)/g, '')
  assert.equal(dd, '<dl><dt>t</dt><dd><ol><li>+</li></ol><ul><li>y\ntail</li></ul></dd></dl>')
})
