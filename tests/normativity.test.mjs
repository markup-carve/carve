/*
 * Normativity-consistency checks.
 *
 * Enforces the single-source-of-truth policy declared in
 * resources/grammar.ebnf:
 *   - grammar.ebnf is normative; PART 9 holds the semantic constraints
 *   - syntax.md / edge-cases.md are explanatory and must say so
 *   - every "PART 9 §N" reference across the docs must resolve to a
 *     real PART 9 section (no dangling normative cross-references)
 *
 * Run by the same `node --test` invocation as the corpus suite.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const grammarPath = resolve(repo, 'resources/grammar.ebnf')
const grammar = readFileSync(grammarPath, 'utf8')

// PART 9 is the last PART; collect its section numbers from the
// "   N. TITLE" headings that follow the PART 9 banner.
const part9 = grammar.slice(grammar.indexOf('PART 9: SEMANTIC CONSTRAINTS'))
const part9Sections = new Set(
  [...part9.matchAll(/^ {3}(\d+)\. {1,3}[A-Z]/gm)].map((m) => Number(m[1])),
)

const docFiles = [
  ...readdirSync(resolve(repo, 'docs'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => resolve(repo, 'docs', f)),
  ...readdirSync(resolve(repo, 'docs/case-study'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => resolve(repo, 'docs/case-study', f)),
]

test('grammar.ebnf declares the normativity policy', () => {
  assert.match(grammar, /\bNORMATIVITY\b/)
  assert.match(grammar, /NORMATIVE specification of\s+Carve/)
})

test('PART 9 has at least the known semantic-constraint sections', () => {
  // Sanity: parsing worked and found a plausible set.
  assert.ok(part9Sections.size >= 8, `found sections: ${[...part9Sections]}`)
})

test('every "PART 9 §N" reference resolves to a real section', () => {
  // Match a whole citation group so multi-section shorthand like
  // "PART 9 §1, §9 and §10" is fully validated, not just the first.
  const citation = /PART 9 §\d+(?:\s*(?:,|&|and|or|to|–|-)?\s*§\d+)*/g
  const dangling = []
  for (const file of docFiles) {
    const text = readFileSync(file, 'utf8')
    for (const group of text.match(citation) ?? []) {
      for (const sm of group.matchAll(/§(\d+)/g)) {
        const n = Number(sm[1])
        if (!part9Sections.has(n)) dangling.push(`${file}: PART 9 §${n}`)
      }
    }
  }
  assert.deepEqual(
    dangling,
    [],
    `dangling normative references (valid: §${[...part9Sections].sort((a, b) => a - b).join(', §')}):\n${dangling.join('\n')}`,
  )
})

test('explanatory docs carry the non-normative banner', () => {
  for (const rel of ['docs/case-study/syntax.md', 'docs/edge-cases.md']) {
    const text = readFileSync(resolve(repo, rel), 'utf8')
    assert.match(text, /\*\*Non-normative\.\*\*/, `${rel} missing banner`)
    assert.match(text, /grammar\.ebnf/, `${rel} must point to the grammar`)
  }
})

test('the conformance contract exists and is non-empty', () => {
  assert.ok(existsSync(resolve(repo, 'docs/examples.md')))
  for (const name of ['core', 'extensions', 'edge-cases']) {
    assert.ok(
      existsSync(resolve(repo, `docs/examples/${name}.md`)),
      `docs/examples/${name}.md (corpus source) is missing`,
    )
  }
  const crv = readdirSync(resolve(repo, 'tests/corpus')).filter((f) =>
    f.endsWith('.crv'),
  )
  assert.ok(crv.length > 0, 'tests/corpus has no .crv fixtures')
})

// markdown-it-container (used by the docs `::: compare` blocks in VitePress)
// pre-scans for its closing marker and does NOT skip code fences, so a `:::`
// inside an example body closes the container early and the rest of the block
// leaks as literal text. Guard: every `compare` container's colon marker must
// be LONGER than the longest `:`-run anywhere in its body.
test('every ::: compare container marker exceeds its body colon-run (VitePress render safety)', () => {
  // The compare blocks live in docs/examples/{core,extensions,edge-cases}.md
  // (the corpus source). Scan all of them, not the examples.md index.
  const exampleFiles = ['core', 'extensions', 'edge-cases']
  const lines = exampleFiles.flatMap((name) =>
    readFileSync(resolve(repo, `docs/examples/${name}.md`), 'utf8').split('\n'),
  )
  const fenceRe = /^(`{3,}|~{3,})/
  const offenders = []
  for (let i = 0; i < lines.length; i++) {
    const open = /^(:{3,})\s+compare(\s+\S.*)?$/.exec(lines[i].trim())
    if (!open) continue
    const marker = open[1]
    let fence = null
    let maxBody = 0
    let j = i + 1
    for (; j < lines.length; j++) {
      const l = lines[j]
      if (fence) {
        if (l.startsWith(fence) && l.slice(fence.length).trim() === '') fence = null
        const m = /^(:{3,})/.exec(l)
        if (m) maxBody = Math.max(maxBody, m[1].length)
        continue
      }
      const fm = fenceRe.exec(l)
      if (fm) { fence = fm[1]; continue }
      if (l.trim() === marker) break // matching closer
      const m = /^(:{3,})/.exec(l)
      if (m) maxBody = Math.max(maxBody, m[1].length)
    }
    if (marker.length <= maxBody) {
      offenders.push(`line ${i + 1}: container '${marker}' (${marker.length}) <= body colon-run ${maxBody}`)
    }
  }
  assert.equal(
    offenders.length,
    0,
    `compare containers that would break the VitePress render:\n${offenders.join('\n')}`,
  )
})
