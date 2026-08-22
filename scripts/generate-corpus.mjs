#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync, renameSync, unlinkSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { shortfall } from './spec/participants.mjs'
import { numberExamples, readExampleFiles, scanExampleSource } from './lib/example-sections.mjs'
import { censusComparePairs } from './lib/example-pair-census.mjs'
import { displacedExamples, parseCorpusName } from './lib/example-displacement.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const outDir = resolve(repoRoot, 'tests/corpus')

// The example pairs live in resources/examples/{core,extensions,edge-cases}.md.
// Read them in a fixed tier order so corpus numbering is deterministic across
// machines and CI (readdir order is filesystem-dependent).
const src = readExampleFiles(repoRoot)
const lines = src.split('\n')

/*
 * BYTES THE EXAMPLE SOURCE CANNOT HOLD.
 *
 * A corpus pair is generated from resources/examples/*.md, which is ordinary
 * reviewable Markdown: `.gitattributes` protects `tests/corpus/**` from
 * line-ending normalization but says nothing about the examples, and this
 * script splits the source on '\n'. So a document whose SUBJECT is its line
 * endings cannot be written literally there - a CRLF example file would put a
 * stray CR at the end of every line in the file, and a lone CR would be
 * invisible in review and one editor save from vanishing.
 *
 * These modifiers apply the byte transform when the fixture is written. The
 * example stays readable, and the .crv - which IS protected - carries the real
 * bytes (carve#872).
 *
 * `nul` is the same problem one step worse. A U+0000 in the example source
 * would make git call resources/examples/edge-cases.md BINARY - no diff for
 * the whole 26,000-line file, on every future review of any example in it -
 * and it is invisible in an editor besides. So the example writes U+2400
 * SYMBOL FOR NULL, which is exactly as reviewable as the character it stands
 * for is not, and this transform substitutes the real byte (carve#1523).
 */
const KNOWN_MODIFIERS = new Set(['no-render', 'crlf', 'cr', 'bom', 'nul'])

// Byte transforms, applied to the .crv in this order. The expected HTML is
// unaffected: the point of each pair is that the document means the same thing
// however its lines end.
const applyModifiers = (carve, modifiers) => {
  let out = carve
  if (modifiers.has('crlf')) out = out.replace(/\n/g, '\r\n')
  if (modifiers.has('cr')) out = out.replace(/\n/g, '\r')
  if (modifiers.has('bom')) out = '\ufeff' + out
  // U+2400 SYMBOL FOR NULL stands in for the byte in the example source; the
  // fixture gets the byte. A `nul` block whose carve side holds no placeholder
  // would write an ordinary document and assert nothing, so that is an error
  // rather than a no-op - the same reasoning as the unknown-modifier check.
  if (modifiers.has('nul')) {
    if (!out.includes('\u2400')) {
      console.error('generate-corpus: a `::: compare nul` block carries no U+2400 SYMBOL FOR NULL.')
      console.error('  That placeholder is what becomes the byte, so the fixture would be written')
      console.error('  with ordinary characters and would pin nothing it claims to.')
      process.exit(1)
    }
    out = out.replace(/\u2400/g, '\u0000')
  }
  return out
}
let scan
try {
  scan = scanExampleSource(lines, {
    validateModifiers(modifiers, line) {
      for (const mod of modifiers) {
        if (!KNOWN_MODIFIERS.has(mod)) {
          console.error(`generate-corpus: line ${line}: unknown ::: compare modifier "${mod}".`)
          console.error(`  Known: ${[...KNOWN_MODIFIERS].join(', ')}`)
          console.error('  A typo here would otherwise be read as "no modifier" and the pair')
          console.error('  would be written with ordinary bytes, testing nothing it claims to.')
          process.exit(1)
        }
      }
    },
  })
} catch (error) {
  console.error(`generate-corpus: ${error.message}`)
  process.exit(1)
}
const { examples, comparesOpened, dropped } = scan

// Reconcile: every opened compare block must have produced a pair. A silent
// gap here means a broken example dropped out of the conformance corpus.
if (dropped.length) {
  console.error(`generate-corpus: ${dropped.length} ::: compare block(s) produced no corpus pair:`)
  for (const d of dropped) console.error(`  - ${d}`)
  process.exit(1)
}
/*
 * RECONCILE AGAINST THE SOURCE, NOT AGAINST THE EXTRACTION.
 *
 * The check that used to stand here compared `comparesOpened` with
 * `examples.length`, and both are produced by the same scan: one `::: compare`
 * opened, one pair written, `1 === 1`, green - however many pairs the author
 * actually wrote inside that block. A block holding four pairs kept one and
 * exited 0 (carve#1373).
 *
 * `censusComparePairs` counts the same source through a separate
 * implementation that shares no code with the scanner, so the two numbers can
 * disagree. Per block, so a shortfall names the block that lost the document
 * rather than reporting a total that is one too low.
 */
const census = censusComparePairs(lines)
const extractedByBlock = new Map()
for (const ex of examples) {
  extractedByBlock.set(ex.compareLine, (extractedByBlock.get(ex.compareLine) ?? 0) + 1)
}

const censusProblems = []
let declaredPairs = 0
for (const block of census) {
  if (block.unclosed) {
    censusProblems.push(`line ${block.line}: \`${block.marker} compare\` is never closed.`)
    continue
  }
  if (block.carve !== block.html) {
    censusProblems.push(
      `line ${block.line}: ${block.carve} carve fence(s) but ${block.html} html fence(s) - a pair needs both.`,
    )
    continue
  }
  declaredPairs += block.carve
  const extracted = extractedByBlock.get(block.line) ?? 0
  if (extracted !== block.carve) {
    censusProblems.push(
      `line ${block.line}: the source declares ${block.carve} pair(s), the extraction produced ${extracted}.`,
    )
  }
}
if (census.length !== comparesOpened) {
  censusProblems.push(
    `${census.length} compare block(s) in the source, ${comparesOpened} seen by the extractor.`,
  )
}
if (censusProblems.length) {
  console.error('generate-corpus: the extraction does not match the example source:')
  for (const p of censusProblems) console.error(`  - ${p}`)
  console.error('')
  console.error('  A pair the source declares and the corpus does not hold is a document no')
  console.error('  engine is ever held to. Fix the source, or the extraction, before writing.')
  process.exit(1)
}

/*
 * The `dropped` check above still compares the extraction against ITSELF, so it
 * is 0 === 0 on an empty read and reports a clean run having produced nothing.
 * Measured rather than reasoned: with the three example files emptied AND
 * tests/corpus cleared, this script printed "Wrote 0 pairs" and exited 0
 * (carve#755). The census does not close that either - an empty source declares
 * nothing, and nothing is what it gets.
 *
 * The renumber guard below does catch a partial loss - but only while
 * tests/corpus still holds the previous generation to compare against, which is
 * the shape carve#755 names as a gate that stops working once nothing is there
 * to compare. `rm -rf tests/corpus && npm run corpus:build` is an ordinary way
 * to clear stale artifacts and is exactly the state it cannot see.
 *
 * So the floor is absolute. The corpus is append-only - a category is removed
 * only under CORPUS_RENUMBER=1 - so this number never needs lowering, and it
 * sits far enough below today's count that no single category crosses it.
 */
const CORPUS_FLOOR = 700
const thin = shortfall({
  label: 'EXAMPLES',
  actual: examples.length,
  atLeast: CORPUS_FLOOR,
  of: 'example pair(s)',
  hint: 'resources/examples/{core,extensions,edge-cases}.md is where they come from; ' +
    'an extraction that reached fewer of them writes a corpus every downstream ' +
    'floor is happy with.',
})
if (thin) {
  console.error(`generate-corpus: ${thin}`)
  process.exit(1)
}

// Stable per-section numbering. Examples in the same section share the section
// index; their suffix increments per example within the section (omitted for the
// first example so single-example sections keep their existing filenames).
numberExamples(scan)

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
// The same read also keeps each example's INPUT BYTES, which is the only thing
// that identifies a document inside a section: see scripts/lib/example-displacement.mjs.
const existingExamples = []
// `NN-slug-K` cannot be split without knowing which slugs exist: a section
// headed `## Version 2` owns `NN-version-2` outright. The source is what knows.
const sourceSlugs = new Set(examples.map((ex) => ex.slug))
for (const f of readdirSync(outDir)) {
  if (!f.endsWith('.crv')) continue
  const row = parseCorpusName(f.slice(0, -'.crv'.length), sourceSlugs)
  if (!row) continue
  existingNumbers.set(row.slug, row.idx)
  existingExamples.push({
    ...row,
    hash: createHash('sha256').update(readFileSync(resolve(outDir, f))).digest('hex'),
  })
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

  // A section's EXAMPLE SUFFIXES are append-only for the same reason its
  // category number is, and nothing above can see them: inserting a pair
  // mid-section keeps every category where it is and shifts the documents
  // after the insertion point, carrying their hand-written sidecars onto
  // whatever now holds the old name (carve#1536).
  const displaced = displacedExamples(
    existingExamples,
    examples.map((ex) => ({
      name: ex.corpusName,
      slug: ex.slug,
      suffix: ex.exampleIdx,
      hash: createHash('sha256')
        .update(applyModifiers(ex.carve + '\n', ex.modifiers))
        .digest('hex'),
    })),
  )

  if (moved.size || addedTooLow.size || removed.length || displaced.length) {
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
    if (displaced.length) {
      console.error(`  ${displaced.length} existing example${displaced.length === 1 ? '' : 's'} would be renumbered INSIDE ${displaced.length === 1 ? 'its' : 'their'} section:`)
      for (const { from, to } of displaced.slice(0, 10)) console.error(`    ${from} -> ${to}`)
      if (displaced.length > 10) console.error(`    … and ${displaced.length - 10} more`)
      console.error('')
      console.error('    Those documents keep their bytes and change their number, which is what')
      console.error('    inserting a pair MID-SECTION does. A hand-written sidecar follows its')
      console.error('    case by slug, so it would land on the document that took the old name.')
      console.error('    Add the new pair at the END of its section instead (carve#1536).')
      console.error('')
    }
    console.error('  Every engine allowlists categories by `NN-slug`, so this invalidates')
    console.error('  all of those lists at once. Move the new section to the END of the last')
    console.error('  examples file (resources/examples/edge-cases.md) instead.')
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
  writeFileSync(resolve(outDir, `${base}.crv`), applyModifiers(ex.carve + '\n', ex.modifiers))
  writeFileSync(resolve(outDir, `${base}.html`), ex.html + '\n')
  console.log(`  ${base}.{crv,html}`)
}
console.log(`\nWrote ${examples.length} pairs to ${outDir}`)
for (const moved of renamedSidecars) console.log(`  moved with its case: ${moved}`)

/*
 * AND RECONCILE THE DISK AGAINST THE SOURCE.
 *
 * The check above compares the extraction with the census. This one compares
 * what is actually on disk with the census, which is the only place a loss
 * BETWEEN extraction and file - a name two examples collide on, a write that
 * did not happen - can be seen at all. It is also the check the author of
 * category 360 performed by hand, which is how carve#1373 was found: counting
 * generated files against cases written.
 */
const written = readdirSync(outDir)
const crvCount = written.filter((f) => f.endsWith('.crv')).length
const htmlCount = written.filter((f) => f.endsWith('.html')).length
if (crvCount !== declaredPairs || htmlCount !== declaredPairs) {
  console.error(
    `generate-corpus: the source declares ${declaredPairs} pair(s) but tests/corpus holds ` +
      `${crvCount} .crv and ${htmlCount} .html.`,
  )
  console.error('  Two cases sharing a generated name would read as one, and the other is gone.')
  process.exit(1)
}

/*
 * A SIDECAR HAS TO BE RE-DERIVED WHEN ITS CASE'S CONTENT MOVES.
 *
 * The rename handling above carries a hand-written sidecar across a RENUMBER.
 * What it cannot see is the other way a sidecar goes stale: the case keeps its
 * number and its slug, and its INPUT is rewritten. The sidecar then still
 * exists, still sits beside a `.crv`, and describes a different document.
 *
 * Nothing in this repository can tell by rendering, because a non-HTML target
 * needs an engine and the suite here does not run one. So `45-inline-extensions-9.txt`
 * kept the plain text of the abbr/time document it used to be (`CSS Noon x`) for
 * four commits after carve#1162 replaced the case with a `kbd` one, and the only
 * thing that noticed was a carve-js pin bump - a red suite in another repo, on a
 * change that had nothing to do with it (carve#1165).
 *
 * The lock file closes that: it records the `.crv` each sidecar was derived
 * against. `tests/corpus-targets.test.mjs` compares, and a case whose input moved
 * without its sidecar moving fails HERE, in the commit that moved it.
 */
const sidecarLock = {}
for (const f of readdirSync(outDir).sort()) {
  const ext = f.slice(f.lastIndexOf('.'))
  if (ext === '.crv' || ext === '.html') continue
  const crv = resolve(outDir, `${f.slice(0, -ext.length)}.crv`)
  if (!existsSync(crv)) continue
  sidecarLock[f] = createHash('sha256').update(readFileSync(crv)).digest('hex').slice(0, 16)
}
// In `resources/`, not beside the cases: `tests/corpus` holds inputs and
// expected outputs, and its own extension check refuses anything else - which
// is how the first attempt to park it there was caught.
writeFileSync(
  resolve(repoRoot, 'resources/corpus-sidecars.lock.json'),
  JSON.stringify(sidecarLock, null, 2) + '\n',
)
console.log(`  locked ${Object.keys(sidecarLock).length} sidecar(s) to their case input`)

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
//
// A case whose bytes were transformed is LEFT OUT, for two reasons depending on
// the transform. This format delimits its pairs by LINES, so a document whose
// line endings are the subject would be re-split by the reader and arrive as
// something else. And a `nul` case would put a U+0000 into a concatenated file
// holding every other case in its section, making that file binary for every
// downstream runner that reads it - the byte belongs in a fixture of its own,
// which tests/corpus already is. Skipping is stated rather than silent: a case
// that quietly vanished from a downstream runner is the shape this repo has
// been bitten by before.
const mirrored = examples.filter((ex) => ex.modifiers.size === 0 || (ex.modifiers.size === 1 && ex.modifiers.has('no-render')))
const notMirrored = examples.filter((ex) => !mirrored.includes(ex))
const bySection = new Map()
for (const ex of mirrored) {
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
for (const ex of notMirrored) {
  // Name the transform. The reason used to read "line-ending bytes are the
  // case" for every skipped case, which stopped being true the moment a second
  // kind of transform existed (carve#1523).
  const why = [...ex.modifiers].filter((m) => m !== 'no-render').join(', ')
  console.log(`  not mirrored (transformed bytes are the case: ${why}): ${ex.idx}-${ex.slug}`)
}
