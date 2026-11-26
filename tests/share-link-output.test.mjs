// A share link carries the active output tab; the playground checks the name against its tab list.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeShare, decodeShare } from '../docs/.vitepress/share-link.js'

const roundTrip = async (state) => decodeShare('#' + (await encodeShare(state)))

test('the output tab survives a round trip', async () => {
  assert.equal((await roundTrip({ source: 'x', output: 'lint' })).output, 'lint')
})

test('a non-string output is dropped', async () => {
  assert.equal('output' in (await roundTrip({ source: 'x', output: { evil: 1 } })), false)
  assert.equal('output' in (await roundTrip({ source: 'x' })), false)
})
