import assert from 'node:assert/strict'
import test from 'node:test'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

for (const [source, owner] of [
  ['- - +\n  +\n  x\n', 'doc/item:1/item:1'],
  ['- - - +\n    +\n    x\n', 'doc/item:1/item:1/item:1'],
]) {
  test(`claimed plus chain keeps its follower in ${owner}`, () => {
    const trace = modelTrace(source)
    assert.equal(trace.at(-1).owner, owner)
    assert.equal(trace.at(-1).form, 'text')
  })
}
