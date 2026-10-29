#!/usr/bin/env node
/*
 * Nightly fuzz differential: corpus documents, mutated, rendered to HTML by the
 * spec model, carve-js, carve-php and carve-rs, compared.
 *
 * Only corpus documents all four already agree on seed the mutants, so every
 * disagreement is one the mutation introduced. Each is reduced while the
 * agreement pattern holds, then grouped by signature (lib/mutation-fuzz.mjs).
 * scripts/fuzz-file-issues.mjs turns the report into issues.
 *
 *   node scripts/fuzz-nightly.mjs                       # seed = today's UTC date
 *   node scripts/fuzz-nightly.mjs --seed=20261029 --budget-minutes=2
 *   node scripts/fuzz-nightly.mjs --seed=7 --max-mutants=500 --report=/tmp/fuzz.json
 *
 * Exit 0 whether or not it found disagreements: the issues are the signal.
 * Exit 2 when the harness itself is broken (an engine missing, nothing
 * compared, or too few seed documents agreeing to trust the comparison).
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { phpDir, rustBinary } from './lib/engine-locations.mjs'
import { phpRenderer } from './lib/php-render-client.mjs'
import {
  agreementPattern, agrees, dateSeed, groupFindings, mutate, reduce, restrictPattern, rng, signature,
} from './lib/mutation-fuzz.mjs'
import { parse } from './spec/layout.mjs'
import { renderDoc } from './spec/html.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const option = (key, fallback) => {
  const arg = process.argv.find((a) => a.startsWith(`--${key}=`))
  return arg ? arg.slice(key.length + 3) : fallback
}
const seed = Number(option('seed', dateSeed()))
const budgetMs = Number(option('budget-minutes', 20)) * 60_000
const maxMutants = Number(option('max-mutants', Infinity))
const maxReductions = Number(option('max-reductions', 300))
// Reduction is most of the cost; past this many per agreement pattern the
// budget goes to new mutants instead.
const maxPerPattern = Number(option('max-per-pattern', 6))
const reportPath = option('report', null)
const MAX_SEED_LENGTH = 1500
// Below this share of agreeing seed documents the comparison itself is suspect
// (a wrong build, a broken checkout), not the engines.
const MIN_AGREEING_SHARE = 0.5

const fail = (message) => {
  console.error(`fuzz-nightly: ${message}`)
  process.exit(2)
}
if (!Number.isInteger(seed) || seed < 0) fail(`--seed must be a non-negative integer, got ${option('seed')}`)
if (!(budgetMs > 0)) fail('--budget-minutes must be positive')

const jsDir = process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js')
const jsEntry = join(jsDir, 'dist/index.js')
const rsBinary = rustBinary()
const php = phpDir()
const missing = [
  !existsSync(jsEntry) && `carve-js (${jsEntry})`,
  !rsBinary && 'carve-rs (no binary built from CARVE_RS_DIR)',
  !existsSync(join(php, 'vendor/autoload.php')) && `carve-php (${php}, run composer install)`,
].filter(Boolean)
if (missing.length) fail(`missing engine(s): ${missing.join(', ')}`)

const head = (dir) => {
  try {
    return execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}
const engines = {
  spec: head(root), js: head(jsDir), php: head(php), rs: head(process.env.CARVE_RS_DIR ?? resolve(root, '../carve-rs')),
}
const enginesLine = `spec model ${engines.spec}, carve-js ${engines.js}, carve-php ${engines.php}, carve-rs ${engines.rs}`
console.log(`fuzz-nightly: seed=${seed} budget=${budgetMs / 60_000} min`)
console.log(`fuzz-nightly: ${enginesLine}`)

const { carveToHtml } = await import(pathToFileURL(jsEntry).href)
const PHP_BATCH = join(root, 'scripts/lib/php-batch-render.php')
const BATCH = 64
const error = (e) => `ERROR: ${String(e?.message ?? e).split('\n')[0].slice(0, 120)}`

const phpServer = phpRenderer(php)
const phpOutput = (out) => typeof out === 'string' ? out.trim() : `ERROR: ${out.error.slice(0, 120)}`

// One warm php process for the run; a batch it cannot answer is rendered by a
// fresh process per source, to pin a crash or a hang on one case.
function renderPhp(sources) {
  const served = phpServer.render(sources)
  return served ? served.map(phpOutput) : sources.flatMap((source) => renderPhpCold([source]))
}

function renderPhpCold(sources) {
  const child = spawnSync('php', [PHP_BATCH, php], {
    input: JSON.stringify(sources), encoding: 'utf8', timeout: 60_000, maxBuffer: 1 << 28,
  })
  if (child.status === 0) {
    return JSON.parse(child.stdout).map(phpOutput)
  }
  return sources.map(() => error(child.stderr || child.error || `exit ${child.status ?? child.signal}`))
}

function renderModel(source) {
  try {
    return renderDoc(parse(source)).trim()
  } catch (e) {
    // A refusal is the model saying the case is outside what it decides.
    return e?.refuse ? undefined : error(e)
  }
}

function renderJs(source) {
  try {
    return carveToHtml(source).trim()
  } catch (e) {
    return error(e)
  }
}

function renderRs(source) {
  const child = spawnSync(rsBinary, [], { input: source, encoding: 'utf8', timeout: 10000, maxBuffer: 1 << 24 })
  return child.status === 0 ? child.stdout.trim() : error(child.stderr || child.error || `exit ${child.status ?? child.signal}`)
}

const renderMany = (sources) => {
  if (!sources.length) return []
  const phpOut = renderPhp(sources)
  return sources.map((source, i) => ({ model: renderModel(source), js: renderJs(source), php: phpOut[i], rs: renderRs(source) }))
}
const patterns = (sources) => renderMany(sources).map(agreementPattern)

/**
 * The reducer's predicate: the index of the first candidate that splits the
 * participants exactly as `pattern` does. Cheap participants go first and a
 * candidate is dropped as soon as the ones rendered so far are grouped
 * differently from `pattern`, so most failing candidates never reach php or
 * the model.
 */
function firstKeeping(pattern, candidates) {
  let live = candidates.map((source, index) => ({ source, index, out: {} }))
  const stage = (name, renderAll) => {
    const outs = renderAll(live.map((c) => c.source))
    live.forEach((c, i) => { c.out[name] = outs[i] })
    live = live.filter((c) => agreementPattern(c.out) === restrictPattern(pattern, Object.keys(c.out)))
  }
  stage('js', (xs) => xs.map(renderJs))
  stage('php', (xs) => xs.length ? renderPhp(xs) : [])
  stage('rs', (xs) => xs.map(renderRs))
  stage('model', (xs) => xs.map(renderModel))
  return live.length ? live[0].index : -1
}

const corpusDir = join(root, 'tests/corpus')
const pool = readdirSync(corpusDir)
  .filter((name) => name.endsWith('.crv'))
  .sort()
  .map((name) => ({ name, source: readFileSync(join(corpusDir, name), 'utf8') }))
  .filter((doc) => doc.source.length <= MAX_SEED_LENGTH && doc.source.trim())
if (!pool.length) fail(`no corpus documents under ${corpusDir}`)
const donors = pool.map((doc) => doc.source)

const r = rng(seed)
const calibrated = new Map()
const started = Date.now()
let mutants = 0
let disagreements = 0
const findings = []
const perPattern = new Map()
while (Date.now() - started < budgetMs && mutants < maxMutants) {
  const docs = Array.from({ length: BATCH }, () => r.pick(pool))
  const fresh = [...new Set(docs.filter((doc) => !calibrated.has(doc.name)))]
  patterns(fresh.map((doc) => doc.source)).forEach((p, i) => calibrated.set(fresh[i].name, agrees(p)))
  const batch = docs
    .filter((doc) => calibrated.get(doc.name))
    .slice(0, Math.max(0, maxMutants - mutants))
    .map((doc) => ({ doc, ...mutate(doc.source, r, donors) }))
    .filter((m) => m.source !== m.doc.source)
  mutants += batch.length
  const found = patterns(batch.map((m) => m.source))
  for (const [i, pattern] of found.entries()) {
    if (agrees(pattern)) continue
    disagreements += 1
    if (findings.length >= maxReductions || Date.now() - started >= budgetMs) continue
    if ((perPattern.get(pattern) ?? 0) >= maxPerPattern) continue
    perPattern.set(pattern, (perPattern.get(pattern) ?? 0) + 1)
    const { doc, applied, source } = batch[i]
    const reduced = reduce(source, (candidates) => firstKeeping(pattern, candidates)).source
    const [outputs] = renderMany([reduced])
    findings.push({ origin: doc.name, applied, pattern, reduced, outputs, signature: signature(pattern, reduced) })
  }
}

const tried = calibrated.size
const agreeing = [...calibrated.values()].filter(Boolean).length
const groups = groupFindings(findings)
const report = {
  schema: 1,
  seed,
  budgetMinutes: budgetMs / 60_000,
  elapsedSeconds: Math.round((Date.now() - started) / 1000),
  engines,
  enginesLine,
  seedDocuments: { tried, agreeing },
  mutants,
  disagreements,
  reduced: findings.length,
  groups,
}
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')

for (const g of groups) {
  console.log(`\n=== ${g.signature}  ${g.pattern}  (${g.hits} hit(s), from ${g.origin})`)
  console.log(g.reduced.replace(/\n$/, '').split('\n').map((l) => `    ${l}`).join('\n'))
}
console.log(
  `\nfuzz-nightly: seed=${seed} seeds tried=${tried} agreeing=${agreeing} mutants=${mutants} ` +
    `disagreements=${disagreements} reduced=${findings.length} causes=${groups.length}`,
)

if (mutants === 0) fail('compared no mutants')
if (agreeing / tried < MIN_AGREEING_SHARE) {
  fail(`only ${agreeing} of ${tried} seed documents agree unmutated; the harness is suspect, not the engines`)
}
process.exit(0)
