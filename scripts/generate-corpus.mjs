#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync, renameSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const examplesDir = resolve(repoRoot, 'docs/examples')
const outDir = resolve(repoRoot, 'tests/corpus')

// The example pairs live in docs/examples/{core,extensions,edge-cases}.md.
// Read them in a fixed tier order so corpus numbering is deterministic across
// machines and CI (readdir order is filesystem-dependent).
const exampleFiles = ['core', 'extensions', 'edge-cases']
const src = exampleFiles
  .map((name) => readFileSync(resolve(examplesDir, `${name}.md`), 'utf8'))
  .join('\n')
const lines = src.split('\n')

const examples = []
let currentSection = null
let mode = 'scanning'
let pendingBlocks = { carve: null, html: null }
let currentLang = null
let fenceMarker = null
let compareMarker = null
let blockLines = []
const seenTitles = new Set()
let comparesOpened = 0
let compareOpenLine = 0
const dropped = []

const finalizePair = () => {
  if (currentSection && pendingBlocks.carve && pendingBlocks.html) {
    examples.push({ section: currentSection, carve: pendingBlocks.carve, html: pendingBlocks.html })
  } else if (currentSection) {
    // A compare block that closed without BOTH a carve and an html fence would
    // otherwise vanish from the corpus with no signal (the observability
    // lesson). Record it so the run can fail loudly below.
    const miss = [!pendingBlocks.carve && 'carve', !pendingBlocks.html && 'html']
      .filter(Boolean)
      .join(' + ')
    dropped.push(`line ${compareOpenLine} (section "${currentSection}"): missing ${miss} fence`)
  }
  pendingBlocks = { carve: null, html: null }
}

for (let li = 0; li < lines.length; li++) {
  const line = lines[li]
  const h2 = line.match(/^##\s+(.+?)\s*$/)
  if (h2 && mode === 'scanning') {
    currentSection = h2[1]
    // Section numbering keys on the title, so two files sharing a title would
    // silently merge their examples into one numbered section.
    if (seenTitles.has(currentSection)) {
      console.error(`generate-corpus: duplicate section title "${currentSection}" across example files - numbering would merge them.`)
      process.exit(1)
    }
    seenTitles.add(currentSection)
    pendingBlocks = { carve: null, html: null }
    continue
  }
  // Accept `::: compare` plus optional modifiers like `::: compare no-render`
  // (a docs-only rendering hint); the pair is still part of the corpus.
  const compareOpen = mode === 'scanning' && /^:{3,}\s+compare(\s+\S.*)?$/.test(line.trim())
  if (compareOpen) {
    compareMarker = line.trim().match(/^(:{3,})/)[1]
    comparesOpened++
    compareOpenLine = li + 1
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

// Reconcile: every opened compare block must have produced a pair. A silent
// gap here means a broken example dropped out of the conformance corpus.
if (dropped.length) {
  console.error(`generate-corpus: ${dropped.length} ::: compare block(s) produced no corpus pair:`)
  for (const d of dropped) console.error(`  - ${d}`)
  process.exit(1)
}
if (comparesOpened !== examples.length) {
  console.error(
    `generate-corpus: ${comparesOpened} compare blocks opened but ${examples.length} pairs written (unclosed block?).`,
  )
  process.exit(1)
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

// --- APPEND-ONLY NUMBERING (guard) -----------------------------------------
//
// A category's number is its POSITION among the example sections, so inserting
// a section in the middle of a file renumbers every section after it. The
// filenames are the cross-impl contract: each engine allowlists categories by
// `NN-slug`, so a renumber silently invalidates every one of those lists at
// once and reads downstream as "105 categories missing" with no hint of the
// cause. It has happened.
//
// So: a section that already has a number keeps it. New sections may only take
// numbers above the current maximum, which is what appending a section does
// naturally. A deliberate renumber is still possible, with CORPUS_RENUMBER=1
// and the knowledge that every engine's allowlist has to move with it.
// `outDir` may not exist yet (a fresh generate, or after `rm -rf tests/corpus`),
// and scanning it must not be the thing that fails.
mkdirSync(outDir, { recursive: true })
const existingNumbers = new Map()
for (const f of readdirSync(outDir)) {
  if (!f.endsWith('.crv')) continue
  const m = /^(\d+)-(.*?)(?:-\d+)?\.crv$/.exec(f)
  if (m) existingNumbers.set(m[2], m[1])
}

if (existingNumbers.size > 0 && process.env['CORPUS_RENUMBER'] !== '1') {
  // One entry per CATEGORY: a section with several examples would otherwise
  // report its move once per example.
  const moved = new Map()
  let highestKept = 0
  for (const ex of examples) {
    const before = existingNumbers.get(ex.slug)
    if (before === undefined) continue
    if (before !== ex.idx) moved.set(ex.slug, `${before}-${ex.slug} -> ${ex.idx}-${ex.slug}`)
    highestKept = Math.max(highestKept, Number(before))
  }
  const addedTooLow = new Map()
  for (const ex of examples) {
    if (existingNumbers.has(ex.slug)) continue
    if (Number(ex.idx) < highestKept) addedTooLow.set(ex.slug, `${ex.idx}-${ex.slug}`)
  }
  // A category that DISAPPEARS breaks the same allowlists a renumber does - a
  // removed section, or a renamed one, which is a removal plus an addition. The
  // engines do notice (carve-rs reports an IMPLEMENTED entry with no pair), but
  // they notice a repo away and a bump later.
  const present = new Set(examples.map((ex) => ex.slug))
  const removed = [...existingNumbers]
    .filter(([slug]) => !present.has(slug))
    .map(([slug, idx]) => `${idx}-${slug}`)

  if (moved.size || addedTooLow.size || removed.length) {
    console.error('generate-corpus: the corpus numbering is APPEND-ONLY.\n')
    if (moved.size) {
      console.error(`  ${moved.size} existing categor${moved.size === 1 ? 'y' : 'ies'} would be renumbered:`)
      for (const line of [...moved.values()].slice(0, 10)) console.error(`    ${line}`)
      if (moved.size > 10) console.error(`    … and ${moved.size - 10} more`)
      console.error('')
    }
    if (addedTooLow.size) {
      console.error(`  ${addedTooLow.size} new categor${addedTooLow.size === 1 ? 'y' : 'ies'} would land below the highest existing number:`)
      for (const line of [...addedTooLow.values()].slice(0, 10)) console.error(`    ${line}`)
      console.error('')
    }
    if (removed.length) {
      console.error(`  ${removed.length} existing categor${removed.length === 1 ? 'y is' : 'ies are'} gone from the examples:`)
      for (const line of removed.slice(0, 10)) console.error(`    ${line}`)
      if (removed.length > 10) console.error(`    … and ${removed.length - 10} more`)
      console.error('')
    }
    console.error('  Every engine allowlists categories by `NN-slug`, so this invalidates')
    console.error('  all of those lists at once. Move the new section to the END of the last')
    console.error('  examples file (docs/examples/edge-cases.md) instead.')
    console.error('')
    console.error('  If the renumber is deliberate, re-run with CORPUS_RENUMBER=1 and update')
    console.error('  every engine allowlist in the same change.')
    process.exit(1)
  }
}

mkdirSync(outDir, { recursive: true })

/*
 * SIDECAR FIXTURES MOVE WITH THEIR CASE.
 *
 * A case may pin a non-HTML target by adding the file beside it - `NN-slug.fmt`,
 * `NN-slug.md` - and those files are HAND-WRITTEN, so this script has always
 * left them alone. That is right until a renumber: inserting a case shifts every
 * number after it, the regenerated pair lands under the new number, and the
 * sidecar keeps the old one. It is then an expected output with no input beside
 * it, pinning nothing.
 *
 * tests/corpus-targets.test.mjs reports that, which is how it was noticed - but
 * a check that fires after every insertion, on files the author of the insertion
 * did not write, is a chore rather than a finding. The rename is mechanical and
 * belongs here, where the old and new numbers for a slug are both known.
 */
const sidecarsBySlug = new Map()
for (const f of readdirSync(outDir)) {
  const ext = f.slice(f.lastIndexOf('.'))
  if (ext === '.crv' || ext === '.html') continue
  const m = /^\d+-(.*)$/.exec(f.slice(0, -ext.length))
  if (!m) continue
  sidecarsBySlug.set(m[1] + ext, { from: f, ext, slug: m[1] })
}

for (const f of readdirSync(outDir)) {
  if (f.endsWith('.crv') || f.endsWith('.html')) unlinkSync(resolve(outDir, f))
}

const renamedSidecars = []
for (const ex of examples) {
  const suffix = ex.exampleIdx === 1 ? '' : `-${ex.exampleIdx}`
  const slug = `${ex.slug}${suffix}`
  for (const [key, sidecar] of sidecarsBySlug) {
    if (sidecar.slug !== slug) continue
    const to = `${ex.idx}-${slug}${sidecar.ext}`
    if (to === sidecar.from) continue
    renameSync(resolve(outDir, sidecar.from), resolve(outDir, to))
    renamedSidecars.push(`${sidecar.from} -> ${to}`)
    sidecarsBySlug.delete(key)
  }
}

for (const ex of examples) {
  const suffix = ex.exampleIdx === 1 ? '' : `-${ex.exampleIdx}`
  const base = `${ex.idx}-${ex.slug}${suffix}`
  writeFileSync(resolve(outDir, `${base}.crv`), ex.carve + '\n')
  writeFileSync(resolve(outDir, `${base}.html`), ex.html + '\n')
  console.log(`  ${base}.{crv,html}`)
}
console.log(`\nWrote ${examples.length} pairs to ${outDir}`)
for (const moved of renamedSidecars) console.log(`  moved with its case: ${moved}`)

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
