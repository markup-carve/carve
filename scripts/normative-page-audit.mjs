#!/usr/bin/env node
/*
 * Check that obligations on declared normative pages have homes in the spec.
 * A page opts in with `normative: true`; resources/normative-pages.txt pins
 * the set. Each MUST or MUST NOT sentence needs a clause and an anchor in
 * resources/normative-page-obligations.txt.
 *
 * Marked tables are checked row by row against their cited clauses, including
 * rows without a MUST keyword. Each cited clause must cover at least one row.
 * The comparison uses content words and short shared prefixes. It catches
 * missing coverage but cannot prove that two sentences mean the same thing.
 * A human must review each anchor.
 *
 * The audit runs from page to spec. It does not require every spec clause to
 * appear on a page. See carve#1995 and carve#2007 for the failures this guards.
 *
 *   node scripts/normative-page-audit.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const STOP = new Set(
  ('a an the and or but if then than that this these those it its is are was were be been being of to in on'
    + ' at by for with from as not no any all each every some one two both either neither so such which who'
    + ' whom whose what when where how why does do did has have had may might can could shall should will'
    + ' would into over under after before while during per via there here they them their also only just'
    + ' even still yet more most less least other another same own very too about across against between'
    + ' through up down out off again further once because until upon within without must').split(' '),
)

/** Content words of a fragment of either surface, markup and §-refs removed. */
export function contentWords(text) {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#|]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w))
}

/*
 * A word reaches another when they share a prefix as long as the shorter of
 * them, capped at five. That is what lets `exceeds` reach `exceeded` and
 * `calls` reach `call` without a stemmer whose rules misfire - `exceed` stemmed
 * as if `-ed` were a suffix becomes `exce`, which reaches nothing.
 */
const sharedPrefix = (a, b) => {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1
  return i
}
const reaches = (bag, word) => bag.some((other) => sharedPrefix(word, other) >= Math.min(5, word.length, other.length))

/*
 * Is one Errors-table condition stated by any of these clause texts?
 *
 * `A / B` in a condition names ALTERNATIVES: one branch has to be covered, not
 * both, or `Unreadable / missing path` would demand a clause spelling the miss
 * and the refusal with the same two words.
 */
export function conditionStated(condition, clauseTexts) {
  const branches = condition.includes('/')
    ? condition.split('/').map((part) => contentWords(part))
    : [contentWords(condition)]
  return clauseTexts.some((text) => {
    const bag = contentWords(text)
    return branches.some((branch) => branch.length && branch.every((w) => reaches(bag, w)))
  })
}

/*
 * The content words missing from the clause that comes CLOSEST, not from the
 * pool of all of them. A condition is stated by ONE clause; reporting against
 * the pool printed an empty absent-list for a condition whose words were merely
 * scattered across three, which reads like a bug in the check.
 */
export function absentWords(condition, clauseTexts) {
  const wanted = [...new Set(contentWords(condition))]
  let best = wanted
  for (const text of clauseTexts) {
    const bag = contentWords(text)
    const absent = wanted.filter((w) => !reaches(bag, w))
    if (absent.length < best.length) best = absent
  }
  return best
}

/** PART 9 sections, keyed by number, from the modules that carry CARVE-P9 ids. */
export function part9Sections() {
  const sections = new Map()
  for (const file of readdirSync(resolve(repo, 'resources/spec')).filter((n) => n.endsWith('.ebnf'))) {
    const source = readFileSync(resolve(repo, 'resources/spec', file), 'utf8')
    const heads = [...source.matchAll(/^[ \t]*(\d+)\. .*\[CARVE-P9-\d+\]/gm)]
    heads.forEach((head, index) => {
      const end = index + 1 < heads.length ? heads[index + 1].index : source.length
      sections.set(head[1], { file, text: source.slice(head.index, end) })
    })
  }
  return sections
}

/** The `I<n>` clauses inside one PART 9 section. */
export function clausesOf(sectionText) {
  const clauses = new Map()
  const marks = [...sectionText.matchAll(/^[ \t]*(I\d+a?) [A-Z(]/gm)]
  marks.forEach((mark, index) => {
    const end = index + 1 < marks.length ? marks[index + 1].index : sectionText.length
    clauses.set(mark[1], sectionText.slice(mark.index, end))
  })
  return clauses
}

/** The comparison form both surfaces reduce to: one line, case folded. */
const flatten = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase()

const normalizeSentence = (s) => s.replace(/<[^>]+>/g, '').replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim()

/** Sentences carrying an RFC-2119 MUST, fenced code excluded. */
function mustSentences(page) {
  return page
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' '))
    .split(/(?<=[.!?])\s+|\n\n+/)
    .filter((s) => /\bMUST\b/.test(s))
    .map(normalizeSentence)
}

/** A page opts in with a `normative: true` line in its frontmatter block. */
export function declaresNormative(text) {
  if (!text.startsWith('---\n')) return false
  const end = text.indexOf('\n---', 4)
  if (end === -1) return false
  return text.slice(4, end).split('\n').some((line) => line.trim() === 'normative: true')
}

const readLedger = (path) =>
  readFileSync(path, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l, i) => {
      const parts = l.split(' :: ').map((p) => p.trim())
      if (parts.length !== 4) throw new Error(`malformed ledger line ${i + 1}: ${l}`)
      return { page: parts[0], clause: parts[1], anchor: parts[2], text: parts[3] }
    })

/** The obligation tables a page marks, as { section, cited, conditions }. */
export function obligationTables(pageText) {
  return [...pageText.matchAll(/<!-- normative-obligations: PART 9 §(\d+) ((?:I\d+a?\s*)+)-->\s*\n(\|[\s\S]*?)\n\n/g)].map(
    ([, section, ids, table]) => ({
      section,
      cited: ids.trim().split(/\s+/),
      conditions: table
        .split('\n')
        .slice(2)
        .map((line) => line.split('|').filter((c) => c.trim())[0]?.trim())
        .filter(Boolean),
    }),
  )
}

export function audit() {
  const findings = []
  const notes = []

  const docs = resolve(repo, 'docs')
  const declared = readdirSync(docs)
    .filter((n) => n.endsWith('.md'))
    .filter((n) => declaresNormative(readFileSync(resolve(docs, n), 'utf8')))
    .map((n) => `docs/${n}`)
    .sort()

  const inventoryPath = resolve(repo, 'resources/normative-pages.txt')
  const inventory = readFileSync(inventoryPath, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => l.trim())
  for (const page of declared) {
    if (!inventory.includes(page)) findings.push(`${page} declares normative: true and is not in resources/normative-pages.txt`)
  }
  for (const page of inventory) {
    if (!declared.includes(page)) findings.push(`resources/normative-pages.txt lists ${page}, which no longer declares normative: true`)
  }

  const sections = part9Sections()
  const ledgerPath = resolve(repo, 'resources/normative-page-obligations.txt')
  const ledger = readLedger(ledgerPath)

  for (const page of declared) {
    const text = readFileSync(resolve(repo, page), 'utf8')

    // --- obligation tables -------------------------------------------------
    const tables = obligationTables(text)
    if (!tables.length) notes.push(`${page} declares no obligation table`)
    for (const { section: sectionNumber, cited, conditions } of tables) {
      const section = sections.get(sectionNumber)
      if (!section) {
        findings.push(`${page}: no PART 9 §${sectionNumber} in resources/spec/`)
        continue
      }
      const clauses = clausesOf(section.text)
      const missing = cited.filter((id) => !clauses.has(id))
      if (missing.length) {
        findings.push(`${page}: PART 9 §${sectionNumber} has no clause ${missing.join(', ')}`)
        continue
      }
      const texts = cited.map((id) => clauses.get(id))
      const earned = new Set()
      for (const condition of conditions) {
        if (!conditionStated(condition, texts)) {
          const absent = absentWords(condition, texts)
          findings.push(`${page}: "${condition}" is not stated in PART 9 §${sectionNumber} ${cited.join('/')} - absent: ${absent.join(' ')}`)
          continue
        }
        for (const id of cited) if (conditionStated(condition, [clauses.get(id)])) earned.add(id)
      }
      for (const id of cited) {
        if (!earned.has(id)) findings.push(`${page}: cites PART 9 §${sectionNumber} ${id}, which covers no row of that table`)
      }
    }

    // --- MUST sentences ----------------------------------------------------
    const sentences = mustSentences(text)
    const rowsForPage = ledger.filter((row) => row.page === page)
    for (const sentence of sentences) {
      const hits = rowsForPage.filter((row) => sentence.startsWith(row.text))
      // ONE ROW PER `MUST`, not per sentence. A row matches on the sentence's
      // opening words so that rewording the opening forces the row to be
      // touched - but that alone let a SECOND obligation be appended to a
      // sentence the ledger already matched, and the gate stayed green.
      const obligations = (sentence.match(/\bMUST\b/g) ?? []).length
      if (!hits.length) {
        findings.push(`${page}: obligation has no row in resources/normative-page-obligations.txt - "${sentence.slice(0, 90)}"`)
      } else if (hits.length !== obligations) {
        findings.push(
          `${page}: ${obligations} obligation(s) in one sentence, ${hits.length} ledger row(s) - "${sentence.slice(0, 60)}"`,
        )
      }
    }
    for (const row of rowsForPage) {
      if (!sentences.some((s) => s.startsWith(row.text))) {
        findings.push(`${page}: ledger row matches no obligation on the page - "${row.text.slice(0, 90)}"`)
      }
    }
  }

  for (const row of ledger) {
    if (!declared.includes(row.page)) {
      const note = `resources/normative-page-obligations.txt names ${row.page}, which is not a declared normative page`
      if (!findings.includes(note)) findings.push(note)
      continue
    }
    const cite = /^(?:WEAKER )?PART 9 §(\d+) (I\d+a?)$/.exec(row.clause)
    if (row.clause === 'UNSTATED') {
      if (row.anchor !== '-') findings.push(`resources/normative-page-obligations.txt: UNSTATED row carries an anchor - "${row.text.slice(0, 60)}"`)
      continue
    }
    if (!cite) {
      findings.push(`resources/normative-page-obligations.txt: unreadable clause "${row.clause}"`)
      continue
    }
    const section = sections.get(cite[1])
    const clause = section && clausesOf(section.text).get(cite[2])
    if (!clause) {
      findings.push(`resources/normative-page-obligations.txt cites PART 9 §${cite[1]} ${cite[2]}, which resources/spec/ does not define`)
      continue
    }
    if (row.anchor === '-') {
      findings.push(`resources/normative-page-obligations.txt cites ${row.clause} with no anchor - "${row.text.slice(0, 60)}"`)
      continue
    }
    // The anchor is what makes a clause that LOSES the obligation visible: the
    // clause id surviving says nothing about whether the sentence is still in
    // it. Whitespace collapsed and case folded, because the EBNF hard-wraps.
    if (!flatten(clause).includes(flatten(row.anchor))) {
      findings.push(`${row.page}: PART 9 §${cite[1]} ${cite[2]} no longer carries "${row.anchor}" - "${row.text.slice(0, 60)}"`)
    }
  }

  const unstated = ledger.filter((row) => row.clause === 'UNSTATED')
  const weaker = ledger.filter((row) => row.clause.startsWith('WEAKER '))
  return { declared, findings, notes, unstated, weaker, ledger }
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) {
  const { declared, findings, unstated, weaker, ledger } = audit()
  console.log(`normative pages: ${declared.join(', ') || '(none)'}`)
  console.log(`obligations ledger: ${ledger.length} row(s), ${unstated.length} UNSTATED, ${weaker.length} WEAKER`)
  for (const row of [...unstated, ...weaker]) console.log(`  DECLARED GAP  ${row.clause} :: ${row.text}`)
  if (findings.length) {
    console.log(`\nNORMATIVE PAGE AUDIT FAILED - ${findings.length} finding(s):`)
    for (const f of findings) console.log(`  ${f}`)
    process.exit(1)
  }
  console.log('\nevery obligation on a declared normative page names a clause that exists')
}
