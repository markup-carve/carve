/*
 * The conformance table on docs/ast-json.md, parsed.
 *
 * That table is a MEASUREMENT written down in prose - one row per engine, a
 * shape column and a positions column - and measured state rots. It has been
 * found wrong four times: carve#673 (a definition-list gap carve-rs had fixed),
 * carve#674 (the §3a rows, wrong in the opposite direction), a §7 row describing
 * a node no engine produces, and carve#965, which is why this file exists.
 *
 * `tests/ast-json-claims.test.mjs` measured the carve-js row against the pinned
 * engine and declared the other two rows out of scope, on the stated grounds
 * that `scripts/ast-conformance.mjs` measured them nightly. It does not. It
 * never opens the page - every mention of the filename in scripts/ is a pointer
 * inside a comment or an advice string. So two of the three rows were handed to
 * a checker that never took the job, and the carve-rs row rotted in exactly the
 * direction the one-engine test was written to catch.
 *
 * WHAT THIS COMPARES A ROW TO. Not a live satellite: this repo has one engine,
 * the `@markup-carve/carve` pin, and a checker that needs three checkouts to run
 * is a checker that does not run. It compares each row to the LEDGERS this repo
 * already commits and already gates:
 *
 *   resources/ast-position-waivers.txt - per engine, per document, per node
 *   type, every position finding, each either `permitted` (§4 exempts it) or an
 *   issue that owes a fix. `npm run ast:check` reconciles it against the three
 *   engines and fails in three directions, including the FIXED direction that
 *   deletes a stale line.
 *
 *   resources/ast-value-divergence.txt - the fields the three publish different
 *   values for, with the issue tracking each.
 *
 * Those files ARE the recorded measurement of the satellites, refreshed by the
 * run that drives them. A row that contradicts one of them is a row describing
 * a state the fleet has left. Per carve#966 this module is not the authority on
 * what the page should say: it reports where the page and the committed ledger
 * disagree, and the ledger is the one that was measured.
 */

/** A markdown table row split on unescaped pipes, outer cells dropped. */
const cellsOf = (line) =>
  line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim())

const SEPARATOR = /^\|[\s:|-]+\|$/

/**
 * The `## Conformance status` table.
 *
 * Located by its header row rather than by offset, and an absent or reshaped
 * table is an error rather than an empty result - a parser that returns zero
 * rows for a table it failed to find turns every row assertion below into a
 * check that cannot fail, which is the family of defect this file is part of.
 */
export function parseConformanceTable(page) {
  const lines = page.split('\n')
  const header = lines.findIndex((line) => line.trim() === '| engine | shape | positions |')
  if (header === -1) {
    throw new Error(
      'docs/ast-json.md has no `| engine | shape | positions |` header; the conformance table ' +
        'was renamed or reshaped, and every row check below is measuring nothing until this is updated',
    )
  }
  if (!SEPARATOR.test(lines[header + 1].trim())) {
    throw new Error(`docs/ast-json.md:${header + 2} is not a table separator; the table shape changed`)
  }

  const rows = []
  for (let i = header + 2; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (!line.startsWith('|')) break
    const cells = cellsOf(line)
    if (cells.length !== 3) {
      throw new Error(`docs/ast-json.md:${i + 1} has ${cells.length} cells, expected 3 (engine, shape, positions)`)
    }
    const [engineCell, shape, positions] = cells
    rows.push({
      lineNo: i + 1,
      engineCell,
      engines: engineCell.split('/').map((name) => name.trim()),
      shape,
      positions,
    })
  }
  if (rows.length === 0) throw new Error('the conformance table has a header and no rows')

  return rows
}

/**
 * Every issue a piece of text cites, as `owner/repo#N`.
 *
 * All three spellings in play: a markdown link to the issue URL, the fully
 * qualified `markup-carve/carve-rs#716` a ledger status uses, and the bare
 * `carve-php#510` the prose uses. Normalized to one, so a row cannot dodge the
 * check by changing how it writes the same reference.
 */
export function citedIssues(text) {
  const found = new Set()
  for (const m of text.matchAll(/https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/(?:issues|pull)\/(\d+)/g)) {
    found.add(`${m[1]}/${m[2]}#${m[3]}`)
  }
  for (const m of text.matchAll(/([\w.-]+)\/([\w.-]+)#(\d+)/g)) {
    found.add(`${m[1]}/${m[2]}#${m[3]}`)
  }
  for (const m of text.matchAll(/(?<![\w/-])(carve(?:-[a-z]+)?)#(\d+)/g)) {
    found.add(`markup-carve/${m[1]}#${m[2]}`)
  }

  return found
}

/** A ledger's declaration lines - its comments carry the history, not the debt. */
export const declarationLines = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))

/**
 * The issues this repo currently DECLARES as open engine debt.
 *
 * Declaration lines only. A ledger's comment block narrates what was deleted
 * and when - `carve-rs#716`, `carve-php#965` and four others are named there as
 * closed - and reading the comments would let a row cite an issue precisely
 * because the debt behind it was retired. That is the failure this whole file
 * is about, so the set is built from the live lines.
 */
export function declaredDebt({ waivers, values }) {
  const found = new Set()
  for (const line of declarationLines(waivers)) {
    const status = line.split(/\s+/)[4]
    if (status && status !== 'permitted') for (const issue of citedIssues(status)) found.add(issue)
  }
  for (const line of declarationLines(values)) for (const issue of citedIssues(line)) found.add(issue)

  return found
}
