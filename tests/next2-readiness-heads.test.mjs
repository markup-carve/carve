import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { verifyPreparedHeads } from '../scripts/next2-readiness-heads.mjs'

const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim()
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'carve-readiness-heads-'))
  git(dir, 'init', '-q')
  git(dir, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-q', '--allow-empty', '-m', 'baseline')
  const baseline = git(dir, 'rev-parse', 'HEAD')
  git(dir, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-q', '--allow-empty', '-m', 'later')
  return { dir, baseline, later: git(dir, 'rev-parse', 'HEAD') }
}

test('prepared replay accepts baseline and descendant commits in every engine', () => {
  const engines = Object.fromEntries(['js', 'php', 'rs'].map(name => [name, fixture()]))
  const dirs = Object.fromEntries(Object.entries(engines).map(([name, item]) => [name, item.dir]))
  const baseline = Object.fromEntries(Object.entries(engines).map(([name, item]) => [name, item.baseline]))
  const heads = Object.fromEntries(Object.entries(engines).map(([name, item]) => [name, item.later]))
  assert.doesNotThrow(() => verifyPreparedHeads(dirs, heads, baseline))
  assert.doesNotThrow(() => verifyPreparedHeads(dirs, baseline, baseline))
})

test('prepared replay rejects a stale checkout before comparing cases', () => {
  const js = fixture(), php = fixture(), rs = fixture()
  const dirs = { js: js.dir, php: php.dir, rs: rs.dir }
  const heads = { js: js.baseline, php: php.later, rs: rs.later }
  const baseline = { js: js.later, php: php.baseline, rs: rs.baseline }
  assert.throws(() => verifyPreparedHeads(dirs, heads, baseline), error => {
    assert.match(error.message, /prepared js checkout/)
    assert.ok(error.message.includes(js.baseline))
    assert.ok(error.message.includes(js.later))
    assert.match(error.message, /Check out next2, or run without --prepared/)
    return true
  })
})

test('missing baseline history cannot be mistaken for a clean comparison', () => {
  const js = fixture(), php = fixture(), rs = fixture()
  const dirs = { js: js.dir, php: php.dir, rs: rs.dir }
  const heads = { js: js.later, php: php.later, rs: rs.later }
  const missing = '0000000000000000000000000000000000000000'
  const baseline = { js: missing, php: php.baseline, rs: rs.baseline }
  assert.throws(() => verifyPreparedHeads(dirs, heads, baseline), error => {
    assert.match(error.message, /prepared js checkout/)
    assert.ok(error.message.includes(missing))
    assert.match(error.message, /could not verify ancestry/i)
    return true
  })
})

test('both command entry points reject stale prepared checkouts before replay', () => {
  const js = fixture(), php = fixture(), rs = fixture()
  const env = { ...process.env, CARVE_JS_DIR: js.dir, CARVE_PHP_DIR: php.dir, CARVE_RS_DIR: rs.dir }
  for (const entry of ['next2-readiness.mjs', 'next2-readiness-local.mjs']) {
    const result = spawnSync(process.execPath, [resolve('scripts', entry), '--prepared'], { encoding: 'utf8', env, timeout: 30_000 })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Cannot verify prepared js checkout/)
    assert.match(result.stderr, /Check out next2, or run without --prepared/)
    assert.doesNotMatch(result.stdout, /Baseline comparison/)
  }
})
