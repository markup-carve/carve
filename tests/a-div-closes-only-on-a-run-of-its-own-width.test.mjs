import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const flat = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> </g, '><').trim()

// carve#4550, carve#4863: a run of another width nests; only the div's own width closes it.
test('a run of another width nests under an invalid opener, whatever hosts it', () => {
  const div = '<div><p>:::e</p><div><p>q</p><div><p>l</p></div></div></div>'
  const cases = [
    [':::\n:::e\n::::\nq\n:::\nl\n', div],
    ['- :::\n  :::e\n  ::::\n  q\n  :::\n  l\n', `<ul><li>${div}</li></ul>`],
    ['> :::\n> :::e\n> ::::\n> q\n> :::\n> l\n', `<blockquote>${div}</blockquote>`],
    [':: t\n: :::\n  :::e\n  ::::\n  q\n  :::\n  l\n', `<dl><dt>t</dt><dd>${div}</dd></dl>`],
  ]
  for (const [source, expected] of cases) assert.equal(flat(source), expected, source)
})

test('a run of another width under an invalid opener leaves no paragraph for a lazy line', () => {
  assert.equal(flat('- :::\n  :::e\n  ::::\n  :::\nl\n'), '<ul><li><div><p>:::e</p><div><div></div></div></div></li></ul><p>l</p>')
  assert.equal(flat('> :::\n> :::e\n> :::::\n> :::\nl\n'), '<blockquote><div><p>:::e</p><div><div></div></div></div></blockquote><p>l</p>')
})

test('without an invalid opener a run of another width still opens a nested div', () => {
  assert.equal(flat(':::\n::::\nq\n::::\n:::\nl\n'), '<div><div><p>q</p></div></div><p>l</p>')
})
