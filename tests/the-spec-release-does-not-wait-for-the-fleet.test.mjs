/*
 * The spec is tagged on its own evidence. Engines on different spec commits,
 * or a carve-js reference pin behind carve-js main, are printed as INFO by the
 * pre-tag check of the spec repo and the release-mode declaration audit;
 * PRE_TAG_FLEET=strict restores both as gates. An engine release keeps the
 * fleet gate, and an unreadable engine fails either way.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { fleetEnv, specCommit } from './synthetic-fleet.helper.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const checker = resolve(repo, 'scripts/pre-tag-check.sh')

function run(command, args, cwd, env = {}) {
  return spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } })
}

function releaseRepository({ spec = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'carve-pre-tag-fleet-info-'))
  const work = join(dir, 'work')
  const origin = join(dir, 'origin.git')
  mkdirSync(work)
  assert.equal(run('git', ['init', '--bare', origin], dir).status, 0)
  assert.equal(run('git', ['init', '-b', 'main'], work).status, 0)
  assert.equal(run('git', ['config', 'user.email', 'pre-tag@example.invalid'], work).status, 0)
  assert.equal(run('git', ['config', 'user.name', 'pre-tag test'], work).status, 0)
  writeFileSync(join(work, 'package.json'), '{"version":"0.1.4"}\n')
  writeFileSync(join(work, 'CHANGELOG.md'), '# Changelog\n\n## [0.1.4] - 2026-08-27\n')
  if (spec) {
    // The file pre-tag-check reads as "the repo being tagged is the spec".
    mkdirSync(join(work, 'scripts'))
    writeFileSync(join(work, 'scripts', 'fleet-spec-pin-check.mjs'), '')
  }
  assert.equal(run('git', ['add', '.'], work).status, 0)
  assert.equal(run('git', ['commit', '-m', 'release'], work).status, 0)
  assert.equal(run('git', ['remote', 'add', 'origin', origin], work).status, 0)
  assert.equal(run('git', ['push', '-u', 'origin', 'main'], work).status, 0)
  return work
}

function divergedFleet({ php = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'carve-pre-tag-diverged-'))
  const pins = { 'carve-js': specCommit(repo), 'carve-rs': specCommit(repo) }
  if (php) pins['carve-php'] = specCommit(repo, 4)
  return fleetEnv(root, pins)
}

test('engines on different spec commits do not refuse the spec tag, and the run says so', () => {
  const result = run('bash', [checker, '0.1.4', releaseRepository({ spec: true })], repo, { ...divergedFleet(), PRE_TAG_FLEET: '' })

  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.match(result.stdout, /\[info\] the engines do not pin the same spec commit - INFO, not gating for the spec release/)
  assert.match(result.stdout, /\[info\] the engines do not implement the same spec:/)
  assert.doesNotMatch(result.stdout, /\[FAIL\]/)
  assert.match(result.stdout, /PRE-TAG CHECK PASSED/)
})

test('PRE_TAG_FLEET=strict gates the fleet again for the spec tag', () => {
  const result = run('bash', [checker, '0.1.4', releaseRepository({ spec: true })], repo, { ...divergedFleet(), PRE_TAG_FLEET: 'strict' })

  assert.equal(result.status, 1, result.stdout + result.stderr)
  assert.match(result.stdout, /\[FAIL\] the fleet spec pin check failed/)
  assert.match(result.stdout, /\[FAIL\] the engines do not implement the same spec:/)
  assert.match(result.stdout, /PRE-TAG CHECK FAILED/)
})

test('an engine release still requires the engines to pin the same spec commit', () => {
  const result = run('bash', [checker, '0.1.4', releaseRepository()], repo, { ...divergedFleet(), PRE_TAG_FLEET: '' })

  assert.equal(result.status, 1, result.stdout + result.stderr)
  assert.match(result.stdout, /\[FAIL\] the engines do not implement the same spec:/)
  assert.match(result.stdout, /PRE-TAG CHECK FAILED/)
})

test('an unreadable engine still refuses the spec tag', () => {
  const result = run('bash', [checker, '0.1.4', releaseRepository({ spec: true })], repo, { ...divergedFleet({ php: false }), PRE_TAG_FLEET: '' })

  assert.equal(result.status, 1, result.stdout + result.stderr)
  assert.match(result.stdout, /\[FAIL\] carve-php\s+UNREADABLE/)
  assert.match(result.stdout, /PRE-TAG CHECK FAILED/)
})

test('an unknown PRE_TAG_FLEET value is refused rather than read as either mode', () => {
  const pre = run('bash', [checker, '0.1.4', releaseRepository()], repo, { PRE_TAG_FLEET: 'lenient' })
  assert.equal(pre.status, 2, pre.stdout + pre.stderr)
  assert.match(pre.stderr, /PRE_TAG_FLEET must be 'strict' or unset, got 'lenient'/)

  const audit = run(process.execPath, ['scripts/declaration-audit.mjs', '--no-fetch'], repo, {
    CARVE_DECL_AUDIT_LIB: '',
    PRE_TAG_FLEET: 'lenient',
  })
  assert.equal(audit.status, 2, audit.stdout + audit.stderr)
  assert.match(audit.stderr, /PRE_TAG_FLEET must be 'strict' or unset, got 'lenient'/)
})

function releaseAudit(fleet) {
  const nowhere = join(repo, 'tests', '__no_such_engine_checkout__')
  const result = run(process.execPath, ['scripts/declaration-audit.mjs', '--mode=release', '--no-fetch'], repo, {
    CARVE_DECL_AUDIT_LIB: '',
    PRE_TAG_FLEET: fleet,
    CARVE_JS_DIR: join(nowhere, 'carve-js'),
    CARVE_PHP_DIR: join(nowhere, 'carve-php'),
    CARVE_RS_DIR: join(nowhere, 'carve-rs'),
  })
  assert.equal(result.error, undefined, String(result.error))
  return `${result.stdout}${result.stderr}`
}

test('the release audit reports carve-js pin staleness as INFO unless the fleet is strict', () => {
  const info = releaseAudit('')
  assert.match(info, /^PIN STALENESS .* - INFO, not gating for the spec release/m)
  assert.doesNotMatch(info, /and the reference build current/)

  const strict = releaseAudit('strict')
  assert.match(strict, /^PIN STALENESS /m)
  assert.doesNotMatch(strict, /INFO, not gating/)
  assert.match(strict, /and the reference build current/)
})
