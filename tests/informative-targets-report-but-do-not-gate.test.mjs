/*
 * Markdown, plain and ANSI output is informative (docs/writer-targets.md), so a
 * report that only disagrees on those targets passes the compare gate, and one
 * that disagrees on a normative target still fails it.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { COMPARISON_TARGETS, INFORMATIVE_TARGETS } from '../scripts/lib/corpus-targets.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const gate = (counts) => {
  const dir = mkdtempSync(join(tmpdir(), 'carve-informative-'))
  const path = join(dir, 'report.json')
  writeFileSync(path, JSON.stringify({
    schema: 1,
    mode: {
      corpus: 'core', limit: null, shard: '1/1', countsOnly: false,
      targets: COMPARISON_TARGETS, engines: ['js', 'php', 'rust'],
    },
    mismatchedBy: {},
    ...counts,
  }))
  return spawnSync(process.execPath, ['scripts/check-compare-report.mjs', path], { cwd: root, encoding: 'utf8' })
}

test('the informative targets are the three non-normative writers', () => {
  assert.deepEqual([...INFORMATIVE_TARGETS].sort(), ['ansi', 'markdown', 'plain'])
  for (const target of INFORMATIVE_TARGETS) assert.ok(COMPARISON_TARGETS.includes(target))
})

test('informative differences are printed and do not fail the gate', () => {
  const result = gate({ crossImplDiffs: 0, mismatches: 0, informativeDiffs: 4, informativeMismatches: 2 })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Informative targets \(not gated\): 4 difference\(s\), 2 fixture mismatch\(es\)/)
})

test('a normative difference still fails the gate', () => {
  const result = gate({ crossImplDiffs: 1, mismatches: 0, informativeDiffs: 0, informativeMismatches: 0 })
  assert.equal(result.status, 1)
})
