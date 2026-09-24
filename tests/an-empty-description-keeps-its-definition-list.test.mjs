/*
 * An empty description keeps its entry in the list.
 *
 * An empty `<dd>` is written as `: {empty}` (PART 11 SS7d). The importer can
 * keep the entry without giving its term the next entry's description.
 *
 * The contract check compares the fixture with the pinned build. This test also
 * checks the fixture's meaning against the spec parser without depending on
 * that build.
 *
 * A blank line does not separate two entries. Without the sentinel, `:: t1`,
 * a blank line, `:: t2`, and `:  d2` form one list whose terms share `d2`.
 * The test checks both readings to show why the sentinel is needed.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as oracleParse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = (file) =>
  readFileSync(resolve(here, 'html-import', 'empty-definition-description-not-last', file), 'utf8')

const render = (source) => renderDoc(oracleParse(source))

const KEPT = '<dl>\n  <dt>t1</dt>\n  <dd></dd>\n  <dt>t2</dt>\n  <dd>d2</dd>\n</dl>'
const MERGED = '<dl>\n  <dt>t1</dt>\n  <dt>t2</dt>\n  <dd>d2</dd>\n</dl>'

test("the fixture's source is one list, and the first term keeps its own empty description", () => {
  assert.equal(
    render(fixture('expected.crv')),
    KEPT,
    'tests/html-import/empty-definition-description-not-last/expected.crv no longer renders the ' +
      'single list the sentinel keeps whole (PART 11 SS7d, carve#1827).',
  )
})

test('a blank line does not separate two entries, so the sentinel is what keeps them apart', () => {
  assert.equal(render(':: t1\n:: t2\n:  d2\n'), MERGED)
  assert.equal(
    render(':: t1\n\n:: t2\n:  d2\n'),
    MERGED,
    'a blank line between two entries would separate them, so the sentinel is not what ' +
      'keeps the first term from inheriting the description below the second',
  )
  assert.notEqual(KEPT, MERGED, 'the two readings are the same string, so nothing above discriminates')
})

test('the entry survives the writer, and adds no node of its own', async () => {
  const { carveToCarve, parse, toAstJson } = await import('@markup-carve/carve')
  const source = fixture('expected.crv')
  assert.equal(carveToCarve(source), source, 'the sentinel spelling is not a fixed point of the writer')
  assert.deepEqual(
    toAstJson(parse(source)).children.map((child) => child.type),
    ['definition_list'],
    'the sentinel adds a sibling node, so the source spells something it does not mean',
  )
})

test('the fixture reports no loss', () => {
  const report = JSON.parse(fixture('expected.report.json'))
  assert.deepEqual(
    report.diagnostics.map((row) => [row.code, row.path]),
    [],
    'an empty description is spellable and its entry keeps its list, so the import loses nothing',
  )
})
