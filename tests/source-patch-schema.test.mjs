import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Ajv2020 } from 'ajv/dist/2020.js'

const root = resolve(import.meta.dirname, '..')
const schema = JSON.parse(readFileSync(resolve(root, 'resources/source-patch.schema.json'), 'utf8'))
const validate = new Ajv2020({ strict: true }).compile(schema)
const edit = { start: 1, end: 2, replacement: '', kind: 'formatting', code: 'canonical-format' }
const patch = { version: 1, sourceFingerprint: 'fnv1a64:af63dc4c8601ec8c', sourceBytes: 2, edits: [edit], unresolved: [] }

test('the source patch schema accepts the shared wire shape', () => {
  assert.equal(validate(patch), true, JSON.stringify(validate.errors))
  assert.equal(validate({ ...patch, unresolved: [{ ...edit, message: 'Review this change.' }] }), true, JSON.stringify(validate.errors))
})

test('the source patch schema rejects malformed wire fields', () => {
  assert.equal(validate({ ...patch, version: 2 }), false)
  assert.equal(validate({ ...patch, sourceFingerprint: 'short' }), false)
  assert.equal(validate({ ...patch, edits: [{ ...edit, kind: 'unknown' }] }), false)
  assert.equal(validate({ ...patch, unknown: true }), false)
})

test('the published schema id matches its build destination', () => {
  assert.equal(schema.$id, 'https://markup-carve.github.io/carve/source-patch.schema.json')
})
