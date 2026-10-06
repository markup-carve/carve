/*
 * `spawnSync` reports ENOENT for a missing cwd exactly as it does for a missing
 * executable, and its message names only the binary. So an absent engine
 * checkout - the ordinary state of a fresh environment, and the thing the
 * CARVE_*_DIR variables exist to point at - was reported as
 * "spawnSync cargo ENOENT" on a machine where cargo is installed and on PATH.
 *
 * The two causes need different fixes, so this pins that they read differently.
 * carve#2754.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('an absent engine checkout names the directory, not the binary', () => {
  const absent = resolve(root, 'tests/.no-such-engine-checkout')
  const result = spawnSync(process.execPath, ['scripts/compare-impls.mjs', '--counts-only', '--limit=1'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    env: {
      ...process.env,
      CARVE_RS_DIR: absent,
      CARVE_JS_DIR: absent,
      CARVE_PHP_DIR: absent,
    },
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  // The run cannot compare anything, and says so with a failing status.
  assert.notEqual(result.status, 0, output)
  // It names the directory it needed...
  assert.match(output, /engine checkout not found at .*no-such-engine-checkout/, output)
  // ...and does not blame a binary that is installed and on PATH.
  assert.doesNotMatch(output, /spawnSync (cargo|npm|php) ENOENT/, output)
})
