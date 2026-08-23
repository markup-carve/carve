/*
 * THE TWO EXITS OF AN IMPORT SAY THE SAME THING (markup-carve/carve#1601).
 *
 * docs/html-import.md, "The two exits say the same thing":
 *
 *     parse(htmlToCarve(h)) == htmlToAst(h)
 *
 * modulo escaping (PART 11 §1) and source positions, with one carve-out - a
 * `structure-unspellable` row, which is the diagnostic that exists for a tree
 * Carve source cannot spell.
 *
 * WHY IT IS A TEST HERE RATHER THAN A PROPERTY AN ENGINE CHECKS. Every runner
 * this repository has reads a fixture's `expected.ast.json` against an engine
 * and its `expected.crv` against the same engine, and NEITHER against the
 * other. So an importer whose tree and whose source disagree is green twice,
 * and the disagreement is invisible until someone parses the source back. That
 * is how a table cell, an anchor and a text run all reached the contract page
 * meaning something the tree beside them never said.
 *
 * The fixtures are the only thing this side can read: the engines live in other
 * repositories. Reading the invariant off the FIXTURE BYTES still catches every
 * shape it exists for, because a fixture records both exits of one import - if
 * the two recorded exits disagree, the import they were taken from did too.
 */
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { test } from 'node:test'

const root = new URL('./html-import/', import.meta.url)

/*
 * DECLARED, NEVER TOLERATED - the same rule as the PIN_LAG map in
 * tests/html-import-contract.check.mjs, and it fails in both directions. A
 * fixture that disagrees and is not listed is red; a listed fixture that now
 * agrees is red too, so the line goes out with the commit that fixed it.
 *
 * Both entries were found by writing this check, and neither is
 * markup-carve/carve#1601's own subject.
 */
const UNMET = new Map([
  [
    'figure-caption',
    'the tree wraps the figure target in a paragraph, which the source it ' +
      'writes does not spell and which renders <p><img></p> rather than <img> ' +
      '(markup-carve/carve#1606)',
  ],
  [
    'caption-attributes',
    'the same paragraph wrapper as figure-caption (markup-carve/carve#1606)',
  ],
  [
    'derived-endnotes-section',
    'the tree says a one-item list is loose where its own source says tight, ' +
      'and Carve has no spelling for a loose one-item list ' +
      '(markup-carve/carve#1607)',
  ],
])

const LOCATION_FIELDS = new Set(['pos', 'srcByteLength'])

/*
 * MODULO ESCAPING is PART 11 §1's own clause: `escaped_text` and `text` compare
 * EQUAL, and an adjacent run of them compares as the single text node holding
 * the same characters in the same order. Without it the invariant would be
 * unattainable by construction for every source carrying an escape - which is
 * two of the three fixtures this check ships with.
 */
const normalize = (value) => {
  if (Array.isArray(value)) {
    const out = []
    for (const item of value.map(normalize)) {
      const previous = out[out.length - 1]
      if (previous?.type === 'text' && item?.type === 'text') {
        out[out.length - 1] = { type: 'text', value: previous.value + item.value }
        continue
      }
      out.push(item)
    }
    return out
  }
  if (value === null || typeof value !== 'object') return value
  const out = {}
  for (const [key, inner] of Object.entries(value)) {
    if (!LOCATION_FIELDS.has(key)) out[key] = normalize(inner)
  }
  if (out.type === 'escaped_text') out.type = 'text'
  return out
}

/*
 * ABSENT OPTIONAL FIELDS ARE IGNORED, which docs/html-import.md already
 * promises implementations for the AST comparison. A key present on only one
 * side is skipped; a key present on BOTH must agree. That is what leaves
 * `order`, `bulletChar` and `delim` - source-layout fields a fixture omits and
 * a parse fills in - out of the comparison while still catching a `tight` or a
 * `type` that says two different things.
 */
const disagreement = (parsed, recorded, path = '') => {
  if (Array.isArray(parsed) || Array.isArray(recorded)) {
    if (!Array.isArray(parsed) || !Array.isArray(recorded)) return `${path}: array against non-array`
    if (parsed.length !== recorded.length) {
      return `${path}: ${parsed.length} item(s) parsed, ${recorded.length} recorded`
    }
    for (let i = 0; i < parsed.length; i++) {
      const miss = disagreement(parsed[i], recorded[i], `${path}[${i}]`)
      if (miss) return miss
    }
    return null
  }
  if (parsed !== null && typeof parsed === 'object' && recorded !== null && typeof recorded === 'object') {
    for (const key of Object.keys(parsed)) {
      if (!(key in recorded)) continue
      const miss = disagreement(parsed[key], recorded[key], `${path}.${key}`)
      if (miss) return miss
    }
    return null
  }
  return parsed === recorded
    ? null
    : `${path}: source says ${JSON.stringify(parsed)}, tree says ${JSON.stringify(recorded)}`
}

const readFixture = async (name) => {
  const read = (file) => readFile(new URL(`${name}/${file}`, root), 'utf8')
  return {
    crv: await read('expected.crv'),
    ast: JSON.parse(await read('expected.ast.json')),
    report: JSON.parse(await read('expected.report.json')),
  }
}

test('every fixture records two exits that say the same thing', async () => {
  const { parse } = await import('@markup-carve/carve')
  const fixtures = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory())
  assert.ok(fixtures.length > 0)

  const held = []
  for (const { name } of fixtures) {
    const { crv, ast, report } = await readFixture(name)
    // The one carve-out the page names: a tree Carve source cannot spell
    // survives in the AST and not in the source, and the row says so.
    if (report.diagnostics.some((row) => row.code === 'structure-unspellable')) continue

    const miss = disagreement(normalize(parse(crv)), normalize(ast))
    if (UNMET.has(name)) {
      assert.ok(
        miss,
        `tests/html-import/${name} is declared as not meeting the invariant ` +
          `("${UNMET.get(name)}") but its two exits now agree. Delete the entry, ` +
          `in the commit that fixed it.`,
      )
      held.push(name)
      continue
    }
    assert.equal(
      miss,
      null,
      `tests/html-import/${name}: expected.crv and expected.ast.json say different ` +
        `things (${miss}). docs/html-import.md, "The two exits say the same thing".`,
    )
  }
  assert.deepEqual([...UNMET.keys()].sort(), held.sort(), 'a declared entry names a fixture that does not exist')
})

/*
 * THE CHECK CAN DETECT WHAT IT CLAIMS TO DETECT.
 *
 * The three shapes markup-carve/carve#1601 measured are the reason this file
 * exists, and all three are now RECORDED CORRECTLY in the fixtures above - so
 * the test above passes on them and proves nothing about whether it would have
 * caught them. The sources below are what both engines wrote at the time of the
 * measurement, held as literals rather than read back from the pinned build so
 * that fixing an engine does not quietly retire the proof.
 */
test('the invariant rejects the source both engines wrote for the three shapes', async () => {
  const { parse } = await import('@markup-carve/carve')
  const measured = [
    // A cell whose payload is a rowspan marker: the caret's cell is deleted and
    // the cell above grows a rowspan.
    ['marker-shaped-cell', '| a | b |\n| ^ | \\< |\n'],
    // An anchor with no destination, spelled as an empty one: four punctuation
    // characters that render as literal text.
    ['destination-less-link', '[click here]() and [a named one](){#k}\n\n![logo]()\n'],
    // The symbol sigil, unescaped: a `symbol` node where the HTML held text.
    ['symbol-sigil-escape', 'a :rocket: b and a \\#t tag\n'],
  ]
  for (const [name, source] of measured) {
    const { ast } = await readFixture(name)
    assert.ok(
      disagreement(normalize(parse(source)), normalize(ast)),
      `the source measured for tests/html-import/${name} agrees with the fixture's ` +
        `tree, so this check would not have caught the shape it was written for`,
    )
  }
})
