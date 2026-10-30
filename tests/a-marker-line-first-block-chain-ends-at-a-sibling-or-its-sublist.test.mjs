import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')
const quote = '<blockquote><p>q</p></blockquote>'

test('a sibling of a marker-line first-block item closes it, so a column-0 block leaves the outer item', () => {
  assert.equal(html('- - +\n  - x\n> q\n'), `<ul><li><ul><li></li><li>x</li></ul></li></ul>${quote}`)
  assert.equal(html('- 1. +\n  2. x\n> q\n'), `<ul><li><ol><li></li><li>x</li></ol></li></ul>${quote}`)
  assert.equal(html('- - - +\n    - x\n> q\n'), `<ul><li><ul><li><ul><li></li><li>x</li></ul></li></ul></li></ul>${quote}`)
  assert.equal(html('- - - +\n  - x\n> q\n'), `<ul><li><ul><li><ul><li></li></ul></li><li>x</li></ul></li></ul>${quote}`)
})

test('a marker-line first-block item spent on a sublist leaves a column-0 block outside', () => {
  assert.equal(html('- - +\n    - y\n> q\n'), `<ul><li><ul><li><ul><li>y</li></ul></li></ul></li></ul>${quote}`)
  assert.equal(html('- - +\n    - y\ntail\n'), '<ul><li><ul><li><ul><li>ytail</li></ul></li></ul></li></ul>')
})

test('an unspent marker-line first-block item still takes a column-0 block', () => {
  assert.equal(html('- - +\n> q\n'), `<ul><li><ul><li>${quote}</li></ul></li></ul>`)
  assert.equal(html('- - +\npara\n'), '<ul><li><ul><li>para</li></ul></li></ul>')
})
