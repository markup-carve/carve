import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { comparisonRevisions } from '../scripts/lib/comparison-revisions.mjs'

function git(directory, ...args) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')))
  const result = spawnSync('git', ['-c', 'commit.gpgsign=false', '-C', directory, ...args], { env, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

function repository(directory) {
  mkdirSync(directory, { recursive: true })
  git(directory, 'init', '-q')
  writeFileSync(join(directory, 'tracked'), 'first\n')
  git(directory, 'add', 'tracked')
  git(directory, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Fixture')
  return git(directory, 'rev-parse', 'HEAD')
}

test('records pins separately from initialized checkouts and tracked changes', t => {
  const temporary = mkdtempSync(join(tmpdir(), 'carve-revisions-'))
  t.after(() => rmSync(temporary, { recursive: true, force: true }))
  const corpus = join(temporary, 'corpus')
  const engine = join(temporary, 'engine')
  const pin = repository(corpus)
  repository(engine)
  git(engine, 'update-index', '--add', '--cacheinfo', `160000,${pin},spec`)
  git(engine, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Pin')
  const engines = [{ name: 'js', cwd: engine }]
  mkdirSync(join(engine, 'spec'))
  let report = comparisonRevisions(corpus, engines)
  assert.equal(report.corpus.head, pin)
  assert.equal(report.engines.js.spec.recorded, pin)
  assert.equal(report.engines.js.spec.head, null)

  git(engine, 'clone', '-q', corpus, 'spec')
  report = comparisonRevisions(corpus, engines)
  assert.equal(report.engines.js.spec.head, pin)
  assert.equal(report.engines.js.spec.trackedChanges, false)
  writeFileSync(join(engine, 'untracked'), 'scratch')
  assert.equal(comparisonRevisions(corpus, engines).engines.js.trackedChanges, false)
  writeFileSync(join(engine, 'spec', 'tracked'), 'changed')
  assert.equal(comparisonRevisions(corpus, engines).engines.js.spec.trackedChanges, true)
  git(join(engine, 'spec'), '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qam', 'Different contract')
  report = comparisonRevisions(corpus, engines)
  assert.equal(report.engines.js.spec.recorded, pin)
  assert.notEqual(report.engines.js.spec.head, pin)
})

test('missing checkouts have unknown identities', () => {
  const report = comparisonRevisions('/nonexistent-carve-checkout', [{ name: 'php', cwd: '/nonexistent-carve-engine' }])
  assert.deepEqual(report.corpus, { head: null, trackedChanges: null })
  assert.equal(report.engines.php.head, null)
  assert.equal(report.engines.php.spec.recorded, null)
  assert.equal(report.engines.php.spec.head, null)
})

for (const name of ['php', 'rust']) {
  test(`${name} reads a submodule gitfile and ignores an inherited Git directory`, t => {
    const temporary = mkdtempSync(join(tmpdir(), 'carve-revisions-'))
    t.after(() => rmSync(temporary, { recursive: true, force: true }))
    const corpus = join(temporary, 'corpus')
    const engine = join(temporary, 'engine')
    const pin = repository(corpus)
    repository(engine)
    git(engine, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', corpus, 'tests/spec')
    git(engine, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qam', 'Pin')
    const head = git(engine, 'rev-parse', 'HEAD')
    const inherited = process.env.GIT_DIR
    process.env.GIT_DIR = join(corpus, '.git')
    try {
      const report = comparisonRevisions(corpus, [{ name, cwd: engine }])
      assert.equal(report.engines[name].head, head)
      assert.equal(report.engines[name].spec.recorded, pin)
      assert.equal(report.engines[name].spec.head, pin)
    } finally {
      if (inherited === undefined) delete process.env.GIT_DIR
      else process.env.GIT_DIR = inherited
    }
    const archive = join(engine, 'archive')
    mkdirSync(archive)
    const report = comparisonRevisions(corpus, [{ name, cwd: archive }])
    assert.equal(report.engines[name].head, null)
    assert.equal(report.engines[name].spec.recorded, null)
  })
}
