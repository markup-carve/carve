import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

const afterOwner = '> - %%%%\n> x\n%%%%\n\nz\n'
const insideOwner = '> %%%\n%%\n> %%%\nz\n'

test('a delimiter after the quoted item ends opens a document span', () => {
  assert.equal(renderDoc(parse(afterOwner)), '<blockquote>\n  <ul>\n    <li></li>\n  </ul>\n  <p>x</p>\n</blockquote>')
  const trace = modelTrace(afterOwner)
  assert.equal(trace[2].owner, 'doc/comment:3')
  assert.equal(trace[4].form, 'payload')
})

test('an unmarked comment line stays in a live quote-owned span', () => {
  assert.equal(renderDoc(parse(insideOwner)), '<blockquote>\n\n</blockquote>\n<p>z</p>')
  const trace = modelTrace(insideOwner)
  assert.equal(trace[1].owner, 'doc/quote:1/comment:1')
  assert.equal(trace[1].form, 'payload')
  assert.equal(trace[2].form, 'closer')
})

test('an indented unmarked payload keeps the quote without visible marker text', () => {
  const source = '> %%%\n  %%\n> %%%\nz\n'
  assert.equal(renderDoc(parse(source)), '<blockquote>\n\n</blockquote>\n<p>z</p>')
  assert.equal(modelTrace(source).find((line) => line.line === 2)?.owner, 'doc/quote:1/comment:1')
})
