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
  assert.equal(corpus.vectors.length, 27)
  assert.equal(new Set(corpus.vectors.map(({ name }) => name)).size, 27)
  assert.deepEqual([...new Set(corpus.vectors.map(({ requirement }) => requirement))].sort(), [
    'S1-opt-in', 'S2-contained-paths', 'S3-remote-allowlist',
    'S4-depth-bound', 'S5-byte-bound', 'S6-post-budget-no-read',
    'S7-call-bound', 'S8-post-call-bound-no-read', 'S9-root-configuration',
  ])
})

/*
 * An observable whose side of the seam is undeclared is the hole carve#2022
 * reports: `chargedBytes` had none, three adapters each reached for the easiest
 * source, and one of them summed what its own resolver had handed back - a
 * plausible total that is not the engine's, green while the engine charged
 * something else. The map is pinned whole rather than merely required to exist,
 * so a side that FLIPS fails here too and not only a side that is missing.
 */
test('every expected observable declares which side of the seam it comes from', () => {
  const observables = schema.properties.vectors.items.properties.expected.properties
  assert.deepEqual(
    Object.fromEntries(Object.entries(observables).map(([name, def]) => [name, def['x-seam']])),
    {
      resolverCalls: 'adapter',
      remoteFetches: 'adapter',
      status: 'processor',
      denial: 'processor',
      canonicalId: 'processor',
      maxVisitedDepth: 'processor',
      chargedBytes: 'processor',
      dependencies: 'processor',
    },
  )
  // The other direction, which the schema cannot state: a side declared for an
  // observable no vector asserts is a promise nothing exercises. An unknown
  // observable needs no assertion here - `additionalProperties: false` above
  // already refuses one, and a second check that cannot fire on its own is not
  // a check.
  const stated = new Set(corpus.vectors.flatMap(({ expected }) => Object.keys(expected)))
  assert.deepEqual(Object.keys(observables).filter((name) => !stated.has(name)), [])
})
