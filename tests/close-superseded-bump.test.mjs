import assert from 'node:assert/strict'
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const repo = resolve(import.meta.dirname, '..')
const script = resolve(repo, 'tools/close-superseded-bump.sh')

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  return result.stdout
}

test('closes only a superseded submodule-only draft', async () => {
  const root = await mkdtemp(join(tmpdir(), 'carve-close-bump-'))
  run('git', ['init', '-q'], root)
  run('git', ['config', 'user.email', 'test@example.com'], root)
  run('git', ['config', 'user.name', 'Test'], root)
  await writeFile(join(root, 'f'), 'one\n')
  run('git', ['add', 'f'], root)
  run('git', ['commit', '-qm', 'old'], root)
  const old = run('git', ['rev-parse', 'HEAD'], root).trim()
  await writeFile(join(root, 'f'), 'two\n')
  run('git', ['commit', '-qam', 'new'], root)
  const current = run('git', ['rev-parse', 'HEAD'], root).trim()

  const bin = join(root, 'bin')
  run('mkdir', ['-p', bin], root)
  const log = join(root, 'gh.log')
  const fake = `#!/usr/bin/env bash
set -e
printf '%s\\n' "$*" >> ${JSON.stringify(log)}
case "$*" in
  'pr list'*) printf '7\\tdeadbeef\\n' ;;
  *'contents/spec?ref=deadbeef'*) printf '%s\\n' ${JSON.stringify(old)} ;;
  *'contents/spec?ref=main'*) printf '%s\\n' ${JSON.stringify(current)} ;;
  *'pulls/7/files'*) printf 'spec\\n' ;;
  'pr close'*) ;;
  *) exit 1 ;;
esac
`
  await writeFile(join(bin, 'gh'), fake)
  await chmod(join(bin, 'gh'), 0o755)

  const output = run('bash', [script], root, {
    PATH: `${bin}:${process.env.PATH}`,
    REPO: 'markup-carve/example',
    SUB: 'spec',
  })
  assert.match(output, /closed superseded draft/)
  assert.match(await readFile(log, 'utf8'), /pr close 7 .*--delete-branch/)
})

test('the workflow schedules cleanup without scheduling the full bump', async () => {
  const workflow = await readFile(resolve(repo, '.github/workflows/bump-downstream.yml'), 'utf8')
  assert.match(workflow, /schedule:\n(?:.|\n)*cron: '17 \*\/6 \* \* \*'/)
  assert.match(workflow, /bump:\n    if: github\.event_name != 'schedule'/)
  assert.match(workflow, /close-superseded-drafts:\n    if: github\.event_name == 'schedule'/)

  const beforeCleanup = workflow.slice(0, workflow.indexOf('  close-superseded-drafts:'))
  const cleanup = workflow.slice(workflow.indexOf('  close-superseded-drafts:'))
  const repos = (text) => [...text.matchAll(/^          - repo: (markup-carve\/[a-z0-9-]+)$/gm)]
    .map((match) => match[1])
  assert.deepEqual(repos(cleanup), [...new Set(repos(beforeCleanup))],
    'scheduled cleanup must cover every downstream bump-matrix repository')
})
