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
import { execFileSync } from 'node:child_process'
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

test('the combinatorial inventory names and counts every curated family', () => {
  const output = execFileSync(
    process.execPath,
    [resolve(repo, 'scripts/combinatorial-check.mjs'), '--inventory'],
    { cwd: repo, encoding: 'utf8' },
  )

  assert.equal(
    output,
    [
      'heading-attributes   120',
      'unclosed-inline      126',
      'floating-attribute   12',
      'terminal-child       22',
      'ordered-marker       8',
      'caption-position     10',
      'attached-block       6',
      'repeated-child       42',
      'total                346',
      '',
    ].join('\n'),
  )
})

test('the expensive differential sweeps run weekly against provisioned engines', () => {
  const workflow = readFileSync(resolve(repo, '.github/workflows/ast-conformance.yml'), 'utf8')

  assert.match(workflow, /cron: '0 4 \* \* 1-6'/)
  assert.match(workflow, /cron: '0 4 \* \* 0'/)
  assert.match(workflow, /npm run combinatorial:check/)
  assert.match(workflow, /npm run fuzz:impls -- --seed=101 --count=200 --max-findings=16/)
  assert.match(workflow, /github\.event\.schedule == '0 4 \* \* 0'/)
  assert.match(workflow, /if \[ "\$status" -eq 2 \]; then/)
})
