import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { test } from 'node:test'

const root = new URL('./html-import/', import.meta.url)

test('every HTML import fixture publishes all four contract files', async () => {
  const fixtures = await readdir(root, { withFileTypes: true })
  assert.ok(fixtures.length > 0)
  for (const fixture of fixtures.filter((entry) => entry.isDirectory())) {
    const names = new Set(await readdir(new URL(`${fixture.name}/`, root)))
    assert.deepEqual([...names].sort(), ['expected.ast.json', 'expected.crv', 'expected.report.json', 'input.html'])
    for (const json of ['expected.ast.json', 'expected.report.json']) {
      JSON.parse(await readFile(new URL(`${fixture.name}/${json}`, root), 'utf8'))
    }
  }
})

test('the report schema and fixture vocabulary agree', async () => {
  const schema = JSON.parse(await readFile(new URL('../resources/html-import-schema.json', import.meta.url), 'utf8'))
  const allowed = new Set(schema.properties.diagnostics.items.properties.code.enum)
  for (const fixture of await readdir(root, { withFileTypes: true })) {
    if (!fixture.isDirectory()) continue
    const report = JSON.parse(await readFile(new URL(`${fixture.name}/expected.report.json`, root), 'utf8'))
    for (const diagnostic of report.diagnostics) assert.ok(allowed.has(diagnostic.code), diagnostic.code)
  }
})

/*
 * THE FIXED-POINT CLAIM, CHECKED (markup-carve/carve#1286).
 *
 * docs/html-import.md says every `expected.crv` here is also a fixed point of
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
        `so it pins source no engine's formatter produces (docs/html-import.md, ` +
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
 * package.json pins. Comparison follows what docs/html-import.md promises
 * implementations: source is byte-exact, AST ignores key order and absent
 * optional fields, and a diagnostic object is a MINIMUM match.
 *
 * PIN LAG IS DECLARED, never tolerated - the same rule as
 * resources/engine-pin-drift.txt, and it fails in both directions. A fixture
 * that disagrees and is not listed is red; a listed fixture that now agrees is
 * red too, so the line goes out with the pin bump that fixed it.
 */
const PIN_LAG = new Map([
  // NO ENTRIES. The pin imports every fixture the way the fixture says. The
  // last entry, blockquote-cite, cleared when the pin moved past
  // markup-carve/carve-js#1125.
])

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

test('the pinned build imports every fixture the way the fixture says', async () => {
  const { htmlToCarve, htmlToAst } = await import('@markup-carve/carve')
  const fixtures = (await readdir(root, { withFileTypes: true })).filter((e) => e.isDirectory())
  assert.ok(fixtures.length > 0)
  const reproduced = []
  for (const { name } of fixtures) {
    const read = async (file) => readFile(new URL(`${name}/${file}`, root), 'utf8')
    const html = await read('input.html')
    const expectedCrv = await read('expected.crv')
    const expectedReport = JSON.parse(await read('expected.report.json'))
    const expectedAst = JSON.parse(await read('expected.ast.json'))

    const source = htmlToCarve(html)
    const ast = htmlToAst(html)
    const failures = [
      source.value === expectedCrv ? null : `expected.crv: got ${JSON.stringify(source.value)}`,
      subsetOf(expectedReport, source.report, 'expected.report.json'),
      astDiff(expectedAst, ast.value),
    ].filter(Boolean)

    if (PIN_LAG.has(name)) {
      assert.ok(
        failures.length > 0,
        `tests/html-import/${name} is declared as pin lag ("${PIN_LAG.get(name)}") but the ` +
          `pinned build now reproduces it. Delete the entry, in the commit that moved the pin.`,
      )
      reproduced.push(name)
      continue
    }
    assert.deepEqual(failures, [], `tests/html-import/${name}: ${failures.join('; ')}`)
  }
  assert.deepEqual(
    [...PIN_LAG.keys()].sort(),
    reproduced.sort(),
    'a declared pin lag names a fixture that does not exist',
  )
})
