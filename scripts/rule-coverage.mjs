#!/usr/bin/env node
/*
 * Rule-coverage gate (docs/rule-coverage.md).
 *
 *   node scripts/rule-coverage.mjs                 check against the baseline
 *   node scripts/rule-coverage.mjs --base=origin/main   also refuse a grown baseline
 *   node scripts/rule-coverage.mjs --write         record the measured state
 *   node scripts/rule-coverage.mjs --rules=ID,ID   measure only these rules, no gate
 *   node scripts/rule-coverage.mjs --full          every killing row, plus redundant rules
 *   --jobs=N (default 4), --json=path (write the report)
 */

import { execFile, execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
  BASELINE_PATH, MODEL_FILES, MUTATIONS_PATH, applyEdits, gatedRules, ratchet, readJson, redundantGroups, validateMutations,
} from './lib/rule-coverage.mjs'
import { REFUSED_ALLOW } from './spec/refused-allow.mjs'

const run = promisify(execFile)
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, '').split('=')
  return [key, value.length ? value.join('=') : true]
}))
const jobs = Number(args.jobs ?? 4)
const corpusDir = resolve(repo, args.corpus ?? 'tests/corpus')
const mutationsPath = resolve(repo, args.mutations ?? MUTATIONS_PATH)
const baselinePath = resolve(repo, args.baseline ?? BASELINE_PATH)
const worker = resolve(repo, 'scripts/lib/rule-coverage-worker.mjs')

const registry = readJson(repo, 'resources/spec/rules.json')
const map = JSON.parse(readFileSync(mutationsPath, 'utf8'))
const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : { uncovered: [], killers: {} }

const invalid = validateMutations(map, registry)
if (invalid.length) {
  for (const line of invalid) console.error(`rule-coverage: ${line}`)
  process.exit(1)
}

let base = null
if (args.base) {
  const git = (...argv) => execFileSync('git', argv, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  try {
    git('rev-parse', '--verify', `${args.base}^{commit}`)
  } catch {
    console.error(`rule-coverage: --base=${args.base} is not a commit here; fetch it first`)
    process.exit(1)
  }
  // Only the change that introduces the baseline has none on its base.
  let present = true
  try {
    git('cat-file', '-e', `${args.base}:${BASELINE_PATH}`)
  } catch {
    present = false
    console.log(`rule-coverage: ${args.base} has no ${BASELINE_PATH}; nothing to ratchet against`)
  }
  if (present) base = JSON.parse(git('show', `${args.base}:${BASELINE_PATH}`))
}

const rows = readdirSync(corpusDir).filter((file) => file.endsWith('.crv')).map((file) => file.slice(0, -4))
  .filter((row) => existsSync(join(corpusDir, `${row}.html`)) && !REFUSED_ALLOW.has(row)).sort()
const gated = gatedRules(map, registry)
const gatedSet = new Set(gated)
const selected = args.rules ? new Set(String(args.rules).split(',')) : null
const entries = map.mutations.filter((entry) => gatedSet.has(entry.rule) && (!selected || selected.has(entry.rule)))
for (const entry of map.mutations) {
  if (!gatedSet.has(entry.rule)) console.error(`rule-coverage: ${entry.rule} is outside the gated scopes; its entry is not measured`)
}

const scratch = mkdtempSync(join(tmpdir(), 'rule-coverage-'))
const slot = (index) => {
  const root = join(scratch, `slot-${index}`)
  for (const dir of MODEL_FILES.dirs) cpSync(resolve(repo, dir), join(root, dir), { recursive: true })
  for (const file of MODEL_FILES.files) {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    cpSync(resolve(repo, file), join(root, file))
  }
  symlinkSync(resolve(repo, 'node_modules'), join(root, 'node_modules'), 'dir')
  return root
}

const measure = async (root, order, full, label) => {
  const jobPath = join(root, 'job.json')
  writeFileSync(jobPath, JSON.stringify({ rows: order, corpusDir, full }))
  try {
    const { stdout } = await run(process.execPath, [worker, root, jobPath], { timeout: 600_000, maxBuffer: 64 << 20 })
    return JSON.parse(stdout).failing
  } catch (error) {
    // A mutant that hangs or crashes the process fails every row it reaches.
    console.error(`rule-coverage: ${label} did not finish (${error.killed ? 'timeout' : error.code}); counted as killed`)
    return [order[0]]
  }
}

const killed = new Map()
const killSets = new Map()
try {
  const roots = Array.from({ length: Math.max(1, Math.min(jobs, entries.length || 1)) }, (_, index) => slot(index))

  // An unmutated model that already fails a row would make every mutant look killed.
  const control = await measure(roots[0], rows, false, 'the unmutated model')
  if (control.length) {
    console.error(`rule-coverage: the unmutated model fails row ${control[0]}; fix the corpus or the model first`)
    process.exit(1)
  }

  const queue = [...entries]
  await Promise.all(roots.map(async (root) => {
    for (let entry = queue.shift(); entry; entry = queue.shift()) {
      const read = (file) => readFileSync(resolve(repo, file), 'utf8')
      let edited
      try {
        edited = applyEdits(entry, read)
      } catch (error) {
        console.error(`rule-coverage: ${error.message}`)
        process.exitCode = 1
        killed.set(entry.rule, null)
        continue
      }
      for (const [file, text] of edited) writeFileSync(join(root, file), text)
      const hint = baseline.killers?.[entry.rule]
      const order = hint && rows.includes(hint) ? [hint, ...rows.filter((row) => row !== hint)] : rows
      const failing = await measure(root, order, Boolean(args.full), entry.rule)
      for (const file of edited.keys()) writeFileSync(join(root, file), read(file))
      killed.set(entry.rule, failing[0] ?? null)
      killSets.set(entry.rule, failing)
    }
  }))
} finally {
  rmSync(scratch, { recursive: true, force: true })
}

const unmapped = gated.filter((id) => !map.mutations.some((entry) => entry.rule === id))
const report = {
  rows: rows.length,
  gated: gated.length,
  outsideScopes: registry.rules.length - gated.length,
  mapped: gated.length - unmapped.length,
  covered: [...killed.values()].filter(Boolean).length,
  survived: [...killed].filter(([, row]) => !row).map(([id]) => id).sort(),
  unmapped,
}
if (args.full) report.redundant = redundantGroups(killSets)

if (selected) {
  for (const [id, row] of [...killed].sort()) console.log(`${id}\t${row ?? 'SURVIVED'}${args.full ? `\t${killSets.get(id).length} rows` : ''}`)
  if (args.full) for (const group of report.redundant) console.log(`redundant: ${group.join(' ')}`)
  process.exit(process.exitCode ?? 0)
}


for (const id of unmapped) killed.set(id, null)
const killers = Object.fromEntries([...killed].filter(([, row]) => row).sort(([a], [b]) => a.localeCompare(b)))
if (args.write) {
  const uncovered = gated.filter((id) => !killed.get(id)).sort()
  writeFileSync(baselinePath, `${JSON.stringify({ uncovered, killers }, null, 2)}\n`)
  console.log(`rule-coverage: wrote ${BASELINE_PATH}: ${gated.length - uncovered.length}/${gated.length} gated rules covered, ${uncovered.length} uncovered`)
} else {
  const { uncovered, failures } = ratchet({ gated, killed, baseline, base })
  console.log(`rule-coverage: ${report.covered}/${report.gated} gated rules covered over ${report.rows} core rows (${report.mapped} mapped, ${report.unmapped.length} without a mutation, ${report.survived.length} survived; ${report.outsideScopes} rules outside the gated scopes)`)
  if (report.survived.length) console.log(`survived: ${report.survived.join(' ')}`)
  for (const failure of failures) console.error(`rule-coverage: ${failure}`)
  if (failures.length) process.exitCode = 1
  report.uncovered = uncovered
}
if (args.full) for (const group of report.redundant) console.log(`redundant: ${group.join(' ')}`)
if (args.json) writeFileSync(resolve(repo, args.json), `${JSON.stringify(report, null, 2)}\n`)
