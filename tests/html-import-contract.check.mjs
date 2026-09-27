import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { test } from 'node:test'
import Ajv2020 from 'ajv/dist/2020.js'
import { fileURLToPath } from 'node:url'
import { parseDriftLedger } from '../scripts/lib/drift-ledger.mjs'
import './binding-contract.check-helper.mjs'
import './html-import-construct-coverage.check-helper.mjs'
import './import-roundtrip-ratchets.check-helper.mjs'
import { carveToCarve, carveToHtml, htmlToCarve } from '@markup-carve/carve'

const root = new URL('./html-import/', import.meta.url)
const migrationReportSchema = JSON.parse(await readFile(new URL('../resources/migration-report-schema.json', import.meta.url), 'utf8'))
const validateMigrationReport = new Ajv2020().compile(migrationReportSchema)

test('every HTML import fixture publishes all four contract files', async () => {
  const fixtures = await readdir(root, { withFileTypes: true })
  assert.ok(fixtures.length > 0)
  for (const fixture of fixtures.filter((entry) => entry.isDirectory())) {
    const names = new Set(await readdir(new URL(`${fixture.name}/`, root)))
    names.delete('options.json')
    assert.deepEqual([...names].sort(), ['expected.ast.json', 'expected.crv', 'expected.report.json', 'input.html'])
    for (const json of ['expected.ast.json', 'expected.report.json']) {
      JSON.parse(await readFile(new URL(`${fixture.name}/${json}`, root), 'utf8'))
    }
  }
})

test('the contract fixture table has one row per fixture directory', async () => {
  const doc = await readFile(new URL('../docs/html-import-contract.md', import.meta.url), 'utf8')
  const lines = doc.split('\n')
  const start = lines.indexOf('| fixture | subject |')
  assert.ok(start >= 0, 'fixture table header not found in docs/html-import-contract.md')
  const rows = []
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) break
    const name = /^\| `([^`]+)` \|/.exec(line)
    assert.ok(name, `fixture table row does not open with a backticked directory: ${line}`)
    rows.push(name[1])
  }
  const dirs = (await readdir(root, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)
  const listed = new Set(rows)
  assert.deepEqual(rows.filter((name, i) => rows.indexOf(name) !== i), [], 'fixture rows listed twice')
  assert.deepEqual(dirs.filter((name) => !listed.has(name)).sort(), [], 'fixture directories with no row in the contract table')
  assert.deepEqual(rows.filter((name) => !dirs.includes(name)).sort(), [], 'contract table rows naming no fixture directory')
})

/*
 * Codes the two oracles below cannot reach, and why (carve#1835).
 *
 * Both directions are checked, so this map is the only way a declared code
 * passes with nothing producing it - and an entry a run starts producing fails
 * too. One code is left, and it is the unreachable-by-construction kind rather
 * than the not-covered-yet kind: the two that had producers no shared case
 * exercised are both covered now, by fixture (`table-degraded`) and by corpus
 * row (`attribute-preserved`, which the corpus oracle reaches in `roundtrip`).
 */
const NOT_COVERED_HERE = {
  'diagnostics-truncated':
    'unreachable here by construction: a cap marker rather than a loss at a place. "Resource limits" makes it a MAY - carve-rs emits it, carve-js and carve-php throw a typed error instead - and neither oracle sets a cap',
}

async function fixtureCodes() {
  const codes = new Set()
  for (const fixture of await readdir(root, { withFileTypes: true })) {
    if (!fixture.isDirectory()) continue
    const report = JSON.parse(await readFile(new URL(`${fixture.name}/expected.report.json`, root), 'utf8'))
    for (const diagnostic of report.diagnostics) codes.add(diagnostic.code)
  }
  return codes
}

/*
 * THE SECOND ORACLE, and the reason the first one alone would not do.
 *
 * The shared fixture set is deliberately small - one subject per directory -
 * so five live codes have no fixture and would read as orphans. The corpus
 * rendered and re-imported through the pinned build reaches them, which is the
 * same population `import-roundtrip-ratchets` already walks.
 */
async function corpusCodes() {
  const corpus = new URL('./corpus/', import.meta.url)
  const codes = new Set()
  for (const name of (await readdir(corpus)).filter((file) => file.endsWith('.crv'))) {
    const canonical = carveToCarve(await readFile(new URL(name, corpus), 'utf8'))
    const html = carveToHtml(canonical)
    for (const mode of ['safe', 'semantic', 'roundtrip']) {
      try {
        for (const d of htmlToCarve(html, { mode }).report.diagnostics) codes.add(d.code)
      } catch {
        // A document the importer refuses says nothing about the vocabulary.
      }
    }
  }
  return codes
}

const declaredCodes = async () =>
  JSON.parse(await readFile(new URL('../resources/html-import-schema.json', import.meta.url), 'utf8'))
    .properties.diagnostics.items.properties.code.enum

test('the report schema and fixture vocabulary agree', async () => {
  const allowed = new Set(await declaredCodes())
  for (const code of await fixtureCodes()) assert.ok(allowed.has(code), code)
})

/*
 * The one field a fixture may not state (carve#2454).
 *
 * A diagnostic's sentence is the engine's own, so PART 11 §1d does not compare
 * it. The comparison below compares every field a fixture DOES state, which is
 * what keeps `path` and `severity` from going quiet again - and that rule would
 * quietly re-introduce a message comparison the moment a fixture carried one.
 * So the exception lives here, on the fixtures, rather than as a name the
 * matcher skips.
 */
test('no fixture states a diagnostic message', async () => {
  const offenders = []
  for (const fixture of await readdir(root, { withFileTypes: true })) {
    if (!fixture.isDirectory()) continue
    const report = JSON.parse(await readFile(new URL(`${fixture.name}/expected.report.json`, root), 'utf8'))
    for (const [i, row] of (report.diagnostics ?? []).entries()) {
      if ('message' in row) offenders.push(`${fixture.name} row #${i}`)
    }
  }
  assert.deepEqual(
    offenders.sort(),
    [],
    `fixture row(s) state a diagnostic message: ${offenders.join(', ')}. The sentence is the ` +
      "engine's and is not compared (PART 11 §1d, carve#2454) - delete the field.",
  )
})

/*
 * THE OTHER DIRECTION, which is the one that was missing (carve#1835).
 *
 * `structure-split` sat in the enum after the shape that produced it was
 * spelled away, and every gate stayed green: the check above asks whether a
 * fixture's code is declared, and nothing asked whether a declared code is
 * produced. That is a promise to a consumer - a `case` on a code no import can
 * emit reads as live and is dead - and it is the question
 * tests/schema-fields-are-produced.test.mjs already asks one level down, for
 * AST fields.
 */
test('every declared diagnostic code is produced, or named as not covered here', async () => {
  const produced = new Set([...(await fixtureCodes()), ...(await corpusCodes())])
  const orphans = (await declaredCodes())
    .filter((code) => !produced.has(code) && !(code in NOT_COVERED_HERE))
    .sort()

  assert.deepEqual(
    orphans,
    [],
    `code(s) the schema declares that nothing here produces: ${orphans.join(', ')}. ` +
      'Either a case is missing, or the code describes something no importer can emit. ' +
      'Add a fixture or a corpus document, or name it in NOT_COVERED_HERE with the reason.',
  )
})

test('every not-covered exemption is still needed', async () => {
  const produced = new Set([...(await fixtureCodes()), ...(await corpusCodes())])
  const stale = Object.keys(NOT_COVERED_HERE).filter((code) => produced.has(code)).sort()

  assert.deepEqual(
    stale,
    [],
    `NOT_COVERED_HERE names code(s) something now produces: ${stale.join(', ')}. ` +
      'Delete the entry so the code is gated like every other one.',
  )
})

test('every not-covered exemption names a code the schema still declares', async () => {
  const declared = new Set(await declaredCodes())
  const unknown = Object.keys(NOT_COVERED_HERE).filter((code) => !declared.has(code)).sort()

  assert.deepEqual(unknown, [], `NOT_COVERED_HERE names retired code(s): ${unknown.join(', ')}.`)
})

/*
 * THE FIXED-POINT CLAIM, CHECKED (markup-carve/carve#1286).
 *
 * docs/html-import-contract.md says every `expected.crv` here is also a fixed point of
 * `carve fmt` in all three engines, "because source comparison is byte-exact"
 * - a fixture that is not one pins source no writer produces, and the first
 * engine to run its formatter over it disagrees. Nothing read that claim.
 *
 * It is also the only thing in this repository that reads the BYTES of an
 * `expected.crv` at all: the two checks above count files and vocabulary, so a
 * fixture could be edited to say anything and stay green here until an engine
 * ran it. The formatter is the one reader available on this side.
 */
test('every expected.crv is a fixed point of the canonical writer', async () => {
  const { carveToCarve } = await import('@markup-carve/carve')
  const fixtures = (await readdir(root, { withFileTypes: true })).filter((e) => e.isDirectory())
  assert.ok(fixtures.length > 0)
  for (const fixture of fixtures) {
    const src = await readFile(new URL(`${fixture.name}/expected.crv`, root), 'utf8')
    assert.equal(
      carveToCarve(src),
      src,
      `tests/html-import/${fixture.name}/expected.crv is not what the writer emits for it, ` +
        `so it pins source no engine's formatter produces (docs/html-import-contract.md, ` +
        `"Conformance fixtures"). Rewrite the fixture in canonical form.`,
    )
  }
})

/*
 * THE FIXTURES, RUN (markup-carve/carve#1286).
 *
 * Everything above this line counts files, validates JSON and checks a writer
 * property. None of it reads a fixture as an IMPORT: `input.html` and the three
 * expectations beside it could disagree completely and this file would stay
 * green, because its only reader was an engine in another repository. That is
 * how two block-level shapes could be handled three different ways for as long
 * as they were.
 *
 * So the fixtures run here too, through the `@markup-carve/carve` build
 * package.json pins. Comparison follows what docs/html-import-contract.md promises
 * implementations: source is byte-exact, AST ignores key order and absent
 * optional fields, and a diagnostic object is a MINIMUM match.
 *
 * PIN LAG IS DECLARED, never tolerated - the same rule as
 * resources/engine-pin-drift.txt, and it fails in both directions. A fixture
 * that disagrees and is not listed is red; a listed fixture that now agrees is
 * red too, so the line goes out with the pin bump that fixed it.
 */
const pinLag = parseDriftLedger(fileURLToPath(new URL('../resources/html-import-pin-drift.txt', import.meta.url)))

/*
 * A DIAGNOSTIC is a pattern: the page calls diagnostic objects MINIMUM matches,
 * because an implementation may add optional location fields. Everything else
 * is compared whole - a subset match on the AST would accept any field the
 * fixture does not mention, and a stray `attrs` or a `shortCaption` that
 * changes no source is exactly the kind of thing worth failing on.
 */
const subsetOf = (expected, actual, path = '') => {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return `${path}: expected an array`
    if (expected.length !== actual.length) {
      return `${path}: expected ${expected.length} item(s), got ${actual.length}`
    }
    for (let i = 0; i < expected.length; i++) {
      const miss = subsetOf(expected[i], actual[i], `${path}[${i}]`)
      if (miss) return miss
    }
    return null
  }
  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) {
      return `${path}: expected an object`
    }
    for (const [key, value] of Object.entries(expected)) {
      if (!(key in actual)) return `${path}.${key}: missing`
      const miss = subsetOf(value, actual[key], `${path}.${key}`)
      if (miss) return miss
    }
    return null
  }
  return expected === actual ? null : `${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
}

/*
 * The AST is compared WHOLE, modulo the two things the page says to ignore:
 * key order, which deepStrictEqual already ignores, and the source-location
 * fields, which are absent from every fixture here by construction and are a
 * property of the input rather than of the import.
 *
 * THE ENGINE SIDE IS PUBLISHED FIRST (markup-carve/carve#1616). A fixture
 * records the PART 12 shape, which is what the contract page is a statement
 * about and what an implementation in another language is measured against. An
 * engine's INTERNAL tree is a different object - it spells a definition-list
 * entry as `{terms, definitions}` rather than as the `definition_term` and
 * `definition_description` nodes §8 publishes, and it hangs footnote
 * definitions off the root that §7 fixes at three fields. Comparing the fixture
 * against it pins one implementation's internals as the portable minimum.
 */
const LOCATION_FIELDS = new Set(['pos', 'srcByteLength'])
const withoutLocations = (value) => {
  if (Array.isArray(value)) return value.map(withoutLocations)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !LOCATION_FIELDS.has(key))
      .map(([key, v]) => [key, withoutLocations(v)]),
  )
}
const astDiff = (expected, actual) => {
  try {
    assert.deepStrictEqual(withoutLocations(actual), withoutLocations(expected))
    return null
  } catch (error) {
    return `expected.ast.json: ${error.message.split('\n')[0]}`
  }
}

/*
 * The fixture's rows are a SUBSEQUENCE of the report's, not an element-for-element
 * match (carve#1884).
 *
 * How many rows one loss takes is engine-defined: a table whose `<thead>` sits
 * between two `<tbody>` runs is one degradation, and an importer may say so in
 * one row or in one row per distinct loss. Both are the same code at the same
 * place. What a fixture pins is which losses are reported and in what order, so
 * an engine may SPLIT a row and may not invent a code, drop one, or reorder. A
 * split stays a match under the field rule below, because its copies report the
 * same code at the same place.
 */
function withoutDiagnostics(report) {
  const { diagnostics: _ignored, ...rest } = report
  return rest
}

/*
 * A fixture row is a PATTERN: every field it states is compared, and a field it
 * omits is the engine's to choose. Which is the minimum match the page promises
 * - an implementation may add optional location fields - but the set is
 * deliberately not a list of names, because the two comparisons here named
 * `code` only, so `path` and `severity` went uncompared although all 87 fixture
 * rows state a severity and 78 state a path. A fixture whose row moved to
 * another element stayed green here and reached three engines before one
 * objected (carve#2472). Under this rule a field a fixture starts stating is
 * compared from that moment rather than silently ignored.
 *
 * `message` is the exception, and the only one: the sentence is the engine's and
 * is not compared (PART 11 §1d, carve#2454). It is skipped here AND refused on
 * the fixtures above, so the ruling holds however a row is authored.
 */
const UNCOMPARED = new Set(['message'])
const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const misfitFields = (pattern, row) =>
  Object.keys(pattern).filter((field) => !UNCOMPARED.has(field) && !sameValue(pattern[field], row[field]))
const showRow = (row) => JSON.stringify(Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'message')))

function diagnosticSubsequence(expected, actual, label) {
  const wanted = expected.diagnostics ?? []
  const got = actual.diagnostics ?? []

  for (const [i, pattern] of wanted.entries()) {
    if (got.some((row) => misfitFields(pattern, row).length === 0)) continue
    const nearest = got.find((row) => row.code === pattern.code)
    const why = nearest
      ? `the nearest row with that code is ${showRow(nearest)}, differing on ${misfitFields(pattern, nearest).join(', ')}`
      : 'no row carries that code at all'
    return `${label}: fixture row #${i} ${showRow(pattern)} matches no row of the report - ${why}`
  }

  /*
   * An ADDED row is judged on its code alone, and deliberately not on the whole
   * pattern. The page's rule is that "every row the report adds must carry a
   * code the fixture already names", because how many rows one loss takes is
   * engine-defined. Pattern-matching this too would refuse a second row at
   * another place - which the contract permits and which tightening it here
   * would decide by test rather than by ruling. Every fixture passes either way
   * at the current pin; the narrower rule is the documented one.
   */
  const named = new Set(wanted.map(({ code }) => code))
  const unexpected = got.filter(({ code }) => !named.has(code))
  if (unexpected.length) {
    return `${label}: report adds code(s) the fixture does not name: ${unexpected.map(({ code }) => code).join(', ')}`
  }

  let at = 0
  for (const row of got) if (at < wanted.length && misfitFields(wanted[at], row).length === 0) at++
  return at === wanted.length
    ? null
    : `${label}: fixture row #${at} ${showRow(wanted[at])} is not reached in order by the report's rows [${got.map(showRow).join(' | ')}]`
}

const diagnosticsMatch = (expected, actual) => diagnosticSubsequence(expected, actual, 'expected.report.json')
const fidelityDiagnosticsMatch = (expected, actual) => diagnosticSubsequence(expected, actual, 'migration report')

/*
 * The import options a fixture names in `options.json`, by their JavaScript
 * names. Only the options docs/html-import-contract.md lists for fixtures are
 * accepted, so a fixture cannot reach a mode or an adapter this way.
 */
const FIXTURE_OPTIONS = new Set(['listTableForBlockCells'])
async function fixtureOptions(name) {
  let text
  try {
    text = await readFile(new URL(`${name}/options.json`, root), 'utf8')
  } catch {
    return {}
  }
  const options = JSON.parse(text)
  for (const key of Object.keys(options)) {
    assert.ok(FIXTURE_OPTIONS.has(key), `tests/html-import/${name}/options.json names ${key}, which no fixture may set`)
  }
  return options
}

test('the pinned build imports every fixture the way the fixture says', async () => {
  const { htmlToCarve, htmlToAst, migrateHtml, toAstJson } = await import('@markup-carve/carve')
  const fixtures = (await readdir(root, { withFileTypes: true })).filter((e) => e.isDirectory())
  assert.ok(fixtures.length > 0)
  const reproduced = []
  for (const { name } of fixtures) {
    const read = async (file) => readFile(new URL(`${name}/${file}`, root), 'utf8')
    const html = await read('input.html')
    const expectedCrv = await read('expected.crv')
    const expectedReport = JSON.parse(await read('expected.report.json'))
    const expectedAst = JSON.parse(await read('expected.ast.json'))

    const options = await fixtureOptions(name)
    const source = htmlToCarve(html, options)
    const fidelity = migrateHtml(html, options)
    const ast = htmlToAst(html, options)
    const failures = [
      source.value === expectedCrv ? null : `expected.crv: got ${JSON.stringify(source.value)}`,
      diagnosticsMatch(expectedReport, source.report),
      validateMigrationReport(fidelity.report) ? null : `migration report schema: ${JSON.stringify(validateMigrationReport.errors)}`,
      fidelityDiagnosticsMatch(expectedReport, fidelity.report),
      // `diagnostics` is compared above, by subsequence rather than element for
      // element, so the whole-object check must not compare it again.
      subsetOf(withoutDiagnostics(expectedReport), source.report, 'expected.report.json'),
      astDiff(expectedAst, toAstJson(ast.value)),
    ].filter(Boolean)

    if (pinLag.has(name)) {
      assert.ok(
        failures.length > 0,
        `tests/html-import/${name} is declared as pin lag ("${pinLag.get(name)}") but the ` +
          `pinned build now reproduces it. Delete the entry, in the commit that moved the pin.`,
      )
      reproduced.push(name)
      continue
    }
    assert.deepEqual(failures, [], `tests/html-import/${name}: ${failures.join('; ')}`)
  }
  assert.deepEqual(
    [...pinLag.keys()].sort(),
    reproduced.sort(),
    'a declared pin lag names a fixture that does not exist',
  )
})
