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
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
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

test('the AST verdict cannot close on narrower or disposable evidence', () => {
  const workflow = readFileSync(resolve(repo, '.github/workflows/ast-conformance.yml'), 'utf8')

  assert.match(workflow, /DEFAULT_BRANCH: \$\{\{ github\.event\.repository\.default_branch \}\}/)
  assert.match(workflow, /if \[ "\$REF_NAME" != "\$DEFAULT_BRANCH" \]; then/)
  assert.match(
    workflow,
    /\.conclusion == "cancelled" or \.conclusion == "timed_out" or \.conclusion == "skipped"/,
  )
  assert.match(workflow, /<!-- ast-conformance-gates/)
  assert.match(
    workflow,
    /sort -u \/tmp\/ast-conformance-current-gates\.txt \\\n+\s+\/tmp\/ast-conformance-previous-gates\.txt/,
    'red runs retain the union rather than replacing it with narrower evidence',
  )
  assert.match(
    workflow,
    /comm -23 \/tmp\/ast-conformance-required-gates\.txt \/tmp\/ast-conformance-current-gates\.txt/,
    'green computes which required gates its run skipped',
  )
  assert.match(workflow, /if \[ -n "\$missing" \]; then[\s\S]*?#\$issue remains open/)
})

function run(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: 'utf8' })
}

function releaseRepository() {
  const dir = mkdtempSync(join(tmpdir(), 'carve-pre-tag-'))
  const work = join(dir, 'work')
  const origin = join(dir, 'origin.git')
  mkdirSync(work)
  assert.equal(run('git', ['init', '--bare', origin], dir).status, 0)
  assert.equal(run('git', ['init', '-b', 'main'], work).status, 0)
  assert.equal(run('git', ['config', 'user.email', 'test@example.invalid'], work).status, 0)
  assert.equal(run('git', ['config', 'user.name', 'pre-tag test'], work).status, 0)
  writeFileSync(join(work, 'package.json'), '{"version":"0.1.4"}\n')
  writeFileSync(join(work, 'CHANGELOG.md'), '# Changelog\n\n## [0.1.4] - 2026-08-27\n')
  assert.equal(run('git', ['add', '.'], work).status, 0)
  assert.equal(run('git', ['commit', '-m', 'release'], work).status, 0)
  assert.equal(run('git', ['remote', 'add', 'origin', origin], work).status, 0)
  assert.equal(run('git', ['push', '-u', 'origin', 'main'], work).status, 0)
  return work
}

test('the pre-tag check separates a prefixed tag from the bare version', () => {
  const work = releaseRepository()
  const checker = resolve(repo, 'scripts/pre-tag-check.sh')
  const result = run('bash', [checker, '0.1.4', work, '--tag', 'v0.1.4'], repo)

  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.match(result.stdout, /tag v0\.1\.4 not yet present/)
  assert.match(result.stdout, /package\.json version = 0\.1\.4/)
  assert.match(result.stdout, /CHANGELOG\.md has a '## \[0\.1\.4\]' section/)
})

test('the pre-tag check tests the real prefixed ref for existence', () => {
  const work = releaseRepository()
  const checker = resolve(repo, 'scripts/pre-tag-check.sh')
  assert.equal(run('git', ['tag', 'v0.1.4'], work).status, 0)
  const result = run('bash', [checker, '0.1.4', '--tag', 'v0.1.4', work], repo)

  assert.equal(result.status, 1, result.stdout + result.stderr)
  assert.match(result.stdout, /\[FAIL\] tag v0\.1\.4 already exists locally/)
  assert.doesNotMatch(result.stdout, /expected v0\.1\.4/)
})

test('the pre-tag check keeps the existing bare-tag invocation', () => {
  const work = releaseRepository()
  const checker = resolve(repo, 'scripts/pre-tag-check.sh')
  const result = run('bash', [checker, '0.1.4', work], repo)

  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.match(result.stdout, /tag 0\.1\.4 not yet present/)
})
