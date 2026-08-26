/*
 * AN EMPTY DESCRIPTION IS WRITTEN, SO ITS ENTRY STAYS IN ITS LIST.
 *
 * An empty `<dd>` is spelled `: {empty}` (PART 11 SS7d), so an import that
 * meets one writes the entry and keeps the list whole. Nothing is lost and
 * nothing is added: the surviving term does not inherit a description, and no
 * separator has to be invented to hold the two entries apart.
 *
 * WHY THIS FILE EXISTS BESIDE THE FIXTURE. The contract check compares the
 * fixture against the pinned build. Nothing there reads what the fixture's
 * source MEANS, so its bytes are measured here against the oracle - the reading
 * the spec repo owns without waiting for an engine.
 *
 * THE BLANK LINE IS THE PART WORTH PINNING. A blank line between two entries
 * does not separate them: `:: t1`, a blank line, `:: t2`, `:  d2` is ONE list
 * whose two terms share `d2`, which hands the first term a description it never
 * had. The sentinel is what keeps the entries distinct, and the assertion that
 * it does means nothing without one that the obvious alternative does not.
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
