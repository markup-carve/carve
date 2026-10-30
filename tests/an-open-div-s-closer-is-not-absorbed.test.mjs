import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const flat = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> </g, '><').trim()

// carve#4397: every host reads the run as the top level does (CARVE-P9-016).
test('a closed div leaves no paragraph for a line below, whatever hosts it', () => {
  const div = '<div><p>:::e</p></div>'
  const cases = [
    [':::\n:::e\n:::\nl\n', `${div}<p>l</p>`],
    ['- :::\n  :::e\n  :::\nl\n', `<ul><li>${div}</li></ul><p>l</p>`],
    ['- a\n\n  :::\n  :::e\n  :::\nl\n', `<ul><li>a ${div}</li></ul><p>l</p>`],
    ['- o\n  - :::\n    :::e\n    :::\nl\n', `<ul><li>o <ul><li>${div}</li></ul></li></ul><p>l</p>`],
    ['> :::\n> :::e\n> :::\nl\n', `<blockquote>${div}</blockquote><p>l</p>`],
    [':: t\n: :::\n  :::e\n  :::\nl\n', `<dl><dt>t</dt><dd>${div}</dd></dl><p>l</p>`],
  ]
  for (const [source, expected] of cases) assert.equal(flat(source), expected, source)
})

test('a run absorbed outside a div opens nothing, so a blank after it loosens', () => {
  assert.equal(flat('- x\n  :::e\n  :::\n\n  l\n'), '<ul><li><p>x :::e :::</p><p>l</p></li></ul>')
})

test('a second bare run after the closer opens a new div', () => {
  assert.equal(flat(':: t\n: :::\n  :::e\n  :::\n  :::\nl\n'),
    '<dl><dt>t</dt><dd><div><p>:::e</p></div><div></div></dd></dl><p>l</p>')
})

test('an absorbed run still folds a lazy line', () => {
  assert.equal(flat('- x\n  :::e\n  :::\nl\n'), '<ul><li>x :::e ::: l</li></ul>')
  assert.equal(flat('- o\n  - :::e\n    :::\nl\n'), '<ul><li>o <ul><li>:::e ::: l</li></ul></li></ul>')
  assert.equal(flat('- :::\n  :::e\n  ::::\n  ::::\nl\n'), '<ul><li><div><p>:::e :::: :::: l</p></div></li></ul>')
})
