import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

for (const marker of ['- ', '1. ', '* [ ] ']) for (const depth of [1, 2, 3]) {
  test(`${JSON.stringify(marker)} depth ${depth} folds a below-column separator`, () => {
    let source = ''
    let column = 0
    for (let i = 0; i < depth; i++) {
      source += `${' '.repeat(column)}${marker}item\n`
      column += marker.startsWith('* [') ? 2 : marker.length
    }
    source += `${' '.repeat(column)}:: term\n${' '.repeat(column - 1)}:  def\n`
    assert.match(render(source), /<dt>term\n:  def<\/dt>/)
  })
}

test('column zero leaves the item and the list column attaches', () => {
  assert.match(render('- item\n  :: term\n:  def\n'), /<\/ul>\n<p>:  def<\/p>/)
  assert.match(render('- item\n  :: term\n  :  def\n'), /<dd>def<\/dd>/)
})

test('a separator folds into an open description paragraph', () => {
  assert.match(render('- item\n  :: term\n  :  body\n :  tail\n'), /<dd>body\n:  tail<\/dd>/)
})

test('a quote keeps the term fold', () => {
  assert.match(render('> - item\n>   :: term\n>  :  def\n'), /<dt>term\n:  def<\/dt>/)
})
