/*
 * The interchange envelope (PART 12 §32).
 *
 * The tree is strict-closed with no version, which is the right posture and
 * leaves a reader unable to say WHICH failure it hit: a corrupt tree, an
 * unknown vocabulary and a missing extension all arrive as one validation
 * error, where §12 asks for "an error of its own, naming what was wrong".
 * These tests hold the envelope to the three things that makes possible -
 * a version that is present and well-formed, a document that is the real tree,
 * and a closed shape around both.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ajv = new Ajv2020({ allErrors: true, strict: true })
ajv.addSchema(JSON.parse(readFileSync(resolve(root, 'resources/ast-schema.json'), 'utf8')))
const envelope = JSON.parse(readFileSync(resolve(root, 'resources/ast-envelope-schema.json'), 'utf8'))
const validate = ajv.compile(envelope)

const doc = { type: 'document', children: [], srcByteLength: 0 }

test('a minimal envelope is the version and the tree', () => {
  assert.equal(validate({ astVersion: '1.0', document: doc }), true)
})

test('vocabulary and extensions are optional and closed', () => {
  assert.equal(
    validate({
      astVersion: '1.0',
      vocabulary: 'https://markup-carve.org/ast/core',
      extensions: [{ id: 'https://markup-carve.org/ext/citations', version: '1', required: false }],
      document: doc,
    }),
    true,
  )
  assert.equal(validate({ astVersion: '1.0', extensions: [{ id: 'x', nope: 1 }], document: doc }), false)
})

test('neither required field may be inferred', () => {
  // §12(a)'s reasoning: supplying a default turns a truncated payload into a
  // valid-looking one, and the version is the whole point of the wrapper.
  assert.equal(validate({ document: doc }), false)
  assert.equal(validate({ astVersion: '1.0' }), false)
})

test('astVersion is major.minor with no leading zero', () => {
  for (const ok of ['1.0', '1.4', '2.0', '10.11']) {
    assert.equal(validate({ astVersion: ok, document: doc }), true, ok)
  }
  // A leading zero is refused so the 0.x reading of a major never applies here.
  for (const bad of ['1', '0.1', '01.0', '1.0.0', 'v1.0', '1.x', '']) {
    assert.equal(validate({ astVersion: bad, document: doc }), false, bad)
  }
})

test('the envelope is closed, and so is the tree inside it', () => {
  assert.equal(validate({ astVersion: '1.0', document: doc, extra: 1 }), false)
  assert.equal(validate({ astVersion: '1.0', document: { ...doc, type: 'doc' } }), false)
  assert.equal(validate({ astVersion: '1.0', document: { ...doc, extra: 1 } }), false)
})

test('a bare tree is not an envelope', () => {
  // The two shapes stay distinguishable: `carve --json` writes the tree bare,
  // and a reader must not mistake one for the other.
  assert.equal(validate(doc), false)
})

test('the published id matches the path it is served at', () => {
  assert.equal(envelope.$id, 'https://markup-carve.github.io/carve/ast-envelope-schema.json')
  assert.equal(envelope.properties.document.$ref, 'https://markup-carve.github.io/carve/ast-schema.json')
})
