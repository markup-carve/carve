import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> /g, '>').replace(/ </g, '<')

test('a lazy line feeds absorption, so the paragraph stays open', () => {
  assert.equal(html('> e\n:::e\n> :::\nl\n'), '<blockquote><p>e :::e ::: l</p></blockquote>')
  assert.equal(html('> > e\n:::e\n> > :::\nl\n'), '<blockquote><blockquote><p>e :::e ::: l</p></blockquote></blockquote>')
  assert.equal(html('> > e\n> :::e\n> > :::\nl\n'), '<blockquote><blockquote><p>e :::e ::: l</p></blockquote></blockquote>')
})

test('a colon line that misses the inner quote interrupts its paragraph', () => {
  const expected = '<blockquote><blockquote><p>e :::e</p></blockquote><div></div></blockquote><p>l</p>'
  assert.equal(html('> > e\n> :::e\n> :::\nl\n'), expected)
  assert.equal(html('> > e\n> :::e\n> ::::\nl\n'), expected)
})

test('one level short of the paragraph is still a partial match', () => {
  assert.equal(html('> > > e\n:::e\n> > :::\nl\n'),
    '<blockquote><blockquote><blockquote><p>e :::e</p></blockquote><div></div></blockquote></blockquote><p>l</p>')
})

test('absorption by the quote\'s own lines stays as corpus 260 pins it', () => {
  assert.equal(html('> quote\n> :::note\n> :::\ntail\n'), '<blockquote><p>quote :::note ::: tail</p></blockquote>')
  assert.equal(html('> quote\n> :::note\n> body\n:::\n'), '<blockquote><p>quote :::note body</p></blockquote><div></div>')
})
