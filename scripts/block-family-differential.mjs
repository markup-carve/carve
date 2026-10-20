#!/usr/bin/env node
// Renders every block-family case with the executable spec and the three
// engines, and fails on any normalized-HTML difference.
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { blockFamilyCases } from './lib/block-family-cases.mjs'

const option = (key) => process.argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3)
const jsPath = option('js'), phpDir = option('php'), rustPath = option('rust'), reportPath = option('report')
if (!jsPath || !phpDir || !rustPath) {
  console.error('Usage: node scripts/block-family-differential.mjs --js=<carve-js>/dist/index.js --php=<carve-php checkout> --rust=<carve binary> [--spec=<carve checkout>] [--report=<file.json>] [--filter=<name substring>]')
  process.exit(2)
}
const filter = option('filter')
const here = dirname(fileURLToPath(import.meta.url))
// --spec=<carve checkout> measures another revision of the executable spec.
const specDir = option('spec') ? resolve(option('spec'), 'scripts/spec') : resolve(here, 'spec')
const { parse } = await import(pathToFileURL(resolve(specDir, 'layout.mjs')).href)
const { renderDoc } = await import(pathToFileURL(resolve(specDir, 'html.mjs')).href)
// Indentation outside a code block is pretty-printing; inside one it is content.
const normalize = (html) => {
  let inPre = false
  const out = []
  for (const line of html.trim().split('\n')) {
    if (inPre) out.push(line)
    else if (line.trim() !== '') out.push(line.trim())
    if (/<pre[ >]/.test(line)) inPre = true
    if (line.includes('</pre>')) inPre = false
  }
  return out.join('\n')
}

const cases = blockFamilyCases().filter(c => !filter || c.name.includes(filter))
const { carveToHtml } = await import(pathToFileURL(resolve(jsPath)).href)

const php = spawnSync('php', [resolve(here, 'lib/php-batch-render.php'), resolve(phpDir)], {
  input: JSON.stringify(cases.map(c => c.source)), encoding: 'utf8', maxBuffer: 1 << 28,
})
if (php.status !== 0) throw new Error(`carve-php batch failed: ${php.stderr}`)
const phpOut = JSON.parse(php.stdout)

const settle = (fn) => {
  try { return normalize(fn()) } catch (error) { return `!error ${error.refuse ? 'refuse' : ''} ${error.message}` }
}
const rows = cases.map((c, i) => {
  const spec = settle(() => renderDoc(parse(c.source)))
  const js = settle(() => carveToHtml(c.source))
  const p = phpOut[i]
  const phpHtml = typeof p === 'string' ? normalize(p) : `!error ${p.error}`
  const child = spawnSync(resolve(rustPath), [], { input: c.source, encoding: 'utf8', timeout: 10000 })
  const rs = child.status === 0 ? normalize(child.stdout) : `!error ${child.stderr || child.status}`
  return { ...c, spec, js, php: phpHtml, rs }
})

// Name the odd one out when three of the four agree.
const ENGINES = ['spec', 'js', 'php', 'rs']
const verdict = (row) => {
  const values = ENGINES.map(e => row[e])
  if (values.every(v => v === values[0])) return null
  for (const e of ENGINES) {
    const rest = ENGINES.filter(x => x !== e).map(x => row[x])
    if (rest.every(v => v === rest[0])) return e
  }
  const groups = new Map()
  for (const e of ENGINES) groups.set(row[e], [...(groups.get(row[e]) ?? []), e])
  return [...groups.values()].map(g => g.join('+')).join(' | ')
}
const differences = rows.map(r => ({ ...r, odd: verdict(r) })).filter(r => r.odd)
const aheadPath = resolve(here, '..', 'resources/block-family-ahead-of-pin.json')
const ahead = JSON.parse(readFileSync(aheadPath, 'utf8'))
const declared = differences.filter(r => ahead.some(a => a.name === r.name && a.source === r.source))
const undeclared = differences.filter(r => !declared.includes(r))
const stale = ahead.filter(a => !cases.some(c => c.name === a.name && c.source === a.source) ||
  !declared.some(r => r.name === a.name && r.source === a.source))
const byOdd = {}
for (const d of differences) byOdd[d.odd] = (byOdd[d.odd] ?? 0) + 1

if (reportPath) writeFileSync(reportPath, JSON.stringify({ total: rows.length, byOdd, differences, declared: declared.length, undeclared: undeclared.length, stale }, null, 2) + '\n')
console.log(JSON.stringify({ total: rows.length, differences: differences.length, declared: declared.length, undeclared: undeclared.length, stale: stale.length, byOdd }))
process.exitCode = undeclared.length || stale.length ? 1 : 0
