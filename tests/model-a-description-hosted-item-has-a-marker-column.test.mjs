import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> /g, '>').replace(/ </g, '<')
const quoted = (source) => source.trimEnd().split('\n').map((line) => `> ${line}`).join('\n') + '\n'

test('a + at a description-hosted item\'s marker column attaches, as it does inside a quote', () => {
  const source = ':: t\n: - a\n  +\n  x\n'
  const expected = '<dl><dt>t</dt><dd><ul><li>a x</li></ul></dd></dl>'
  assert.equal(html(source), expected)
  assert.equal(html(quoted(source)), `<blockquote>${expected}</blockquote>`)
})

test('a chain on the marker line gives each item its column', () => {
  assert.equal(html(':: t\n: - - a\n    +\n    x\n'), '<dl><dt>t</dt><dd><ul><li><ul><li>a x</li></ul></li></ul></dd></dl>')
})

test('a stacked + and a + below the item keep their reading', () => {
  assert.equal(html(':: t\n: - +\n  +\n  x\n'), '<dl><dt>t</dt><dd><ul><li>x</li></ul></dd></dl>')
  assert.equal(html(':: t\n: - a\n +\n x\n'), '<dl><dt>t</dt><dd><ul><li>a + x</li></ul></dd></dl>')
})

test('a + at the description\'s marker column reaches the description past an empty first-block item', () => {
  assert.equal(html(':: t\n: - +\n+\nx\n'), '<dl><dt>t</dt><dd><ul><li></li></ul><p>x</p></dd></dl>')
  assert.equal(html(':: t\n: 1. +\n+\n> q\n'), '<dl><dt>t</dt><dd><ol><li></li></ol><blockquote><p>q</p></blockquote></dd></dl>')
  assert.equal(html(':: t\n: - +\n+\n- y\n'), '<dl><dt>t</dt><dd><ul><li></li><li><p>y</p></li></ul></dd></dl>')
})
