import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a losing duplicate does not take the body of an interleaved winning note', () => {
  const reduced = '[^m]: +\n[^n]: +\n\n  para\n\nsee[^m][^n]\n'
  const duplicate = '[^m]: +\n[^n]: +\n[^n]: +\n\n  para\n\nsee[^m][^n]\n'
  const expected = renderDoc(parse(reduced))
  assert.equal(renderDoc(parse(duplicate)), expected)
  assert.match(expected, /<li id="fn2">\n      <p>para<a /)
})
