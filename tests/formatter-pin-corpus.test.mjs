import test from 'node:test'
import assert from 'node:assert/strict'
import { blobId, sharedFiles, sharedDocuments } from '../scripts/formatter-pin-corpus.mjs'

test('the formatter corpus excludes a new ruling and a changed expected result', () => {
  const current = new Map([['old.crv', 'a'], ['old.html', 'b'], ['new.crv', 'c'], ['changed.html', 'd']])
  const first = new Map([['old.crv', 'a'], ['old.html', 'b'], ['changed.html', 'before']])
  const second = new Map(current)
  assert.deepEqual(sharedFiles(current, [first, second]), ['old.crv', 'old.html'])
})

test('corpus hashes use Git blob bytes, including the final newline', () => {
  assert.equal(blobId(Buffer.from('test content\n')), 'd670460b4b4aece5915caf5c68d12f560a9fe3e4')
  assert.notEqual(blobId(Buffer.from('test content')), blobId(Buffer.from('test content\n')))
})

test('a changed target sidecar excludes its whole document', () => {
  const current = new Map([['a.crv', 'source'], ['a.html', 'html'], ['a.md', 'markdown']])
  const pin = new Map(current)
  pin.set('a.md', 'previous')
  assert.deepEqual(sharedDocuments(current, [current, pin]), [])
  assert.deepEqual(sharedDocuments(current, [current, current]), ['a.crv'])
})
