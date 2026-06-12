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
let compareMarker = null
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
  const compareOpen = mode === 'scanning' && /^:{3,}\s+compare$/.test(line.trim())
  if (compareOpen) {
    compareMarker = line.trim().match(/^(:{3,})/)[1]
    mode = 'in_compare'
    continue
  }
  if (mode === 'in_compare') {
    if (line.trim() === compareMarker) {
      finalizePair()
      mode = 'scanning'
      compareMarker = null
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

// Stable per-section numbering. Examples in the same section share the section
// index; their suffix increments per example within the section (omitted for the
// first example so single-example sections keep their existing filenames).
const sectionState = new Map()
let sectionCounter = 0
for (const ex of examples) {
  let state = sectionState.get(ex.section)
  if (!state) {
    sectionCounter += 1
    state = { idx: sectionCounter, count: 0 }
    sectionState.set(ex.section, state)
  }
  state.count += 1
  ex.idx = String(state.idx).padStart(2, '0')
  ex.slug = slugify(ex.section)
  ex.exampleIdx = state.count
}

for (const ex of examples) {
  const suffix = ex.exampleIdx === 1 ? '' : `-${ex.exampleIdx}`
  const base = `${ex.idx}-${ex.slug}${suffix}`
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

// One .test file per section, concatenating every example in the section.
const bySection = new Map()
for (const ex of examples) {
  if (!bySection.has(ex.section)) bySection.set(ex.section, [])
  bySection.get(ex.section).push(ex)
}

for (const [section, exs] of bySection) {
  const first = exs[0]
  const base = `${first.idx}-${first.slug}`
  const parts = [section, '']
  for (const ex of exs) {
    const fenceLen = Math.max(3, maxRun(ex.carve, '`') + 1, maxRun(ex.html, '`') + 1)
    const fence = '`'.repeat(fenceLen)
    parts.push(fence, ex.carve, '.', ex.html, fence, '')
  }
  writeFileSync(resolve(specDir, `${base}.test`), parts.join('\n'))
}
console.log(`Wrote ${bySection.size} .test files to ${specDir}`)
