#!/usr/bin/env node
/*
 * Triage reduced fuzz findings into causes: re-check each one against the
 * current engines, cluster the ones that still disagree, and match every
 * cluster against the reproductions of open tickets and the drift ledgers.
 *
 *   node scripts/triage-findings.mjs --findings=/tmp/fuzz.json
 *   node scripts/triage-findings.mjs --findings=/tmp/sat3/runs --fetch-issues --report=/tmp/triage.json
 *   node scripts/triage-findings.mjs --findings=runs --issues=/tmp/issues --no-recheck
 *
 * --findings   fuzz-nightly reports or sat run files: files or directories of *.json
 * --issues     `gh issue list --json number,title,body,url` dumps (file or directory)
 * --fetch-issues  list open issues of the four repos with gh instead (one call each)
 * --no-recheck keep the recorded outputs instead of rendering again
 * --report     write the clusters as JSON
 *
 * A cluster is NEW when no known reproduction shares its key, or its family
 * with close enough features. NEW is a lead to verify against the spec text,
 * not a verdict.
 *
 * Exit 2 when an engine is missing.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { phpDir, rustBinary } from './lib/engine-locations.mjs'
import { parseDriftLedger } from './lib/drift-ledger.mjs'
import { phpRenderer } from './lib/php-render-client.mjs'
import {
  agreementPattern, cluster, clusterKey, issueSamples, ledgerRefs, loadFindings, matchCluster,
} from './lib/triage-findings.mjs'
import { parse } from './spec/layout.mjs'
import { renderDoc } from './spec/html.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const option = (key, fallback) => {
  const arg = process.argv.find((a) => a.startsWith(`--${key}=`))
  return arg ? arg.slice(key.length + 3) : fallback
}
const flag = (key) => process.argv.includes(`--${key}`)
const fail = (message) => {
  console.error(`triage-findings: ${message}`)
  process.exit(2)
}

const jsonFiles = (paths) => paths.flatMap((p) => statSync(p).isDirectory()
  ? readdirSync(p).filter((n) => n.endsWith('.json')).sort().map((n) => join(p, n))
  : [p])
const findingPaths = option('findings', '').split(',').filter(Boolean)
if (!findingPaths.length) fail('usage: --findings=<file|dir>[,...] [--issues=<file|dir> | --fetch-issues] [--no-recheck] [--report=<out.json>]')

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

const { carveToHtml, carveToCarve } = await import(pathToFileURL(jsEntry).href)
const error = (e) => `ERROR: ${String(e?.message ?? e).split('\n')[0].slice(0, 120)}`
const phpServer = phpRenderer(php)

const model = (s) => {
  try {
    return renderDoc(parse(s)).trim()
  } catch (e) {
    return e?.refuse ? undefined : error(e)
  }
}
const js = (s) => {
  try {
    return carveToHtml(s).trim()
  } catch (e) {
    return error(e)
  }
}
const rs = (s, args = []) => {
  const c = spawnSync(rsBinary, args, { input: s, encoding: 'utf8', timeout: 10_000, maxBuffer: 1 << 24 })
  return c.status === 0 ? (args.length ? c.stdout : c.stdout.trim()) : error(c.stderr || c.error || `exit ${c.status ?? c.signal}`)
}
const phpBatch = (script, sources) => {
  const c = spawnSync('php', [join(root, 'scripts/lib', script), php], {
    input: JSON.stringify(sources), encoding: 'utf8', timeout: 300_000, maxBuffer: 1 << 28,
  })
  if (c.status !== 0) return sources.map(() => error(c.stderr || `exit ${c.status ?? c.signal}`))
  return JSON.parse(c.stdout).map((o) => typeof o === 'string' ? o : `ERROR: ${o.error.slice(0, 120)}`)
}
const phpHtml = (sources) => {
  if (!sources.length) return []
  const served = phpServer.render(sources)
  const out = served ?? phpBatch('php-batch-render.php', sources)
  return out.map((o) => typeof o === 'string' ? o.trim() : `ERROR: ${o.error.slice(0, 120)}`)
}

function htmlOutputs(sources) {
  const p = phpHtml(sources)
  return sources.map((s, i) => ({ model: model(s), js: js(s), php: p[i], rs: rs(s) }))
}

// The writer checks the sat runs apply: each engine's output
// keeps its own reading, formats to itself, and the three spell it alike.
function writerVerdicts(sources) {
  const jsFmt = (s) => {
    try {
      return carveToCarve(s)
    } catch (e) {
      return error(e)
    }
  }
  const fmt = { js: sources.map(jsFmt), php: phpBatch('php-batch-fmt.php', sources), rs: sources.map((s) => rs(s, ['--carve'])) }
  const srcHtml = { js: sources.map(js), php: phpHtml(sources), rs: sources.map((s) => rs(s)) }
  const fmtHtml = { js: fmt.js.map(js), php: phpHtml(fmt.php), rs: fmt.rs.map((s) => rs(s)) }
  const again = { js: fmt.js.map(jsFmt), php: phpBatch('php-batch-fmt.php', fmt.php), rs: fmt.rs.map((s) => rs(s, ['--carve'])) }
  return sources.map((_, i) => {
    const bad = []
    for (const e of ['js', 'php', 'rs']) {
      if (fmt[e][i].startsWith('ERROR')) bad.push(`crash:${e}`)
      else if (srcHtml[e][i] !== fmtHtml[e][i]) bad.push(`semantic:${e}`)
      else if (again[e][i] !== fmt[e][i]) bad.push(`idem:${e}`)
    }
    const spellings = { js: fmt.js[i], php: fmt.php[i], rs: fmt.rs[i] }
    if (!bad.length && agreementPattern(spellings).includes('|')) bad.push(`canon:${agreementPattern(spellings)}`)
    return { verdict: bad.join(' '), fmt: spellings }
  })
}

// ---- findings, re-checked ----
let findings = []
for (const file of jsonFiles(findingPaths)) findings.push(...loadFindings(JSON.parse(readFileSync(file, 'utf8')), basename(file, '.json')))
const total = findings.length
let resolved = 0
if (!flag('no-recheck')) {
  const html = htmlOutputs(findings.map((f) => f.reduced))
  findings = findings.map((f, i) => {
    const pattern = agreementPattern(html[i])
    // A writer finding whose reading already differs is a reading finding.
    if (pattern.includes('|')) return { ...f, kind: 'html', pattern, outputs: html[i] }
    return f.kind === 'html' ? { ...f, pattern, outputs: html[i] } : f
  })
  const writers = findings.filter((f) => f.kind === 'writer')
  writerVerdicts(writers.map((f) => f.reduced)).forEach((v, i) => Object.assign(writers[i], { pattern: v.verdict, outputs: v }))
  const live = findings.filter((f) => f.kind === 'writer' ? f.pattern : f.pattern.includes('|'))
  resolved = findings.length - live.length
  findings = live
}

// ---- known reproductions: open tickets and drift ledger rows ----
const repos = ['markup-carve/carve', 'markup-carve/carve-js', 'markup-carve/carve-php', 'markup-carve/carve-rs']
let issues = []
if (flag('fetch-issues')) {
  for (const repo of repos) {
    const listed = JSON.parse(execFileSync('gh', ['issue', 'list', '--repo', repo, '--state', 'open', '--limit', '1000', '--json', 'number,title,body,url'], { encoding: 'utf8', maxBuffer: 1 << 28 }))
    issues.push(...listed.map((i) => ({ ...i, repo })))
  }
} else if (option('issues')) {
  for (const file of jsonFiles(option('issues').split(','))) {
    const repo = `markup-carve/${basename(file, '.json')}`
    issues.push(...JSON.parse(readFileSync(file, 'utf8')).map((i) => ({ repo: i.url ? i.url.split('/').slice(3, 5).join('/') : repo, ...i })))
  }
}
const samples = issues.flatMap((i) => issueSamples(i.body).map((src) => ({ ref: `${i.repo}#${i.number}`, src })))
for (const name of ['engine-pin-drift.txt', 'engine-target-drift.txt']) {
  const path = join(root, 'resources', name)
  if (!existsSync(path)) continue
  for (const [key, reason] of parseDriftLedger(path)) {
    const slug = key.split('/').at(-1)
    const row = join(root, 'tests/corpus', `${slug}.crv`)
    if (!existsSync(row)) continue
    const refs = ledgerRefs(reason)
    for (const ref of refs.length ? refs : [`${name}:${slug}`]) samples.push({ ref, src: readFileSync(row, 'utf8') })
  }
}
const sampleHtml = htmlOutputs(samples.map((s) => s.src))
const known = []
const writerSamples = []
samples.forEach((s, i) => {
  const pattern = agreementPattern(sampleHtml[i])
  if (pattern.includes('|')) known.push({ ref: s.ref, ...clusterKey({ kind: 'html', reduced: s.src, pattern, outputs: sampleHtml[i] }) })
  else writerSamples.push(s)
})
if (findings.some((f) => f.kind === 'writer')) {
  writerVerdicts(writerSamples.map((s) => s.src)).forEach((v, i) => {
    if (v.verdict) known.push({ ref: writerSamples[i].ref, ...clusterKey({ kind: 'writer', reduced: writerSamples[i].src, pattern: v.verdict, outputs: v }) })
  })
}

// ---- cluster and match ----
const groups = cluster(findings.map((finding) => ({ finding, ...clusterKey(finding) })))
const rows = groups.map((g) => {
  const rep = g.members[0].finding
  const match = matchCluster(g, known)
  return {
    cluster: g.cluster, family: g.family, count: g.members.length, match,
    representative: { id: rep.id, reduced: rep.reduced, pattern: rep.pattern, outputs: rep.outputs },
    members: g.members.map((m) => m.finding.id),
  }
})
const matched = rows.filter((r) => r.match)
const summary = {
  findings: total, resolved, live: findings.length, clusters: rows.length,
  matched: matched.length, matchedFindings: matched.reduce((n, r) => n + r.count, 0),
  new: rows.length - matched.length, knownReproductions: known.length,
}
if (option('report')) writeFileSync(option('report'), JSON.stringify({ summary, clusters: rows }, null, 1))
console.log(`triage-findings: ${summary.findings} findings, ${summary.resolved} agree now, ${summary.live} live in ${summary.clusters} clusters`)
console.log(`triage-findings: ${summary.matched} clusters (${summary.matchedFindings} findings) match ${summary.knownReproductions} known reproductions, ${summary.new} NEW`)
for (const r of rows) {
  const tag = r.match ? `${r.match.how === 'exact' ? '=' : '~'} ${r.match.refs.join(' ')}` : 'NEW'
  console.log(`${String(r.count).padStart(4)}  ${tag.padEnd(36)}  ${r.cluster}  ${JSON.stringify(r.representative.reduced)}`)
}
process.exit(0)
