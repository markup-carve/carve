/*
 * The suite runs an EXPLICIT list of files, so a test file that nobody adds to
 * that list is never run - and a test nobody runs is indistinguishable from a
 * test that passes.
 *
 * That is not hypothetical: tests/ast-positions.test.mjs was written, passed
 * locally when invoked by hand, and `npm test` reported the same 728 passing
 * tests as before it existed. Node's runner grows directory and glob arguments
 * across versions, and this repo's CI matrix spans two of them, so the list
 * stays explicit and this test keeps it honest.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')

test('every test file in tests/ is in the npm test list', () => {
  const { scripts } = JSON.parse(readFileSync(resolve(repo, 'package.json'), 'utf8'))
  const listed = new Set(
    scripts.test
      .split(/\s+/)
      .filter((token) => token.endsWith('.test.mjs'))
      .map((token) => token.replace(/^tests\//, '')),
  )
  const present = readdirSync(resolve(repo, 'tests')).filter((name) => name.endsWith('.test.mjs'))

  const unrun = present.filter((name) => !listed.has(name))
  assert.deepEqual(unrun, [], `test file(s) never run by npm test: ${unrun.join(', ')}`)

  const missing = [...listed].filter((name) => !present.includes(name))
  assert.deepEqual(missing, [], `npm test names file(s) that do not exist: ${missing.join(', ')}`)
})
