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
  [
    'marker-shaped-cell',
    'the writer escapes the colspan half of `span_cell` and not the rowspan half, ' +
      'so a cell holding a caret comes back as a rowspan marker and is deleted ' +
      '(PART 11 §2 and §6f; markup-carve/carve-js#1371)',
  ],
  [
    'symbol-sigil-escape',
    'the writer hardens the tag sigil and not the symbol sigil, so imported text ' +
      're-parses as a `symbol` node (PART 11 §2; markup-carve/carve-js#1371)',
  ],
  [
    'destination-less-link',
    'an anchor or image with no destination is still built as a link or image ' +
      'node and spelled `[t]()`, which is literal text ' +
      '(markup-carve/carve-js#1371)',
  ],
  // THE TREE, NOT THE SOURCE. Both fixtures' `expected.crv` is what the pin
  // already writes; what lags is `htmlToAst`, which wraps the image in a
  // paragraph the source does not spell and the render does not agree with
  // (markup-carve/carve#1606). carve-rs writes the same source and returns
  // `figure{target: image}` for the same input, so this is one engine's
  // wrapper rather than an unruled shape.
  [
    'figure-caption',
    'the tree wraps a captionable figure target in a synthesized paragraph, ' +
      'so the same import renders <p><img></p> from the tree and <img> from ' +
      'the source it writes (PART 9 §4b; markup-carve/carve-js#1381)',
  ],
  [
    'caption-attributes',
    'the same paragraph wrapper as figure-caption ' +
      '(markup-carve/carve-js#1381)',
  ],
  [
    'detached-caption-caret',
    'the writer hardens the caption caret after a table, a quote and a code ' +
      'block and not after an image, so a paragraph that merely LOOKS like a ' +
      'caption is consumed as one - and the tree it decides from carries a ' +
      'trailing whitespace-only text node no source spells (PART 11 §2; ' +
      'markup-carve/carve-js#1380, markup-carve/carve-php#1615)',
  ],
  [
    'note-reference-in-a-span',
    'the writer hardens no caret inside a span\'s bracket run, so a span whose ' +
      'text opens a note-reference label comes back as the reference and the ' +
      'attribute block comes back as literal text (PART 11 §2; ' +
      'markup-carve/carve-js#1380, markup-carve/carve-php#1615)',
  ],
  [
    'derived-endnotes-section',
    'the importer writes no `{loose}` key, so a one-item list whose HTML said ' +
      'loose comes back tight - and the pinned build does not consume the key ' +
      'either, rendering it as `<ol loose="">` ' +
      '(PART 9 section 17 L7; markup-carve/carve#1612)',
  ],
  [
    'empty-definition-description',
    'the importer writes a bare `:` line for an empty <dd>, which the parser ' +
      'reads as more of the term above it - so the loss exceeds the row that ' +
      'declares it, taking the <dt> as well ' +
      '(markup-carve/carve-js#1394, markup-carve/carve-php#1629)',
  ],
  [
    'endnotes-section-not-last',
    'the importer moves a `role="doc-endnotes"` section to the end of the ' +
      'document instead of writing `::: footnotes` where it sat, so the same ' +
      'characters come back in the wrong order with no diagnostic ' +
      '(markup-carve/carve-js#1394, markup-carve/carve-php#1629)',
  ],
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

test('the pinned build imports every fixture the way the fixture says', async () => {
  const { htmlToCarve, htmlToAst, toAstJson } = await import('@markup-carve/carve')
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
      astDiff(expectedAst, toAstJson(ast.value)),
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
