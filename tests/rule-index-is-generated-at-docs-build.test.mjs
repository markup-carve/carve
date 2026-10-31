/*
 * `docs/rules/*.md` link each rule to its clause by line number, so any clause
 * edit moves them. They are generated at docs build and never committed, so
 * parallel spec PRs do not conflict on them.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const repo = fileURLToPath(new URL('..', import.meta.url))

test('no rule-index page is tracked', () => {
  const tracked = execFileSync('git', ['ls-files', '--', 'docs/rules'], { cwd: repo, encoding: 'utf8' })
  assert.equal(tracked, '')
})

test('the docs build generates the rule-index pages before VitePress runs', () => {
  const { scripts } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.match(scripts['docs:pages'], /scripts\/spec-rule-index\.mjs --write/)
  for (const name of ['docs:dev', 'docs:build']) {
    assert.ok(scripts[name].indexOf('npm run docs:pages') < scripts[name].indexOf('vitepress'), name)
  }
})

test('the check validates the generated views without reading docs/rules', () => {
  const run = spawnSync(process.execPath, ['scripts/spec-rule-index.mjs', '--check'], { cwd: repo, encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr)
  assert.match(run.stdout, /focused rule-index pages cover \d+ rules/)
})
