import test from 'node:test'
import assert from 'node:assert/strict'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

test('a shorter bare colon run opens inside the innermost colon body', () => {
  for (const [prefix, expected] of [
    ['', 'doc/div:1/div:3/div:5'],
    ['> ', 'doc/quote:1/div:1/div:3/div:5'],
  ]) {
    const source = [':::', ':::e', '::::', 'q', ':::', 'after'].map(line => prefix + line).join('\n') + '\n'
    const trace = modelTrace(source)
    assert.equal(trace[4].form, 'div')
    assert.equal(trace[4].owner, expected)
    assert.equal(trace[5].owner, expected)
  }
})

test('a matching run still closes the innermost colon body', () => {
  const trace = modelTrace(':::\n::::\n::::\nafter\n')
  assert.equal(trace[2].form, 'closer')
  assert.equal(trace[3].owner, 'doc/div:1')
})

test('a child colon run matching an outer div can attach to a plus', () => {
  const trace = modelTrace(':::\n::::\n- +\n:::\nbody\n:::\n::::\n:::\n')
  assert.equal(trace[3].form, 'div')
  assert.equal(trace[3].owner, 'doc/div:1/div:2/item:3/div:4')
  assert.equal(trace[4].owner, trace[3].owner)
})
