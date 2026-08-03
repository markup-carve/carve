/*
 * Playground share links.
 *
 * The fragment a share link carries is attacker-supplied by definition - it
 * arrives from whoever sent the URL. These check the two properties that
 * matter: a document survives the round trip byte for byte, and nothing a
 * fragment can say reaches the playground beyond the two fields it is allowed
 * to set.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { encodeShare, decodeShare, MAX_ENCODED_LENGTH } from '../docs/.vitepress/share-link.js'

const roundTrip = async (state) => decodeShare('#' + (await encodeShare(state)))

test('a document round-trips through the fragment', async () => {
  const source = '# Title\n\n::: note\nbody with *bold* and /italic/\n:::\n'
  assert.deepEqual(await roundTrip({ source, engine: 'js' }), { source, engine: 'js' })
})

test('the engine rides along', async () => {
  assert.equal((await roundTrip({ source: 'x', engine: 'rust' })).engine, 'rust')
})

test('non-ASCII and newlines survive', async () => {
  const source = 'Grüße — 日本語 🎉\n\n\ttabbed\n   trailing   \n'
  assert.equal((await roundTrip({ source, engine: 'js' })).source, source)
})

test('an empty document is still a document', async () => {
  assert.equal((await roundTrip({ source: '', engine: 'js' })).source, '')
})

test('a fragment carrying no payload decodes to null', async () => {
  assert.equal(await decodeShare(''), null)
  assert.equal(await decodeShare('#'), null)
  assert.equal(await decodeShare('#other=1'), null)
  assert.equal(await decodeShare(undefined), null)
})

test('a malformed payload decodes to null rather than throwing', async () => {
  assert.equal(await decodeShare('#s=not-base64-@@@'), null)
  assert.equal(await decodeShare('#p=' + Buffer.from('not json').toString('base64url')), null)
  assert.equal(await decodeShare('#p=' + Buffer.from('[1,2,3]').toString('base64url')), null)
  assert.equal(await decodeShare('#p=' + Buffer.from('{"v":1}').toString('base64url')), null)
})

test('only the known fields are read out of a payload', async () => {
  const hostile = JSON.stringify({
    v: 1,
    source: 'ok',
    engine: 'php',
    allowRawHtml: true,
    extensions: ['everything'],
    __proto__: { polluted: true },
  })
  const state = await decodeShare('#p=' + Buffer.from(hostile).toString('base64url'))
  assert.deepEqual(state, { source: 'ok', engine: 'js' })
  assert.equal(Object.keys(state).length, 2)
})

test('an uncompressed payload decodes even where this browser would deflate', async () => {
  const source = '# from an older browser\n'
  const encoded = Buffer.from(JSON.stringify({ v: 1, source, engine: 'js' })).toString('base64url')
  assert.deepEqual(await decodeShare('#p=' + encoded), { source, engine: 'js' })
})

test('a document too large for a usable URL encodes to null', async () => {
  // Deterministic but not periodic, so deflate cannot bring it back under the
  // ceiling the way a repeating sequence would.
  let seed = 123456789
  const source = Array.from({ length: 40000 }, () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return String.fromCharCode(33 + (seed >>> 0) % 90)
  }).join('')
  assert.equal(await encodeShare({ source, engine: 'js' }), null)
})

test('a long but compressible document still fits', async () => {
  const source = '# Heading\n\nrepeated paragraph text.\n\n'.repeat(500)
  const encoded = await encodeShare({ source, engine: 'js' })
  assert.ok(encoded !== null)
  assert.ok(encoded.length <= MAX_ENCODED_LENGTH)
  assert.equal((await decodeShare('#' + encoded)).source, source)
})
