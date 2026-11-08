import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

test('a shallower line ends a descendant body span and opens a paragraph', () => {
  for (const marker of ['-', '*']) {
    const source = `${marker} ${marker} ${marker} x\n      %%%%\n    b\nz\n`
    const html = render(source)
    assert.match(html, /b\nz\n {6}<\/li>/, source)
    assert.doesNotMatch(html, /<p>z<\/p>/, source)
  }
})

test('a blank after the shallower line ends its paragraph', () => {
  const html = render('- - - x\n      %%%%\n    b\n\nz\n')
  assert.match(html, /<p>z<\/p>$/)
})
