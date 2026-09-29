/*
 * The include-conformance corpus is GENERATED: scripts/gen-include-conformance.mjs
 * writes tests/include-conformance/ from the authored inputs in
 * scripts/include-conformance-vectors.mjs, and anything it did not write it
 * removes. So a vector committed as JSON with no authored input behind it is not
 * an extra case, it is a case the next routine re-run deletes.
 *
 * Two of them lived on main for months (carve#2630). Nothing could see it:
 * tests/include-conformance.proof.mjs reads whatever JSON is on disk, so it
 * passed before the deletion and would pass after it with two fewer cases, and
 * it is not in `npm test` anyway because it needs a built carve-js.
 *
 * This gate needs no engine. It compares the authored name set against the
 * committed filenames in both directions, and pins manifest.total to the file
 * count, so the loss is visible in the diff that would cause it.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { vectors } from '../scripts/include-conformance-vectors.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const corpus = resolve(here, 'include-conformance')
const vectorDir = join(corpus, 'vectors')

const committed = readdirSync(vectorDir)
  .filter((name) => name.endsWith('.json'))
  .sort()
const authored = vectors.map((vector) => `${vector.name}.json`).sort()

test('every committed include vector has an authored input', () => {
  const orphaned = committed.filter((name) => !authored.includes(name))
  assert.deepEqual(
    orphaned,
    [],
    `committed vector(s) a re-run of scripts/gen-include-conformance.mjs would ` +
      `DELETE, because scripts/include-conformance-vectors.mjs does not author them: ` +
      `${orphaned.join(', ')}`,
  )
})

test('every authored include vector is committed as a golden', () => {
  const ungenerated = authored.filter((name) => !committed.includes(name))
  assert.deepEqual(
    ungenerated,
    [],
    `authored vector(s) with no committed golden - run ` +
      `\`npm run include:gen\` with a built carve-js: ${ungenerated.join(', ')}`,
  )
})

test('the include manifest counts every committed vector', () => {
  const manifest = JSON.parse(readFileSync(join(corpus, 'manifest.json'), 'utf8'))
  assert.equal(manifest.total, committed.length)

  const named = new Set(Object.values(manifest.rules).flat())
  const unlisted = committed
    .map((name) => name.replace(/\.json$/, ''))
    .filter((name) => !named.has(name))
  assert.deepEqual(unlisted, [], `vector(s) in no rule-coverage list: ${unlisted.join(', ')}`)
})
