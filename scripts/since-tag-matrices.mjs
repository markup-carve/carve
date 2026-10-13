#!/usr/bin/env node
import { spawnSync, execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse } from './spec/layout.mjs'
import { renderDoc } from './spec/html.mjs'
import { sinceTagMatrixCases } from './lib/since-tag-matrix-cases.mjs'

const option = key => process.argv.find(arg => arg.startsWith(`--${key}=`))?.slice(key.length + 3)
const jsPath = option('js'), phpPath = option('php'), rustPath = option('rust'), reportPath = option('report')
if (!jsPath || !phpPath || !rustPath || !reportPath) {
  console.error('Usage: node scripts/since-tag-matrices.mjs --js=/path/carve-js/dist/index.js --php=/path/carve-php/bin/carve --rust=/path/carve --report=/path/report.json [--rust-repo=/path/carve-rs]')
  process.exit(2)
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sha = data => createHash('sha256').update(data).digest('hex')
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
const repoRoot = path => git(dirname(resolve(path)), ['rev-parse', '--show-toplevel'])
const provenance = cwd => ({ head: git(cwd, ['rev-parse', 'HEAD']), diffSha256: sha(git(cwd, ['diff', 'HEAD'])) })
const rustRepo = option('rust-repo') ? resolve(option('rust-repo')) : repoRoot(rustPath)
const environment = {
  spec: provenance(root),
  js: provenance(repoRoot(jsPath)),
  php: provenance(repoRoot(phpPath)),
  rust: provenance(rustRepo),
  jsArtifactSha256: sha(readFileSync(resolve(jsPath))),
  phpArtifactSha256: sha(readFileSync(resolve(phpPath))),
  rustBinarySha256: sha(readFileSync(resolve(rustPath))),
}
const { carveToHtml } = await import(pathToFileURL(resolve(jsPath)).href)
const normalize = html => html.replace(/>\s+</g, '><').replace(/\n$/, '')
const errorText = error => `ERROR: ${String(error?.message ?? error).replace(/\s+/g, ' ').trim()}`
const call = (command, args, source) => {
  const result = spawnSync(command, args, { input: source, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 })
  if (result.error || result.status !== 0) return errorText(result.error ?? (result.stderr.trim() || `exit status ${result.status}`))
  return normalize(result.stdout)
}
const render = (fn, source) => {
  try { return normalize(fn(source)) }
  catch (error) { return errorText(error) }
}

const cases = sinceTagMatrixCases()
const matrices = Object.fromEntries(['payload', 'attribute', 'admission', 'term-break'].map(name => [name, {
  cases: 0, allAgree: 0, checkerVsJs: 0, checkerVsPhp: 0, checkerVsRust: 0, enginesDisagree: 0,
}]))
const differences = []
for (const { matrix, id, source } of cases) {
  const checker = render(text => renderDoc(parse(text)), source)
  const js = render(carveToHtml, source)
  const php = call('php', [resolve(phpPath), '--html'], source)
  const rust = call(resolve(rustPath), [], source)
  const totals = matrices[matrix]
  totals.cases++
  if (checker !== js) totals.checkerVsJs++
  if (checker !== php) totals.checkerVsPhp++
  if (checker !== rust) totals.checkerVsRust++
  if (new Set([js, php, rust]).size > 1) totals.enginesDisagree++
  if (new Set([checker, js, php, rust]).size === 1) totals.allAgree++
  else differences.push({ matrix, id, source, checker, js, php, rust })
}
const report = {
  schema: 1,
  comparison: 'Whitespace between tags and one trailing newline are ignored.',
  environment,
  corpusSha256: sha(JSON.stringify(cases)),
  matrices,
  differences,
}
writeFileSync(resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`)
for (const [matrix, totals] of Object.entries(matrices)) console.log(`${matrix}: ${JSON.stringify(totals)}`)
process.exitCode = differences.length ? 1 : 0
