import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const flat = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> </g, '><').trim()

// carve#4550: a run of another width is absorbed text; only the div's own width closes it.
test('an absorbed run of another width closes no div, whatever hosts it', () => {
  const div = '<div><p>:::e :::: q</p></div>'
  const cases = [
    [':::\n:::e\n::::\nq\n:::\nl\n', `${div}<p>l</p>`],
    ['- :::\n  :::e\n  ::::\n  q\n  :::\nl\n', `<ul><li>${div}</li></ul><p>l</p>`],
    ['- o\n  - :::\n    :::e\n    ::::\n    q\n    :::\nl\n', `<ul><li>o <ul><li>${div}</li></ul></li></ul><p>l</p>`],
    ['> :::\n> :::e\n> ::::\n> q\n> :::\n\nl\n', `<blockquote>${div}</blockquote><p>l</p>`],
    [':: t\n: :::\n  :::e\n  ::::\n  q\n  :::\nl\n', `<dl><dt>t</dt><dd>${div}</dd></dl><p>l</p>`],
    ['::::\n::::e\n:::\nq\n::::\nl\n', `<div><p>::::e ::: q</p></div><p>l</p>`],
  ]
  for (const [source, expected] of cases) assert.equal(flat(source), expected, source)
})

test('a closed div after an absorbed run leaves no paragraph for a lazy line', () => {
  assert.equal(flat('- :::\n  :::e\n  ::::\n  :::\nl\n'), '<ul><li><div><p>:::e ::::</p></div></li></ul><p>l</p>')
  assert.equal(flat('> :::\n> :::e\n> :::::\n> :::\nl\n'), '<blockquote><div><p>:::e :::::</p></div></blockquote><p>l</p>')
})

test('without an invalid opener a run of another width still opens a nested div', () => {
  assert.equal(flat(':::\n::::\nq\n::::\n:::\nl\n'), '<div><div><p>q</p></div></div><p>l</p>')
})
