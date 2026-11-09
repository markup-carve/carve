import assert from 'node:assert/strict'
import { test } from 'node:test'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

test('a definition list claimed by plus keeps its term and descriptions in the host trace', () => {
  const cases = [
    ['- a\n+\n:: t\n: d\n\n  x\n', 'doc/item:1', 2],
    ['- a\n+\n:: t\n: d\n: e\n\n  x\n- b\n', 'doc/item:1', 2],
    ['- a\n  - b\n  +\n  :: t\n  : d\n\n    x\n', 'doc/item:1/item:2', 3],
  ]
  for (const [source, host, start] of cases) {
    const trace = modelTrace(source)
    const last = trace.findIndex((record, index) => index > start && record.form === 'item')
    const attached = trace.slice(start, last === -1 ? undefined : last)
    assert.ok(attached.length >= 4)
    assert.equal(attached[0].owner, host)
    assert.ok(attached.slice(1).every((record) => record.owner.startsWith(`${host}/dd:`)))
    if (last !== -1) assert.equal(trace[last].owner, 'doc/item:8')
  }
})
