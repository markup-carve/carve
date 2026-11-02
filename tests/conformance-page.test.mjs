/*
 * scripts/conformance-page.mjs: the ledger count, the rate and the badge, and
 * one end-to-end run over throwaway git repositories (an engine tag that pins
 * a spec commit carrying the pack).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { badge, ledgerCases, measure, measureEngine, rate, renderPage, specVersion } from '../scripts/conformance-page.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const fixtures = join(here, 'fixtures/conformance-page')
const script = resolve(here, '../scripts/conformance-page.mjs')
const json = (name) => JSON.parse(readFileSync(join(fixtures, name), 'utf8'))
const pack = { total: 4, ids: new Set(['inline-aaaaaaaaaaaa', 'inline-cccccccccccc', 'inline-dddddddddddd', 'fences-bbbbbbbbbbbb']) }

test('the ledger counts each declared case once', () => {
  assert.equal(ledgerCases(json('ledger.json')).size, 4)
  assert.equal(ledgerCases({ entries: [] }).size, 0)
})

test('a declared id the pack lacks is not counted as differing', () => {
  assert.deepEqual(measure(pack, json('ledger.json')), { total: 4, differ: 3, unknown: 1 })
})

test('the rate never rounds a differing engine up to 100%', () => {
  assert.equal(rate(12000, 0), '100.00')
  assert.equal(rate(12000, 2), '99.98')
  assert.equal(rate(1000000, 1), '99.99')
  assert.equal(rate(0, 0), null)
})

test('the badge is a shields.io endpoint', () => {
  assert.deepEqual(badge({ total: 12000, differ: 0 }), { schemaVersion: 1, label: 'conformance', message: '100.00%', color: 'brightgreen' })
  assert.equal(badge({ total: 12000, differ: 310 }).message, '97.42%')
  assert.equal(badge({ reason: 'no release tag found' }).message, 'not measured')
})

test('the spec version names the release or the commits after it', () => {
  assert.equal(specVersion('0.1.13-0-g32d724d1'), '0.1.13')
  assert.equal(specVersion('0.1.13-536-g5604ec1a'), '0.1.13 + 536 commits')
  assert.equal(specVersion(null), null)
})

function repo(dir) {
  mkdirSync(dir, { recursive: true })
  const run = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim()
  run('init', '-q', '-b', 'main')
  run('config', 'user.name', 'test')
  run('config', 'user.email', 'test@example.invalid')
  run('config', 'commit.gpgsign', 'false')
  run('config', 'tag.gpgsign', 'false')
  return run
}

test('a release tag is measured from its ledger against the pack at its pin', () => {
  const work = mkdtempSync(join(tmpdir(), 'conformance-page-'))
  const spec = join(work, 'carve')
  const specGit = repo(spec)
  writeFileSync(join(spec, 'README.md'), 'before the pack\n')
  specGit('add', '-A')
  specGit('commit', '-q', '-m', 'old')
  specGit('tag', '0.1.1')
  const oldSpec = specGit('rev-parse', 'HEAD')
  mkdirSync(join(spec, 'resources/conformance-pack'), { recursive: true })
  for (const name of ['index.json', 'inline-01.json', 'fences-01.json']) {
    cpSync(join(fixtures, name), join(spec, 'resources/conformance-pack', name))
  }
  specGit('add', '-A')
  specGit('commit', '-q', '-m', 'pack')
  specGit('tag', '0.1.2')
  const newSpec = specGit('rev-parse', 'HEAD')

  const engine = join(work, 'carve-js')
  const engineGit = repo(engine)
  writeFileSync(join(engine, 'README.md'), 'engine\n')
  engineGit('add', '-A')
  engineGit('update-index', '--add', '--cacheinfo', `160000,${oldSpec},spec`)
  engineGit('commit', '-q', '-m', 'old release')
  engineGit('tag', '0.1.0')
  mkdirSync(join(engine, 'test'))
  cpSync(join(fixtures, 'ledger.json'), join(engine, 'test/conformance-pack-drift.json'))
  engineGit('add', 'test')
  engineGit('update-index', '--cacheinfo', `160000,${newSpec},spec`)
  engineGit('commit', '-q', '-m', 'release')
  engineGit('tag', '0.1.1')

  const old = measureEngine('carve-js', engine, '0.1.0', spec)
  assert.equal(old.reason, 'the pinned spec predates the conformance pack')
  assert.equal(old.specVersion, '0.1.1')

  const row = measureEngine('carve-js', engine, '0.1.1', spec)
  assert.equal(row.reason, null)
  assert.deepEqual([row.specVersion, row.total, row.differ, row.unknown], ['0.1.2', 4, 3, 1])
  assert.match(renderPage([row], '2026-11-02'), /\| 0\.1\.1 \(`[0-9a-f]{8}`\) \| 0\.1\.2 \(`[0-9a-f]{8}`\) \| 3 of 4 \| 25\.00% \|/)

  const out = join(work, 'docs')
  execFileSync(process.execPath, [script, '--spec', spec, '--engine', `carve-js=${engine}`, '--engine', `carve-php=${join(work, 'none')}`, '--engine', `carve-rs=${join(work, 'none')}`, '--out', out, '--date', '2026-11-02'])
  assert.equal(JSON.parse(readFileSync(join(out, 'public/badges/conformance-carve-js.json'), 'utf8')).message, '25.00%')
  assert.equal(JSON.parse(readFileSync(join(out, 'public/badges/conformance-carve-php.json'), 'utf8')).message, 'not measured')
  assert.match(readFileSync(join(out, 'conformance.md'), 'utf8'), /last regenerated 2026-11-02/)
})
