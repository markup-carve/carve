import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> /g, '>').replace(/ </g, '<')

test('a + behind a lead tab is a letter at every depth', () => {
  const nested = '<ul><li><ul><li>\t+ x</li></ul></li></ul>'
  assert.equal(html('- - \t+\n  x\n'), nested)
  assert.equal(html('- - \t+\nx\n'), nested)
  assert.equal(html('- \t+\nx\n'), '<ul><li>\t+ x</li></ul>')
  assert.equal(html('. \t+\nx\n'), '<ol><li>\t+ x</li></ol>')
})

test('an indented marker reads a lead tab the same way', () => {
  assert.equal(html(' - \t+\n>\n'), '<ul><li>\t+</li></ul><blockquote></blockquote>')
})

test('a marker or quote behind a lead tab stays open for a lazy line in a quote', () => {
  assert.equal(html('> - \t- +\nx\n'), '<blockquote><ul><li>\t- + x</li></ul></blockquote>')
  assert.equal(html('> - \ta\nx\n'), '<blockquote><ul><li>\ta x</li></ul></blockquote>')
})

test('a separator space keeps the first-block +', () => {
  assert.equal(html('- +\nx\n'), '<ul><li>x</li></ul>')
  assert.equal(html('-  +\nx\n'), '<ul><li>x</li></ul>')
  assert.equal(html('- - +\n  x\n'), '<ul><li><ul><li>x</li></ul></li></ul>')
})
