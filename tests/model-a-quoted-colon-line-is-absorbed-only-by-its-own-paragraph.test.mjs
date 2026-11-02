import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> /g, '>').replace(/ </g, '<')

test('a quoted colon line below a lazy invalid opener opens a div in that quote', () => {
  assert.equal(html('> e\n:::e\n> :::\nl\n'), '<blockquote><p>e :::e</p><div></div></blockquote><p>l</p>')
  assert.equal(html('> > e\n:::e\n> > :::\nl\n'), '<blockquote><blockquote><p>e :::e</p><div></div></blockquote></blockquote><p>l</p>')
  assert.equal(html('> > e\n> :::e\n> > :::\nl\n'), '<blockquote><blockquote><p>e :::e</p><div></div></blockquote></blockquote><p>l</p>')
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

test('a quote\'s own lines read as corpus 260 pins them', () => {
  assert.equal(html('> quote\n> :::note\n> :::\ntail\n'), '<blockquote><p>quote :::note</p><div></div></blockquote><p>tail</p>')
  assert.equal(html('> quote\n> :::note\n> body\n:::\n'), '<blockquote><p>quote :::note body</p></blockquote><div></div>')
})
