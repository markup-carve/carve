import assert from 'node:assert/strict'
import test from 'node:test'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'
import { parse } from '../scripts/spec/layout.mjs'

test('a matching host closer keeps a plus-attached colon open across a blank', () => {
  for (const [source, owner, lastForm] of [
    ['- +\n::: x\n\n  a\n  :::\n', 'doc/item:1/div:2', 'closer'],
    ['- +\n::: |\n\n  ::: x\n  :::\n', 'doc/item:1/div:2', 'payload'],
    ['1. +\n::: note\n\n   a\n   :::\n', 'doc/item:1/div:2', 'closer'],
  ]) {
    const trace = modelTrace(source)
    assert.equal(trace.at(-2).owner, owner)
    assert.equal(trace.at(-1).owner, owner)
    assert.equal(trace.at(-1).form, lastForm)
  }
})

test('an attached colon without a host closer still ends at its first blank', () => {
  const trace = modelTrace('- +\n::: note\n\n  tail\n')
  assert.equal(trace.at(-1).owner, 'doc/item:1')
})

test('a sibling item after the blank keeps the reader structure', () => {
  const blocks = parse('- +\n::: x\n\n  - child\n    :::').blocks
  assert.equal(blocks[0].items[0].blocks[0].children[0].t, 'list')
})
