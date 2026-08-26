/*
 * A DROPPED EMPTY DESCRIPTION BREAKS THE LIST; IT DOES NOT HAND ITS DESCRIPTION
 * TO THE NEXT TERM (carve#1636).
 *
 * carve#1627 ruled that an empty `<dd>` is dropped and the term written alone,
 * stated generally as "a declared loss is a ceiling, not a licence". That is
 * right while the dropped entry is the LAST one. Put an entry after it and the
 * same import breaks the ceiling in the other direction: consecutive `::` lines
 * share the description written below them, so writing both terms into one list
 * gives the surviving term a description it never had. A declared loss is a
 * ceiling in both directions - an importer may lose what it declares and no
 * more, and it may ADD nothing at all.
 *
 * WHY THIS FILE EXISTS BESIDE THE FIXTURE. Two reasons, and neither is covered
 * anywhere else:
 *
 *   - `tests/html-import/empty-definition-description-not-last` is declared as
 *     pin lag, so the contract check asserts it does NOT reproduce. Nothing
 *     there reads what the fixture's source MEANS, and a pin-lag fixture could
 *     record any source at all and stay green.
 *   - `tests/the-two-import-exits-agree.test.mjs` skips every fixture carrying a
 *     `structure-unspellable` row, which this one does by construction.
 *
 * So the fixture's bytes are read here and measured against the oracle, which is
 * the reading the spec repo owns without waiting for an engine.
 *
 * THE SEPARATOR IS THE PART WORTH PINNING. The ruling's own sketch spelled the
 * break as a blank line, and a blank line is not one: `:: t1`, a blank line,
 * `:: t2`, `:  d2` is ONE list with two terms sharing `d2` - byte-identical HTML
 * to the merge the rule forbids - and the canonical writer removes the blank
 * line again. Both halves are asserted below, because an assertion that the
 * comment spelling splits means nothing without one that the obvious
 * alternative does not.
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

const BROKEN = '<dl>\n  <dt>t1</dt>\n</dl>\n<dl>\n  <dt>t2</dt>\n  <dd>d2</dd>\n</dl>'
const MERGED = '<dl>\n  <dt>t1</dt>\n  <dt>t2</dt>\n  <dd>d2</dd>\n</dl>'

test("the fixture's source is two lists, and the first term has no description", () => {
  assert.equal(
    render(fixture('expected.crv')),
    BROKEN,
    'tests/html-import/empty-definition-description-not-last/expected.crv no longer renders the ' +
      'two lists carve#1636 ruled. docs/html-import.md, "The ceiling has a second side".',
  )
})

test('a blank line is not the break, so the separator has to be written', () => {
  // The two spellings the ruling's sketch treats as different documents. They
  // are the same document, and it is the one the rule forbids.
  assert.equal(render(':: t1\n:: t2\n:  d2\n'), MERGED)
  assert.equal(
    render(':: t1\n\n:: t2\n:  d2\n'),
    MERGED,
    'a blank line between two entries now ends the definition list, so the comment ' +
      'separator docs/html-import.md specifies is no longer the only spelling of the break',
  )
  assert.notEqual(MERGED, BROKEN, 'the two readings are the same string, so nothing above discriminates')
})

test('the comment is the only separator that both renders nothing and stays put', async () => {
  const { carveToCarve, parse, toAstJson } = await import('@markup-carve/carve')
  const between = (line) => `:: t1\n\n${line}\n\n:: t2\n: d2\n`
  const kinds = (source) => toAstJson(parse(source)).children.map((child) => child.type)

  // Every candidate renders the two lists where it is written - that is the
  // easy half, and it is why the choice needs the two further properties.
  for (const line of ['%%', '[x]: y', '[^x]: y', '*[x]: y']) {
    assert.equal(render(between(line)), BROKEN, `${line} does not break the list`)
  }

  // STAYS PUT. A link-reference and a footnote definition are document-level
  // facts the canonical writer hoists to the end, which puts the two lists back
  // together - so the break does not survive `carve fmt`.
  for (const line of ['[x]: y', '[^x]: y']) {
    const written = carveToCarve(between(line))
    assert.notEqual(written, between(line), `${line} is already a fixed point`)
    assert.equal(render(written), MERGED, `${line} survives the writer, so it is a usable separator too`)
  }

  // ADDS NOTHING. An abbreviation definition stays put and is a fixed point, and
  // is still wrong: it defines an abbreviation the input never had, which is the
  // addition this whole rule exists to prevent.
  assert.equal(carveToCarve(between('*[x]: y')), between('*[x]: y'))
  assert.deepEqual(kinds(between('*[x]: y')), ['definition_list', 'abbreviation_def', 'definition_list'])

  // The comment does all three: it breaks the list, it is a fixed point, and the
  // only node it adds renders nothing where it stands.
  assert.equal(carveToCarve(between('%%')), between('%%'))
  assert.deepEqual(kinds(between('%%')), ['definition_list', 'comment', 'definition_list'])
})

test('the fixture reports both losses, in document order', () => {
  const report = JSON.parse(fixture('expected.report.json'))
  assert.deepEqual(
    report.diagnostics.map((row) => [row.code, row.path]),
    [
      ['structure-split', '/dl[1]'],
      ['structure-unspellable', '/dl[1]/dd[2]'],
    ],
    'the grouping loss is reported on the <dl> and the dropped description on the <dd>, ' +
      'ordered by the losing element (docs/html-import.md, "The order of the diagnostic list")',
  )
})
