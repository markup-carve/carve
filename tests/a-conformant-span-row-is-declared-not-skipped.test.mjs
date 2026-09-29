/*
 * THE ONE ROW KIND THE SPAN LEDGER CANNOT OWE, AND THE HATCH THAT SAYS SO.
 *
 * `resources/ast-span-divergence.txt` is `owed`: release mode requires it empty,
 * because a span disagreement is normally one engine placing a node wrongly and
 * the row leaves when that engine is fixed. PART 12 §4's `INDENT_LATITUDE` makes
 * one kind of row different: where two readings differ only inside a line's
 * leading indentation and the node is a container, BOTH are conformant
 * (carve#1928). No engine owes such a row, nothing will ever close it, and an
 * owed-must-be-empty gate therefore cannot be satisfied while one is measured.
 *
 * `.ast-span-exempt` declares those rows, in the shape `.fleet-pin-exempt` uses.
 * The hazard is not that the hatch exists but that it becomes a blanket skip, so
 * every assertion below is paired with its opposite: a declared row stops being
 * owed, and a row that declares nothing, names nothing, or no longer reproduces
 * still fails. The shipped file is checked against the live ledger here too, so
 * a line cannot outlive the reading it describes.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const script = resolve(repo, 'scripts/declaration-audit.mjs')

process.env.CARVE_DECL_AUDIT_LIB = '1'
const { __internals } = await import('../scripts/declaration-audit.mjs')
const { spanRowKey, spanExemptions, MANIFEST } = __internals

/** Parse an exemption body without touching the repository's own file. */
function parse(body) {
  const root = mkdtempSync(join(tmpdir(), 'span-exempt-'))
  const file = join(root, 'ast-span-exempt')
  try {
    writeFileSync(file, body)
    process.env.AST_SPAN_EXEMPT_FILE = file
    return spanExemptions()
  } finally {
    delete process.env.AST_SPAN_EXEMPT_FILE
    rmSync(root, { recursive: true, force: true })
  }
}

/** The whole audit, reading an exemption body of this test's choosing. */
function audit(body) {
  const root = mkdtempSync(join(tmpdir(), 'span-exempt-run-'))
  const file = join(root, 'ast-span-exempt')
  try {
    const env = { ...process.env }
    delete env.CARVE_DECL_AUDIT_LIB
    if (body !== null) {
      writeFileSync(file, body)
      env.AST_SPAN_EXEMPT_FILE = file
    }
    const result = spawnSync(process.execPath, [script, '--mode=release', '--ref', 'worktree', '--no-fetch'], {
      encoding: 'utf8',
      env,
      maxBuffer: 64 * 1024 * 1024,
    })
    return { status: result.status, out: `${result.stdout}${result.stderr}` }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const ledgerRows = () =>
  readFileSync(resolve(repo, 'resources/ast-span-divergence.txt'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))

const twinRows = () => {
  const src = readFileSync(resolve(repo, 'tests/ast-spans.test.mjs'), 'utf8')
  // Spelled without the `const` keyword: the undeclared-constant sweep in
  // scripts/declaration-audit.mjs reads string literals too, and `const
  // LAST_MEASURED` written here would report this file as an undeclared list.
  const at = src.indexOf('LAST_MEASURED = new Map')
  assert.ok(at !== -1, 'tests/ast-spans.test.mjs no longer declares LAST_MEASURED')
  return src
    .slice(at, src.indexOf('])', at))
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('['))
}

/* ------------------------------------------------ the shipped declarations */

test('every shipped declaration parses and names what makes the reading conformant', () => {
  process.env.AST_SPAN_EXEMPT_FILE = resolve(repo, '.ast-span-exempt')
  try {
    const { rows, errors } = spanExemptions()
    assert.deepEqual(errors, [], 'the shipped .ast-span-exempt does not parse')
    assert.ok(rows.length > 0, 'nothing is declared; delete this hatch rather than leaving it empty')
    for (const row of rows) {
      assert.match(
        row.reason,
        /[\w.-]+\/[\w.-]+#\d+|\bCARVE-P\d+-\d+\b/,
        `'${row.key}' cites no clause and no fully qualified owner/repo#N`,
      )
    }
  } finally {
    delete process.env.AST_SPAN_EXEMPT_FILE
  }
})

test('every shipped declaration still describes a live row, in the ledger and in its twin', () => {
  // The staleness half, and the reason the count is part of the key: a line
  // keyed on the type alone would outlive its reading and silence the next one.
  process.env.AST_SPAN_EXEMPT_FILE = resolve(repo, '.ast-span-exempt')
  const { rows } = spanExemptions()
  delete process.env.AST_SPAN_EXEMPT_FILE

  const ledger = new Map(ledgerRows().map((r) => [spanRowKey(r)?.key, spanRowKey(r)?.count]))
  const twin = new Map(twinRows().map((r) => [spanRowKey(r)?.key, spanRowKey(r)?.count]))
  for (const row of rows) {
    assert.equal(ledger.get(row.key), row.count, `${row.key} is not declared across ${row.count} document(s) in the ledger`)
    assert.equal(twin.get(row.key), row.count, `${row.key} is not measured across ${row.count} document(s) in LAST_MEASURED`)
  }
})

/* --------------------------------------------------------- the format rule */

test('a well-formed line is accepted, and each way of saying nothing is not', () => {
  const good = parse('list (extent)@1: containers, so markup-carve/carve#1928 makes both readings conformant\n')
  assert.deepEqual(good.errors, [])
  assert.deepEqual(
    good.rows.map((r) => [r.key, r.count]),
    [['list (extent)', 1]],
  )

  // A clause id is the other accepted reference.
  assert.deepEqual(parse('list (extent)@1: CARVE-P12-014 permits both readings\n').errors, [])

  for (const [body, pattern] of [
    ['list (extent)\n', /expected `<type> \(presence\|extent\)@<count>: <reason>`/],
    ['list (extent)@1\n', /expected `<type> \(presence\|extent\)@<count>: <reason>`/],
    ['list (extent)@1:\n', /expected `<type> \(presence\|extent\)@<count>: <reason>`/],
    ['list (extent): both are conformant under markup-carve/carve#1928\n', /expected `<type> \(presence\|extent\)@<count>/],
    ['list (extent)@1: both readings are fine\n', /names no clause and no fully qualified owner\/repo#N/],
    // `#1928` alone resolves to whichever repo the text sits in, which is the
    // accident the ledger's own reference rule exists to prevent.
    ['list (extent)@1: conformant under #1928\n', /names no clause and no fully qualified owner\/repo#N/],
  ]) {
    const { rows, errors } = parse(body)
    assert.equal(rows.length, 0, `accepted a line that declares nothing: ${body.trim()}`)
    assert.equal(errors.length, 1, body.trim())
    assert.match(errors[0], pattern)
  }
})

test('a key listed twice is an error, because one of the two reasons is discarded unread', () => {
  const { rows, errors } = parse(
    'list (extent)@1: the first reason, markup-carve/carve#1928\n' +
      'list (extent)@1: the second reason, markup-carve/carve#2426\n',
  )
  assert.equal(rows.length, 1)
  assert.equal(errors.length, 1)
  assert.match(errors[0], /is listed twice/)
})

test('a row key is read the same way in the ledger and in its measurement twin', () => {
  assert.deepEqual(spanRowKey('list (extent)  1  carve-php opens at the parent content column'), { key: 'list (extent)', count: 1 })
  assert.deepEqual(spanRowKey("['list (extent)', 1]"), { key: 'list (extent)', count: 1 })
  assert.deepEqual(spanRowKey('text (presence)  3  a reason'), { key: 'text (presence)', count: 3 })
  // Refused rather than read loosely: no count, and no kind.
  assert.equal(spanRowKey('list (extent)  a reason'), null)
  assert.equal(spanRowKey('list  1  a reason'), null)
})

/* -------------------------------------------------------- the scope of it */

test('exactly the span ledger and its twin are exemptible', () => {
  // A hatch that applied to every `owed` list would be the blanket skip this
  // file exists to rule out, so the opt-in is per manifest entry.
  assert.deepEqual(
    MANIFEST.filter((e) => e.exempt !== undefined).map((e) => [e.path, e.exempt]).sort(),
    [
      ['resources/ast-span-divergence.txt', 'ast-span'],
      ['tests/ast-spans.test.mjs', 'ast-span'],
    ].sort(),
    'a declaration list other than the span ledger and its twin became exemptible',
  )
})

/* ------------------------------------------------------ the whole audit */

test('a declared row leaves the owed count and prints, and an undeclared one stays owed', () => {
  const declared = audit(readFileSync(resolve(repo, '.ast-span-exempt'), 'utf8'))
  assert.match(declared.out, /EXEMPT - span rows declared conformant on every side/, declared.out)
  assert.match(declared.out, /list \(extent\) across 1 document\(s\): .*markup-carve\/carve#1928/)
  assert.match(declared.out, /list_item \(extent\) across 1 document\(s\)/)

  // With nothing declared the same rows are owed again, which is what keeps the
  // hatch from being the reason the gate passes.
  const nothing = audit('')
  assert.match(nothing.out, /\| list \(extent\) {2}1 {2}carve-php opens at the parent content column/, nothing.out)
  assert.match(nothing.out, /\| list_item \(extent\) {2}1 {2}carve-php opens/)
  assert.doesNotMatch(nothing.out, /EXEMPT - span rows/)

  // And the rows an engine owes are reported in both runs. Declaring the two
  // conformant rows must not pass the ledger as a whole.
  for (const { out } of [declared, nothing]) {
    assert.match(out, /\| block_quote \(extent\) {2}6 {2}carve-js ends a fenced quote/, out)
    assert.match(out, /resources\/ast-span-divergence\.txt.*<== OWED/)
  }
})

test('a declaration whose count has moved fails instead of covering the next reading', () => {
  const { status, out } = audit('list (extent)@7: containers, markup-carve/carve#1928\n')
  assert.equal(status, 1, out)
  assert.match(out, /'list \(extent\)' is declared across 1 document\(s\), not 7/)
  assert.match(out, /re-measure it or delete this line/)
})

test('a declaration for a type that no longer diverges fails', () => {
  const { status, out } = audit('table_cell (presence)@2: containers, markup-carve/carve#1928\n')
  assert.equal(status, 1, out)
  assert.match(out, /no span ledger declares 'table_cell \(presence\)' any more/)
  assert.match(out, /delete it/)
})

test('a malformed declaration fails the audit rather than being ignored', () => {
  const { status, out } = audit('list (extent)@1\n')
  assert.equal(status, 1, out)
  assert.match(out, /expected `<type> \(presence\|extent\)@<count>: <reason>`/)
})
