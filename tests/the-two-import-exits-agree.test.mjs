/*
 * THE TWO EXITS OF AN IMPORT SAY THE SAME THING (markup-carve/carve#1601).
 *
 * docs/html-import-contract.md, "The two exits say the same thing":
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
 * All three entries were found by writing this check, and none is
 * markup-carve/carve#1601's own subject. Two are gone again: the `<figure>`
 * pair was RULED rather than tolerated (markup-carve/carve#1606). The tree was
 * the wrong exit - PART 9 §4b's hosts are "an image, a quote, a code block, a
 * display-math paragraph", so the image host is the image and only the math
 * host is a paragraph - and the fixtures now record `figure{target: image}`,
 * which is what the source beside them always parsed to. The engine that wraps
 * is declared as pin lag in the contract check, and the tree it returned is
 * held as a literal below so retiring these entries does not retire the proof.
 */
const UNMET = new Map([])

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
 * SOURCE-LAYOUT FIELDS ARE THE ONLY ONES SKIPPED, and the list is CLOSED.
 *
 * These record HOW a source spelled a construct - which bullet character, which
 * ordered delimiter, which slot an attribute sat in, where a definition's lines
 * ran. A parse fills them in because it read source; an import records none of
 * them, because it read HTML and there was no source to read them off. So a
 * fixture omitting one is the absent optional field docs/html-import-contract.md already
 * tells implementations to ignore, and it is the ONLY absence that is.
 *
 * Skipping every key that is missing from either side instead would be a check
 * that cannot fail for a whole class: a recorded `{type: "text", value: "x"}`
 * beside a parsed `{type: "text"}` would AGREE, on nothing. Every other key is
 * compared in both directions, so a field only one side carries is a
 * disagreement. A new source-layout field turns this red until it is added
 * here, which is the direction worth failing in.
 */
const SOURCE_LAYOUT_FIELDS = new Set([
  'order',
  'bulletChar',
  'bareMarker',
  'delim',
  'definitionLines',
  'definitionSpans',
  'termSpans',
])

/*
 * AND THE SKIP IS ONLY SAFE BECAUSE AN IMPORT RECORDS NONE OF THEM
 * (markup-carve/carve#1647).
 *
 * The comment above states that as the reason the skip is not a hole. Nothing
 * checked it, and the skip is precisely what makes it uncheckable ABOVE: a
 * fixture that records `bulletChar` is skipped over by `disagreement` on the
 * one key that would have shown it. So the claim held the whole file up and had
 * no reader.
 *
 * It was false. `tests/html-import/whitespace-only-block/expected.ast.json`
 * recorded `"bulletChar": "-"` on both of its lists while
 * `traversal-shaped-index` and `derived-endnotes-section` - the same construct,
 * the same importer, the same run - recorded none, so no implementation could
 * pass both. `docs/ast-json-contract.md` settles which is wrong twice over: a
 * source-layout field is filled in by a PARSE, and `list.bulletChar` "records
 * `*` while absence means `-`", so `-` is the value that is spelled by leaving
 * the field out even where a source WAS read.
 *
 * Nothing else could have caught it. tests/html-import-contract.check.mjs
 * compares the AST whole, but that fixture is declared pin lag there, and a
 * pin-lag entry asserts only that SOME failure remains - never which - so a
 * wrong field inside one is invisible for as long as the entry stands.
 */
const sourceLayoutKeys = (value, path = '') => {
  if (Array.isArray(value)) return value.flatMap((item, i) => sourceLayoutKeys(item, `${path}[${i}]`))
  if (value === null || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, inner]) =>
    SOURCE_LAYOUT_FIELDS.has(key) ? [`${path}.${key}`] : sourceLayoutKeys(inner, `${path}.${key}`),
  )
}

test('no fixture records a source-layout field, because an import read no source', async () => {
  const fixtures = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory())
  assert.ok(fixtures.length > 0)
  for (const { name } of fixtures) {
    const ast = JSON.parse(await readFile(new URL(`${name}/expected.ast.json`, root), 'utf8'))
    assert.deepEqual(
      sourceLayoutKeys(ast),
      [],
      `tests/html-import/${name}/expected.ast.json records a source-layout field. ` +
        `An import reads HTML and has no source to read one off, which is the ground ` +
        `SOURCE_LAYOUT_FIELDS is skipped on above - so recording one states a spelling ` +
        `the import never saw, and no implementation can satisfy it alongside the ` +
        `fixtures that omit it (markup-carve/carve#1647).`,
    )
  }
})

/*
 * THE CHECK ABOVE CAN DETECT WHAT IT CLAIMS TO DETECT.
 *
 * Every fixture is correct once #1647 lands, so the check passes over all of
 * them and that proves nothing. The literal below is the tree the fixture
 * actually held, kept here rather than read back from a fixture so that a later
 * fixture edit cannot quietly retire the proof.
 */
test('the source-layout scan finds the field the fixture recorded', () => {
  const recorded = {
    type: 'document',
    children: [{ type: 'list', ordered: false, tight: true, items: [], bulletChar: '-' }],
  }
  assert.deepEqual(sourceLayoutKeys(recorded), ['.children[0].bulletChar'])
  assert.deepEqual(sourceLayoutKeys({ type: 'document', children: [{ type: 'list', items: [] }] }), [])
})

/*
 * AND THE ENGINE IS HELD TO IT TOO, not only the fixtures
 * (markup-carve/carve#1671).
 *
 * The check above reads FIXTURE BYTES, which is all it could read when the rule
 * was written. That leaves the rule stated on the recordings and unstated on
 * the thing that produces them - so an importer may start recording a
 * source-layout field, and the only way to notice is a fixture someone
 * re-records to match it. That is the wrong direction to fix it in, and it is
 * the direction markup-carve/carve#1671 proposed: the fixture was reported as
 * stale because its tree carries no `#id` slot while a newer engine's import
 * does. The fixture is right; the slot is the thing that may not be there.
 *
 * The pinned build is in this repository, so the rule can be read off the
 * IMPORT rather than off a recording of one. It is green at `71add23f`, which
 * records no source-layout field for any of the fixtures, and it goes red the
 * moment the pin passes markup-carve/carve-js#1416 - which keeps an authored
 * heading id by pushing an `#id` slot into the tree it publishes, and is the
 * only arm of either importer that does. Measured on carve-js `dd75592`: one
 * hit, `auto-text-link -> .children[0].attrs.order`, and none anywhere else.
 *
 * So a bump that trips this is naming an ENGINE defect. Fix it there; do not
 * re-record a fixture to accept a spelling the import never read.
 */
test('the pinned build records no source-layout field on any import either', async () => {
  const { htmlToAst, toAstJson } = await import('@markup-carve/carve')
  const fixtures = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory())
  assert.ok(fixtures.length > 0)
  for (const { name } of fixtures) {
    const html = await readFile(new URL(`${name}/input.html`, root), 'utf8')
    assert.deepEqual(
      sourceLayoutKeys(toAstJson(htmlToAst(html).value)),
      [],
      `the pinned build's htmlToAst records a source-layout field for ` +
        `tests/html-import/${name}. An import reads HTML and has no source to read one ` +
        `off (markup-carve/carve#1647), so the field states a spelling it never saw. ` +
        `Fix the importer - re-recording the fixture to match would retire the rule ` +
        `rather than the defect (markup-carve/carve#1671).`,
    )
  }
})

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
    const keys = [...new Set([...Object.keys(parsed), ...Object.keys(recorded)])]
    for (const key of keys) {
      if (SOURCE_LAYOUT_FIELDS.has(key)) continue
      if (!(key in parsed)) return `${path}.${key}: the source says nothing, the tree says it`
      if (!(key in recorded)) return `${path}.${key}: the source says it, the tree says nothing`
      const miss = disagreement(parsed[key], recorded[key], `${path}.${key}`)
      if (miss) return miss
    }
    return null
  }
  return parsed === recorded
    ? null
    : `${path}: source says ${JSON.stringify(parsed)}, tree says ${JSON.stringify(recorded)}`
}

/*
 * THE LEFT SIDE IS THE PUBLISHED TREE, not the engine's internal `parse()`
 * return (markup-carve/carve#1616).
 *
 * A fixture's `expected.ast.json` records the PART 12 shape. An internal tree
 * is a different object: it spells a definition-list entry as
 * `{terms, definitions}` rather than as the `definition_term` and
 * `definition_description` nodes §8 publishes, and it hangs footnote
 * definitions off the ROOT rather than carrying them as `footnote` children,
 * which §7 forbids outright. Reading it here would report a disagreement for
 * every fixture holding either shape, on a difference neither exit ever had -
 * and would pin one implementation's internals as the portable minimum.
 */
const publishedParse = async () => {
  const { parse, toAstJson } = await import('@markup-carve/carve')
  return (source) => toAstJson(parse(source))
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
  const published = await publishedParse()
  const fixtures = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory())
  assert.ok(fixtures.length > 0)

  const held = []
  for (const { name } of fixtures) {
    const { crv, ast, report } = await readFixture(name)
    // The one carve-out the page names: a tree Carve source cannot spell
    // survives in the AST and not in the source, and the row says so.
    if (report.diagnostics.some((row) => row.code === 'structure-unspellable')) continue

    const miss = disagreement(normalize(published(crv)), normalize(ast))
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
        `things (${miss}). docs/html-import-contract.md, "The two exits say the same thing".`,
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
  const published = await publishedParse()
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
      disagreement(normalize(published(source)), normalize(ast)),
      `the source measured for tests/html-import/${name} agrees with the fixture's ` +
        `tree, so this check would not have caught the shape it was written for`,
    )
  }
})

/*
 * THE WRAPPER IS HELD AS A LITERAL TOO, and for the same reason - but on the
 * other side of the invariant. The three shapes above were wrong in the SOURCE
 * an importer wrote, so the literal to keep is a source string. The `<figure>`
 * pair was wrong in the TREE (markup-carve/carve#1606): the source both engines
 * write is `![a](i.png)` plus a caption line, which is right, and one of the
 * two trees beside it wrapped the image in a paragraph. So the literal to keep
 * is the tree, measured on carve-js `1568546` and declared as pin lag in
 * tests/html-import-contract.check.mjs (markup-carve/carve-js#1381).
 *
 * Both directions are asserted. Rejecting the wrapper says the check can see
 * the shape; accepting the ruled tree says it is not simply rejecting every
 * tree put in front of it, which is the failure mode that would make the first
 * assertion worthless.
 */
test('the invariant rejects the paragraph-wrapped figure tree, and accepts the ruled one', async () => {
  const published = await publishedParse()
  const source = '![a](i.png)\n^ cap\n'
  const image = { type: 'image', src: 'i.png', alt: 'a' }
  const caption = [{ type: 'text', value: 'cap' }]
  const figure = (target) => ({ type: 'document', children: [{ type: 'figure', target, caption }] })

  assert.ok(
    disagreement(normalize(published(source)), normalize(figure({ type: 'paragraph', children: [image] }))),
    'the paragraph-wrapped tree agrees with the source it was written beside, so this ' +
      'check would not have caught the shape markup-carve/carve#1606 ruled',
  )
  assert.equal(
    disagreement(normalize(published(source)), normalize(figure(image))),
    null,
    'the ruled tree disagrees with its own source, so the check rejects everything ' +
      'and the assertion above means nothing',
  )
})
