#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const examplesPath = resolve(repoRoot, 'docs/examples.md')
const outDir = resolve(repoRoot, 'tests/corpus')

const src = readFileSync(examplesPath, 'utf8')
const lines = src.split('\n')

const examples = []
let currentSection = null
let mode = 'scanning'
let pendingBlocks = { carve: null, html: null }
let currentLang = null
let fenceMarker = null
let blockLines = []

const finalizePair = () => {
  if (currentSection && pendingBlocks.carve && pendingBlocks.html) {
    examples.push({ section: currentSection, carve: pendingBlocks.carve, html: pendingBlocks.html })
  }
  pendingBlocks = { carve: null, html: null }
}

for (const line of lines) {
  const h2 = line.match(/^##\s+(.+?)\s*$/)
  if (h2 && mode === 'scanning') {
    currentSection = h2[1]
    pendingBlocks = { carve: null, html: null }
    continue
  }
  if (mode === 'scanning' && line.trim() === '::: compare') {
    mode = 'in_compare'
    continue
  }
  if (mode === 'in_compare') {
    if (line.trim() === ':::') {
      finalizePair()
      mode = 'scanning'
      continue
    }
    const fenceOpen = line.match(/^(`{3,})(carve|html)\s*$/)
    if (fenceOpen) {
      fenceMarker = fenceOpen[1]
      currentLang = fenceOpen[2]
      blockLines = []
      mode = 'in_fence'
    }
    continue
  }
  if (mode === 'in_fence') {
    if (line.startsWith(fenceMarker) && line.slice(fenceMarker.length).trim() === '') {
      pendingBlocks[currentLang] = blockLines.join('\n')
      mode = 'in_compare'
      currentLang = null
      fenceMarker = null
      continue
    }
    blockLines.push(line)
  }
}

mkdirSync(outDir, { recursive: true })
for (const f of readdirSync(outDir)) {
  if (f.endsWith('.crv') || f.endsWith('.html')) unlinkSync(resolve(outDir, f))
}

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

let n = 0
for (const ex of examples) {
  n += 1
  const idx = String(n).padStart(2, '0')
  const slug = slugify(ex.section)
  ex.idx = idx
  ex.slug = slug
  const base = `${idx}-${slug}`
  writeFileSync(resolve(outDir, `${base}.crv`), ex.carve + '\n')
  writeFileSync(resolve(outDir, `${base}.html`), ex.html + '\n')
  console.log(`  ${base}.{crv,html}`)
}
console.log(`\nWrote ${examples.length} pairs to ${outDir}`)

// --- djot-style mirror: NN-slug.test files for implementations whose runners
// already speak djot's fenced-pair format (e.g. carve-php's OfficialTestSuiteTest).
const specDir = resolve(repoRoot, 'tests/spec')
mkdirSync(specDir, { recursive: true })
for (const f of readdirSync(specDir)) {
  if (f.endsWith('.test')) unlinkSync(resolve(specDir, f))
}

const maxRun = (s, ch) => {
  const m = s.match(new RegExp(`${ch}+`, 'g'))
  return m ? Math.max(...m.map((r) => r.length)) : 0
}

for (const ex of examples) {
  const base = `${ex.idx}-${ex.slug}`
  const fenceLen = Math.max(3, maxRun(ex.carve, '`') + 1, maxRun(ex.html, '`') + 1)
  const fence = '`'.repeat(fenceLen)
  const body = [
    ex.section,
    '',
    fence,
    ex.carve,
    '.',
    ex.html,
    fence,
    '',
  ].join('\n')
  writeFileSync(resolve(specDir, `${base}.test`), body)
}
console.log(`Wrote ${examples.length} .test files to ${specDir}`)
