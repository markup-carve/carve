#!/usr/bin/env node
import { spawnSync, execFileSync } from 'node:child_process'
import { writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { parse } from './spec/layout.mjs'
import { renderDoc } from './spec/html.mjs'
import { miscount } from './spec/participants.mjs'
import { containerDifferentialCases } from './lib/container-differential-cases.mjs'

// Explicit artifacts prevent a dirty sibling build from silently joining a run.
const option = (key) => process.argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3)
const jsPath = option('js'), rustPath = option('rust'), reportPath = option('report')
if (!jsPath || !rustPath || !reportPath) {
  console.error('Usage: node scripts/container-differential.mjs --js=/path/dist/index.js --rust=/path/carve --report=/path/report.json')
  process.exit(2)
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
const sha = (data) => createHash('sha256').update(data).digest('hex')
const provenance = (cwd) => ({ head: git(cwd, ['rev-parse', 'HEAD']), diffSha256: sha(git(cwd, ['diff', 'HEAD'])) })
const artifactTreeSha = (dir) => sha(readdirSync(dir, { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile())
  .map(entry => {
    const path = join(entry.parentPath, entry.name)
    return [path.slice(dir.length), sha(readFileSync(path))]
  }).sort(([a], [b]) => a.localeCompare(b)).map(row => JSON.stringify(row)).join('\n'))
const { carveToHtml } = await import(pathToFileURL(resolve(jsPath)).href)
const environment = {
  spec: provenance(root), js: provenance(resolve(dirname(jsPath), '..')),
  jsBuildSha256: artifactTreeSha(resolve(dirname(jsPath))),
  rustBinarySha256: sha(readFileSync(rustPath)),
}
const cases = containerDifferentialCases()
const missing = miscount({ label: 'container differential', actual: cases.length, expected: 976 })
if (missing) throw new Error(missing)
const rows = []
for (const c of cases) {
  let spec
  try { spec = renderDoc(parse(c.source)).trim() }
  catch (error) {
    if (!error.refuse) throw error
    rows.push({ ...c, refusal: error.message })
    continue
  }
  const js = carveToHtml(c.source).trim()
  const child = spawnSync(resolve(rustPath), [], { input: c.source, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 })
  if (child.status !== 0) throw new Error(`${c.name}: ${child.stderr || child.error || child.status}`)
  const rs = child.stdout.trim()
  rows.push({ ...c, spec, js, rs, equal: spec === js && js === rs })
}
const report = {
  schema: 1,
  comparison: 'Exact HTML after trimming outer whitespace; internal whitespace is preserved.',
  ...environment,
  corpusSha256: sha(JSON.stringify(cases)),
  total: rows.length, refused: rows.filter(r => r.refusal).length,
  agreed: rows.filter(r => r.equal).length,
  differences: rows.filter(r => r.equal === false),
  refusals: rows.filter(r => r.refusal),
}
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ total: report.total, agreed: report.agreed, refused: report.refused, differences: report.differences.length }))
// This is an investigation report; differences are still a failing exit status.
process.exitCode = report.differences.length || report.refused ? 1 : 0
