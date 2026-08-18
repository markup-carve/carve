/*
 * Normativity-consistency checks.
 *
 * Enforces the single-source-of-truth policy declared in
 * resources/grammar.ebnf:
 *   - grammar.ebnf is normative; PART 9 holds the semantic constraints
 *   - syntax.md / parsing-ambiguities.md are explanatory and must say so
 *   - every "PART 9 §N" reference across the docs must resolve to a
 *     real PART 9 section (no dangling normative cross-references)
 *
 * Run by the same `node --test` invocation as the corpus suite.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractNormativeClauses, readInventory } from '../scripts/normative-clauses.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const grammarPath = resolve(repo, 'resources/grammar.ebnf')
const grammar = readFileSync(grammarPath, 'utf8')

// Every PART's section labels, keyed by PART number, read from the
// "  N. TITLE" headings that follow each PART banner.
//
// A heading qualifies only when its TITLE OPENS IN CAPS, and that is a
// discriminator rather than decoration: PART 8 carries two numbered lists that
// are PRECEDENCE ORDERS, not sections - "1. Frontmatter (--- delimited at
// document start)", "1. Escaped characters (\x)" - written in sentence case,
// numbered 1..11 and 1..13 in the same PART, and never cited as "PART 8 §N".
// Counting those as sections would make the uniqueness check below fail on a
// document that is correct.
const opensInCaps = (title) => {
  const words = title.match(/[A-Za-z]+/g) ?? []
  if (words.length === 0) return false
  const upper = (w) => w === w.toUpperCase()
  // "TIGHT vs LOOSE LISTS" qualifies on its first word; "A `+` CONTINUATION
  // EXTENDS" has a one-letter first word, so the second word carries the caps.
  return upper(words[0]) && (words[0].length >= 2 || (words[1] !== undefined && upper(words[1])))
}

const sectionsByPart = () => {
  const parts = new Map()
  let part = null
  for (const line of grammar.split('\n')) {
    const banner = /^\s*PART (\d+):/.exec(line)
    if (banner) {
      part = Number(banner[1])
      if (!parts.has(part)) parts.set(part, [])
      continue
    }
    if (part === null) continue
    // The label field is right-aligned, so "   8." and "  10h." both occur.
    const m = /^ {1,4}(\d+[a-z]?)\. {1,3}(\S.*)$/.exec(line)
    if (m && opensInCaps(m[2])) parts.get(part).push(m[1])
  }
  return parts
}

const partSections = sectionsByPart()
const sectionSet = (n) => new Set(partSections.get(n) ?? [])
const part9Sections = sectionSet(9)
const part12Sections = sectionSet(12)

// Pages whose bare "§N" citations mean PART 12.
const part12Pages = ['docs/ast-json.md']

const docFiles = [
  ...readdirSync(resolve(repo, 'docs'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => resolve(repo, 'docs', f)),
  ...readdirSync(resolve(repo, 'docs/case-study'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => resolve(repo, 'docs/case-study', f)),
]

// Everything that can carry a normative citation. The docs are not the only
// place one lands: one mistyped PART number sat in a test, a script, the
// corpus README and the changelog for weeks - five copies of the same wrong
// citation - because the gate looked at docs/ only (carve#1365). A walk rather
// than a list, so a new page is covered the day it is written.
//
// This scan reads its own source too, so a citation written here as an EXAMPLE
// would be reported as a defect. Name a bad citation in prose, never spell it.
const CITABLE = /\.(md|mjs|js|json|txt|ebnf)$/

/*
 * The files the repository actually owns, from git rather than from a directory
 * walk with a skip list.
 *
 * A walk has to name what to leave out, and this one left in the BUILD OUTPUT.
 * `docs/.vitepress/dist` is gitignored and holds every page's prose re-emitted
 * into JS chunks, 464 of them citable by the pattern below, so a local
 * `npm run docs:build` followed by `npm test` scans a second, derived copy of
 * the docs - and a dist left over from an older tree reports labels that page
 * no longer carries. CI has no dist, so it stays green there and nobody sees
 * it. A gate that fails for a reason unrelated to the tree under test teaches a
 * developer to skip it (carve#1373).
 *
 * Tracked-or-not is the line that was wanted, git already knows it, and
 * `tests/json-holds-utf8.test.mjs` reached the same answer for the same reason.
 * It also keeps the local run and CI looking at exactly the same set, which a
 * skip list cannot promise: `docs/examples/`, `docs/public/ast-schema.json` and
 * `docs/.vitepress/generated-examples.json` are generated too, and each is a
 * copy of prose that is already scanned at its source.
 *
 * The breadth carve#1365 asked for is unaffected: a citation in a test, a
 * script, the corpus README or the changelog is tracked. The test below pins
 * that this list still reaches all four.
 */
const citationSources = execFileSync('git', ['ls-files', '-z'], { cwd: repo, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .filter((rel) => CITABLE.test(rel) && rel !== 'package-lock.json')
  // The corpus holds ~1200 documents whose .md/.txt/.json bodies are rendered
  // CONTENT, not prose about the grammar. Its README is prose.
  .filter((rel) => !rel.startsWith('tests/corpus/') || rel === 'tests/corpus/README.md')
  .map((rel) => resolve(repo, rel))

test('the citation scan reaches every kind of file that can carry one', () => {
  const rels = new Set(citationSources.map((file) => file.slice(repo.length + 1)))
  // One mistyped PART number sat in a test, a script, the corpus README and the
  // changelog for weeks - five copies of the same wrong citation - because the
  // gate looked at docs/ only (carve#1365). Narrowing the list to tracked files
  // must not quietly narrow it back to that.
  for (const rel of [
    'docs/security.md',
    'resources/grammar.ebnf',
    'tests/normativity.test.mjs',
    'scripts/normative-clauses.mjs',
    'tests/corpus/README.md',
    'CHANGELOG.md',
  ]) {
    assert.ok(rels.has(rel), `${rel} is not in the citation scan`)
  }
  assert.ok(rels.size >= 200, `the citation scan reaches only ${rels.size} files`)
  // And nothing generated: build output re-emits prose that is already scanned
  // at its source, and reports its own staleness as a defect in the tree.
  for (const rel of rels) {
    assert.ok(
      !rel.startsWith('docs/.vitepress/dist/') && !rel.startsWith('docs/examples/'),
      `${rel} is build output, not the tree under test`,
    )
  }
})

test('grammar.ebnf declares the normativity policy', () => {
  assert.match(grammar, /\bNORMATIVITY\b/)
  assert.match(grammar, /NORMATIVE specification of\s+Carve/)
})

test('the section index finds a plausible set for every sectioned PART', () => {
  // Sanity: parsing worked. A floor per PART, so a regex that silently stopped
  // matching shows up here rather than as a citation test that passes because
  // it has nothing left to check.
  for (const [part, floor] of [
    [2, 3],
    [9, 8],
    [10, 8],
    [11, 20],
    [12, 6],
  ]) {
    assert.ok(
      sectionSet(part).size >= floor,
      `PART ${part} scan found only: ${[...sectionSet(part)]}`,
    )
  }
  // PART 8's numbered lists are precedence orders, not sections. If this ever
  // trips, opensInCaps has stopped discriminating and the uniqueness check
  // below is about to report a collision that is not one.
  assert.deepEqual([...sectionSet(8)], [], 'PART 8 has no cited sections')
})

test("every PART's section labels are unique", () => {
  // PART 11 carried two sections labelled §8b for a week: a citation to
  // "PART 11 §8b" named either of them and nothing failed, because the only
  // citation gates looked at PART 9 and PART 12 (carve#1365).
  const collisions = []
  for (const [part, labels] of partSections) {
    const seen = new Set()
    for (const label of labels) {
      if (seen.has(label)) collisions.push(`PART ${part} §${label}`)
      seen.add(label)
    }
  }
  assert.deepEqual(
    collisions,
    [],
    `duplicate section labels - a citation to one of these resolves to either clause:\n${collisions.join('\n')}`,
  )
})

// Both spellings are in use: "PART 12 §3a" and "PART 12 section 3a". A citation
// GROUP is matched whole, so multi-section shorthand reaches every clause it
// names and not only the first: "PART 9 §1, §9 and §10", "PART 12 §1-2".
const CLAUSE = String.raw`\d+[a-z]?`
const citationGroup = (lead) =>
  new RegExp(`${lead}(${CLAUSE})((?:\\s*(?:,|&|and|or|to|–|-)\\s*§?${CLAUSE})*)`, 'g')

const scanGroups = (text, lead, onHit) => {
  for (const m of text.matchAll(citationGroup(lead))) {
    onHit(m[1])
    for (const t of m[2].matchAll(new RegExp(`§?(${CLAUSE})`, 'g'))) onHit(t[1])
  }
}

// The PART NUMBER is read from the citation, never iterated over the parts the
// grammar happens to have. Building one pattern per known part would skip a
// citation into a part number that does not exist at all, and one into a part
// that exists but has no sections - PART 8, whose numbered lists are precedence
// orders - which is the same hole one size up from the one this closes.
const QUALIFIED_CITATION = new RegExp(
  `PART (\\d+) (?:§|section )(${CLAUSE})((?:\\s*(?:,|&|and|or|to|–|-)\\s*§?${CLAUSE})*)`,
  'g',
)

test('every "PART N §M" citation resolves to a real section', () => {
  const dangling = []
  for (const file of citationSources) {
    if (!existsSync(file)) continue
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(QUALIFIED_CITATION)) {
      const part = Number(m[1])
      const valid = sectionSet(part)
      const check = (id) => {
        if (!valid.has(id)) dangling.push(`${file}: PART ${part} §${id}`)
      }
      check(m[2])
      for (const t of m[3].matchAll(new RegExp(`§?(${CLAUSE})`, 'g'))) check(t[1])
    }
  }
  assert.deepEqual(
    dangling,
    [],
    `citations that name no clause. A label that was RETIRED rather than\n` +
      `mistyped - PART 11's withdrawn 10d, carve#1213 - is not written as a\n` +
      `citation at all: describe the clause instead, so this stays a list of\n` +
      `defects:\n${dangling.join('\n')}`,
  )
})

// A clause can be deleted from the grammar without a single test noticing:
// the corpus compares HTML, and a normative sentence about the wire format or
// about how a marker degrades has no corpus document behind it. That is how
// PART 12 §3a and §7, §1a's merge rule and MARKER REQUIRES CONTENT's `::`
// extension left the file in one merge while the docs kept citing them.
//
// The inventory does not decide what the grammar SHOULD say. It only makes a
// removal explicit: delete the clause and the test is red until the line goes
// too, in the same commit, where a reviewer sees both halves.
// The count matters, not just the heading: `ATTRIBUTES -- NORMATIVE` heads two
// separate clauses, and a guard that deduped them would stay green when one of
// the pair was deleted.
test('the grammar carries exactly the clauses the normative inventory names', () => {
  const inventory = readInventory(
    readFileSync(resolve(repo, 'resources/normative-clauses.txt'), 'utf8'),
  )
  assert.ok(inventory.length >= 60, `inventory looks truncated: ${inventory.length} entries`)

  const present = new Map(extractNormativeClauses(grammar))
  const drifted = []
  for (const [clause, expected] of inventory) {
    const actual = present.get(clause) ?? 0
    if (actual < expected) drifted.push(`${clause}: inventory says ${expected}, grammar has ${actual}`)
  }
  assert.deepEqual(
    drifted,
    [],
    `normative clauses named in resources/normative-clauses.txt but missing from grammar.ebnf.\n` +
      `If the removal is deliberate, adjust the line there in the same commit:\n` +
      drifted.map((m) => `  ${m}`).join('\n'),
  )
})

test('the normative inventory names every clause in the grammar', () => {
  const inventory = new Map(
    readInventory(readFileSync(resolve(repo, 'resources/normative-clauses.txt'), 'utf8')),
  )
  const unlisted = []
  for (const [clause, actual] of extractNormativeClauses(grammar)) {
    const expected = inventory.get(clause) ?? 0
    if (actual > expected) unlisted.push(`${clause}: grammar has ${actual}, inventory says ${expected}`)
  }
  assert.deepEqual(
    unlisted,
    [],
    `new normative clauses not in the inventory - run: node scripts/normative-clauses.mjs\n` +
      unlisted.map((m) => `  ${m}`).join('\n'),
  )
})

// The §3a case: eight references across the docs, the AST schema and the
// changelog went on pointing at a clause that was no longer in the file. The
// qualified spelling is covered by the generic citation test above; this is the
// BARE "(§3a)" form, which is only unambiguous on the pages that are ABOUT
// PART 12 - elsewhere a bare §N means PART 9.
test('every bare PART 12 clause reference resolves to a real clause', () => {
  const dangling = []
  for (const file of citationSources) {
    if (!part12Pages.some((page) => file.endsWith(page))) continue
    const text = readFileSync(file, 'utf8')
    scanGroups(text, '§', (id) => {
      if (!part12Sections.has(id)) dangling.push(`${file}: §${id}`)
    })
  }
  assert.deepEqual(
    dangling,
    [],
    `references to PART 12 clauses that do not exist (valid: ${[...part12Sections].join(', ')}):\n${dangling.join('\n')}`,
  )
})

test('explanatory docs carry the non-normative banner', () => {
  for (const rel of ['docs/case-study/syntax.md', 'docs/parsing-ambiguities.md']) {
    const text = readFileSync(resolve(repo, rel), 'utf8')
    assert.match(text, /\*\*Non-normative\.\*\*/, `${rel} missing banner`)
    assert.match(text, /grammar\.ebnf/, `${rel} must point to the grammar`)
  }
})

test('the conformance contract exists and is non-empty', () => {
  assert.ok(existsSync(resolve(repo, 'docs/examples.md')))
  for (const name of ['core', 'extensions', 'edge-cases']) {
    assert.ok(
      existsSync(resolve(repo, `resources/examples/${name}.md`)),
      `resources/examples/${name}.md (corpus source) is missing`,
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
  // The compare blocks live in resources/examples/{core,extensions,edge-cases}.md
  // (the corpus source). Scan all of them, not the examples.md index.
  const exampleFiles = ['core', 'extensions', 'edge-cases']
  const lines = exampleFiles.flatMap((name) =>
    readFileSync(resolve(repo, `resources/examples/${name}.md`), 'utf8').split('\n'),
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

/*
 * A MASS DELETION HAS TO FAIL SOMETHING.
 *
 * `resources/normative-clauses.txt` is regenerated FROM the grammar, so the
 * inventory check above compares a file with its own derivative: delete a
 * clause, regenerate, and the two agree about a smaller language. That is the
 * shape carve#755 collects - a check that cannot fail for the case it looks
 * like it covers.
 *
 * It was not hypothetical. A python slice with a wrong end marker removed PART
 * 11 and its §§1-10a - about 950 lines, ~12% of the normative text, including
 * the formatter invariants and the Markdown and plain target rules - and the
 * suite stayed green at 1993 pass, 0 fail. codex review found it; nothing here
 * did (carve#1163).
 *
 * These two rows are what the inventory cannot be: a floor that does not move
 * when the grammar shrinks, and a structural fact about the document that a
 * regenerate cannot restate.
 */

/** Every PART the grammar declares, as `PART <n>` in a heading line. */
const PART_HEADINGS = [...grammar.matchAll(/^\s*PART (\d+):/gm)].map((m) => Number(m[1]))

test('every PART heading is present exactly once', () => {
  // The one-line check that would have caught the deletion outright. PART 11
  // vanished entirely, and no assertion anywhere noticed the document had lost
  // a whole numbered division.
  const expected = Array.from({ length: 13 }, (_, i) => i) // PART 0 through 12
  const missing = expected.filter((n) => !PART_HEADINGS.includes(n))
  assert.deepEqual(
    missing,
    [],
    `grammar.ebnf is missing PART heading(s): ${missing.map((n) => `PART ${n}`).join(', ')}. ` +
      'A PART cannot be removed silently - if a division was deliberately retired, ' +
      'update the expected range here in the same commit.',
  )

  const duplicated = PART_HEADINGS.filter((n, i) => PART_HEADINGS.indexOf(n) !== i)
  assert.deepEqual(
    duplicated,
    [],
    `duplicate PART heading(s): ${duplicated.map((n) => `PART ${n}`).join(', ')}`,
  )
})

test('the normative inventory does not fall below its floor', () => {
  // A FLOOR, not an exact count: clauses are added often and a count would be a
  // chore on every addition, while a floor only speaks when the language SHRINKS
  // sharply. Set a little under today's total, so the ordinary drift of one or
  // two deliberate removals passes and a mass deletion does not.
  //
  // Raise it when the inventory has grown well past it. Lowering it is the
  // thing to argue for in review, because that is what a silent deletion needs.
  const FLOOR = 138
  const clauses = extractNormativeClauses(grammar)
  assert.ok(
    clauses.length >= FLOOR,
    `the grammar declares ${clauses.length} normative clauses, below the floor of ${FLOOR}. ` +
      'The inventory is regenerated from the grammar, so it agrees with a smaller ' +
      'language and cannot report this on its own (carve#1163). If clauses were ' +
      'removed deliberately, lower the floor in the same commit and say why.',
  )
})
