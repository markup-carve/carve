import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { readerChecks } from '../scripts/lib/spec2-reader.mjs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const byId = new Map(JSON.parse(read('../spec/0.2/conformance/clause-cases.json')).cases.map((entry) => [entry.id, entry]))
const readerProblems = readerChecks(fileURLToPath(new URL('../spec/0.2', import.meta.url)))

test('decodeTree of an envelope lifts the envelope-only declarations onto the root (carve#6888)', () => {
  const lifted = byId.get('CC-2482')
  const envelope = JSON.parse(lifted.json)
  assert.equal(envelope.document.extensions, undefined)
  assert.deepEqual(lifted.expected.tree, { ...envelope.document, extensions: envelope.extensions })
  assert.deepEqual(readerProblems(envelope), [])
  assert.deepEqual(readerProblems(lifted.expected.tree, { annotations: lifted.annotations }), [])
  assert.notDeepEqual(readerProblems(envelope.document, { annotations: lifted.annotations }), [])
  const again = byId.get('CC-2483')
  assert.deepEqual(JSON.parse(again.json), lifted.expected.tree)
  assert.deepEqual(again.expected.tree, lifted.expected.tree)
})

test('root declarations come first, then the envelope names the root lacks (carve#6888)', () => {
  const entry = byId.get('CC-2484')
  const envelope = JSON.parse(entry.json)
  assert.deepEqual(readerProblems(envelope), [])
  assert.deepEqual(entry.expected.tree.extensions.map(({ name }) => name), ['x.c', 'x.a', 'x.b', 'x.d'])
  assert.deepEqual(readerProblems(entry.expected.tree), [])
})
