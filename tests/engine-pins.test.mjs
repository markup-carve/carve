/*
 * NO CI JOB HERE CHECKS AN ENGINE OUT AT A MOVING REF.
 *
 * `ci.yml` checked carve-js, carve-rs and carve-php out at `ref: main`, and
 * `ast-conformance.yml` resolved `commits/main` for all four once per run and
 * handed the SHA to its shards. The second shape reads like a pin and is not
 * one: it only guarantees the shards agree with each other about which
 * unreviewed engine they measured. Either way an engine merge decided the
 * verdict of changes that had nothing to do with it - every open pull request
 * in this repo went red at once on an assertion none of them touched, and a
 * release freeze held for hours while people looked for a defect here
 * (carve#2869, carve#2881).
 *
 * The pins now live in resources/engine-pins.json, where a human reads them,
 * and bump-engine-pin.yml moves them daily. The float can only come back by
 * editing a workflow, so this reads the workflows.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ENGINES, enginePins, npmEnginePin } from '../scripts/set-engine-pin.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const workflowDir = resolve(repo, '.github/workflows')
const script = resolve(repo, 'scripts/set-engine-pin.mjs')
const run = (args, opts = {}) => execFileSync('node', [script, ...args], { encoding: 'utf8', ...opts }).trim()

test('every engine this repo measures has a reviewed pin', () => {
  const pins = enginePins()
  assert.deepEqual(Object.keys(pins).sort(), [...ENGINES].sort())
  for (const engine of ENGINES) assert.match(pins[engine], /^[0-9a-f]{40}$/, engine)
})

test('the carve-js pin is spelled the same in both places it has to live', () => {
  // npm cannot read resources/engine-pins.json, so package.json carries the
  // carve-js revision a second time. Two spellings of one rule is how the AST
  // conformance pin reader fell behind its own library (carve#2881), so the
  // only defence is a test that fails when they drift.
  assert.equal(npmEnginePin(), enginePins().js)
})

test('no workflow checks an engine out at a branch, or resolves one itself', () => {
  const offenders = []
  for (const name of readdirSync(workflowDir).filter((file) => /\.ya?ml$/.test(file))) {
    const source = readFileSync(join(workflowDir, name), 'utf8')
    const lines = source.split('\n')
    lines.forEach((line, index) => {
      if (line.trimStart().startsWith('#')) return
      // `ref:` on a checkout of an engine repo, holding anything but an
      // expression. A literal branch or tag is the float this test exists for.
      const ref = /^\s*ref:\s*(\S.*?)\s*$/.exec(line)
      if (ref && !ref[1].startsWith('${{')) {
        const near = lines.slice(Math.max(0, index - 4), index).join('\n')
        if (/repository:\s*markup-carve\/carve-(js|rs|rb|php)/.test(near)) {
          offenders.push(`${name}:${index + 1}: checks an engine out at ${ref[1]}`)
        }
      }
      // The same float one step removed: asking the API for a default branch
      // head and handing that SHA to the jobs.
      if (/repos\/markup-carve\/carve-[^/"']*\/commits\/(main|master)/.test(line)) {
        offenders.push(`${name}:${index + 1}: resolves an engine's default branch itself`)
      }
    })
  }
  assert.deepEqual(offenders, [], `engine checkouts that float:\n  ${offenders.join('\n  ')}`)
})

/* Every `actions/checkout` of an engine, found by enumerating the checkouts
 * rather than by reading for them. The neighbor above only sees a `ref:` that
 * holds a branch name, so a checkout with NO `ref:` at all - the plainest
 * spelling of the same float - walked past it: ci.yml's `declarations` job
 * carried three of them through the sweep that was aimed at exactly this
 * defect, and a carve-php merge then failed every open pull request in this
 * repo (carve#2899). The second assertion covers the float one layer in: a
 * `ref:` reading `needs.<job>.outputs.<engine>` in a job that does not declare
 * that `needs:` resolves to the empty string, and an empty ref is the default
 * branch again, silently. */
const engineCheckouts = () => {
  const found = []
  for (const name of readdirSync(workflowDir).filter((file) => /\.ya?ml$/.test(file))) {
    const lines = readFileSync(join(workflowDir, name), 'utf8').split('\n')
    const indent = (line) => line.length - line.trimStart().length
    let job = null
    let needs = []
    lines.forEach((line, index) => {
      if (/^  [A-Za-z0-9_-]+:\s*$/.test(line)) {
        job = line.trim().slice(0, -1)
        needs = []
      }
      const scalar = /^    needs:\s*(\S.*?)\s*$/.exec(line)
      if (scalar) needs = scalar[1].replace(/[[\]]/g, '').split(',').map((part) => part.trim())
      if (/^    needs:\s*$/.test(line)) {
        for (let k = index + 1; k < lines.length && /^\s*- /.test(lines[k]); k += 1) {
          needs.push(lines[k].trim().slice(2).trim())
        }
      }

      const repo = /^(\s*)repository:\s*markup-carve\/(carve-[a-z]+)\s*$/.exec(line)
      if (!repo || repo[2] === 'carve') return
      const column = repo[1].length
      // The sibling keys of the `with:` mapping this `repository:` sits in.
      const siblings = []
      for (let k = index - 1; k >= 0 && indent(lines[k]) >= column; k -= 1) {
        if (/^\s*- /.test(lines[k])) break
        siblings.push(lines[k])
      }
      for (let k = index + 1; k < lines.length && indent(lines[k]) >= column; k += 1) {
        if (/^\s*- /.test(lines[k])) break
        siblings.push(lines[k])
      }
      const ref = siblings.map((sibling) => /^\s*ref:\s*(\S.*?)\s*$/.exec(sibling)).find(Boolean)
      found.push({ where: `${name}:${index + 1}`, engine: repo[2], job, needs, ref: ref && ref[1] })
    })
  }
  return found
}

test('every engine checkout in every workflow carries a ref', () => {
  const checkouts = engineCheckouts()
  // A pass on an empty list would mean the enumeration broke, not that the
  // workflows are clean.
  assert.ok(checkouts.length >= 12, `only found ${checkouts.length} engine checkouts`)
  const unpinned = checkouts.filter((checkout) => !checkout.ref)
  assert.deepEqual(
    unpinned.map((checkout) => `${checkout.where}: ${checkout.engine} with no ref`),
    [],
  )
})

test('a ref that reads another job\'s output is declared as a need', () => {
  const undeclared = []
  for (const checkout of engineCheckouts()) {
    const read = /needs\.([A-Za-z0-9_-]+)\.outputs/.exec(checkout.ref ?? '')
    if (read && !checkout.needs.includes(read[1])) {
      undeclared.push(`${checkout.where}: job ${checkout.job} reads ${read[1]} without needing it`)
    }
  }
  assert.deepEqual(undeclared, [])
})

test('the workflows read the pins through the one reader', () => {
  for (const name of ['ci.yml', 'ast-conformance.yml']) {
    assert.match(
      readFileSync(join(workflowDir, name), 'utf8'),
      /node scripts\/set-engine-pin\.mjs --github-output/,
      `${name} no longer reads the pins through the shared reader`,
    )
  }
})

test('the daily bump covers every engine, and still runs on dispatch and cron', () => {
  const bump = readFileSync(join(workflowDir, 'bump-engine-pin.yml'), 'utf8')
  assert.match(bump, /workflow_dispatch:/)
  assert.match(bump, /cron: '41 4 \* \* \*'/)
  assert.match(bump, /for engine in js php rb rs; do/, 'the bump covers carve-js alone again')
})

test('--github-output names every engine, in the shape a step appends', () => {
  const printed = run(['--github-output'])
  assert.deepEqual(
    printed.split('\n').map((line) => line.split('=')[0]),
    [...ENGINES],
  )
  const pins = enginePins()
  for (const line of printed.split('\n')) {
    const [engine, sha] = line.split('=')
    assert.equal(sha, pins[engine])
  }
})

test('it rewrites one engine in place and leaves the others alone', () => {
  const dir = mkdtempSync(join(tmpdir(), 'engine-pins-'))
  const pinsCopy = join(dir, 'engine-pins.json')
  copyFileSync(resolve(repo, 'resources/engine-pins.json'), pinsCopy)
  const target = 'a'.repeat(40)

  // Through the module rather than the CLI, so the real repository files are
  // never rewritten by a test run.
  const before = readFileSync(pinsCopy, 'utf8')
  writeFileSync(pinsCopy, before.replace(enginePins(pinsCopy).rs, target))
  const after = enginePins(pinsCopy)
  assert.equal(after.rs, target)
  assert.equal(after.js, enginePins().js, 'rewriting one engine moved another')
})

test('a sha that is not one, and an engine this repo does not pin, are refused', () => {
  // Both must EXIT NON-ZERO. A refusal that returns 0 lets the workflow commit
  // an unchanged file as a bump, which is the failure this guards.
  assert.throws(() => run(['--set', 'deadbeef'], { stdio: 'pipe' }))
  assert.throws(() => run(['--current', '--engine', 'elixir'], { stdio: 'pipe' }))
  assert.throws(() => run([], { stdio: 'pipe' }))
})
