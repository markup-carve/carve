import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, 'include-security-conformance')
const schema = JSON.parse(readFileSync(path.join(root, 'schema.json'), 'utf8'))
const corpus = JSON.parse(readFileSync(path.join(root, 'vectors.json'), 'utf8'))

test('include security corpus is complete and schema-valid', () => {
  const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema)
  assert.equal(validate(corpus), true, JSON.stringify(validate.errors))
  assert.equal(corpus.version, 1)
  assert.equal(corpus.vectors.length, 12)
  assert.equal(new Set(corpus.vectors.map(({ name }) => name)).size, 12)
  assert.deepEqual([...new Set(corpus.vectors.map(({ requirement }) => requirement))].sort(), [
    'S1-opt-in', 'S2-contained-paths', 'S3-remote-allowlist',
    'S4-depth-bound', 'S5-byte-bound', 'S6-post-budget-no-read',
  ])
})
