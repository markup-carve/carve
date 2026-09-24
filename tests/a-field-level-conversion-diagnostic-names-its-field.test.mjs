/*
 * PART 11 section 1d's channel can name a LOST FIELD, and the render-loss
 * report of `CARVE-P2-024` still cannot.
 *
 * That difference is the whole reason the two reports are separate (carve#2245).
 * `table_cell.blocks`, `math.label` and `math.number` are fields dropped off a
 * node the writer still spells, while `raw-format-dropped` and
 * `ruby-flattened` each name a whole node one renderer dropped. Four clauses
 * told a writer to "report the loss" with no code to report it under, so an
 * engine's only options were to invent a code the published render-loss schema
 * refuses, or to drop the shape silently.
 *
 * Both halves are checked here, because either alone goes green while the other
 * rots: a schema that models `field` proves nothing if the clauses still say
 * "reports the loss", and clause prose naming a code proves nothing if the wire
 * shape accepts an entry that names no field at all.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(resolve(repo, path), 'utf8')

const channel = JSON.parse(read('resources/conversion-diagnostics.schema.json'))
const renderLoss = JSON.parse(read('resources/render-loss-report.schema.json'))
const grammar = read('resources/grammar.ebnf')
const validate = new Ajv2020({ strict: true }).compile(channel)

const report = (...diagnostics) => ({
  diagnostics,
  totalDiagnostics: diagnostics.length,
  truncated: false,
})
const wrapper = { code: 'structure-unspellable', node: 'section', message: 'Carve source spells no section' }
const field = { code: 'field-unspellable', node: 'math', field: 'label', message: 'Carve source spells no equation label' }

test('the channel accepts a node-level and a field-level diagnostic', () => {
  assert.equal(validate(report(wrapper)), true, JSON.stringify(validate.errors))
  assert.equal(validate(report(field)), true, JSON.stringify(validate.errors))
  assert.equal(validate(report(wrapper, field)), true, JSON.stringify(validate.errors))
})

test('a field-level diagnostic that names no field is refused', () => {
  /* The capability section 1d exists for. Without this the channel would model a
   * field-level loss exactly as loosely as the render-loss report does. */
  const { field: _dropped, ...unnamed } = field
  assert.equal(validate(report(unnamed)), false, 'a `field-unspellable` entry with no `field` must not validate')
})

test('a node-level diagnostic carrying a field is refused', () => {
  /* The other direction: `structure-unspellable` says a whole node is gone, so a
   * field name on it would describe a loss that did not happen. */
  assert.equal(validate(report({ ...wrapper, field: 'children' })), false)
})

test('the channel is closed against an invented code and an invented key', () => {
  assert.equal(validate(report({ ...wrapper, code: 'section-dropped' })), false)
  assert.equal(validate(report({ ...wrapper, target: 'html' })), false)
  assert.equal(validate({ ...report(wrapper), unknown: true }), false)
  assert.equal(validate({ diagnostics: [], truncated: false }), false)
})

test('the render-loss code enum stays closed at the two render-time codes', () => {
  /* Section 2245 ruled the enum does not grow, so the channel's codes must be
   * absent from it and it must hold nothing else either. */
  assert.deepEqual(
    renderLoss.properties.losses.items.properties.code.enum,
    ['raw-format-dropped', 'ruby-flattened'],
  )
})

test('--allow-loss names the two render-loss codes and neither channel code', () => {
  const offered = [...grammar.matchAll(/`--allow-loss ([a-z-]+)`/g)].map((match) => match[1])
  assert.deepEqual([...new Set(offered)].sort(), ['raw-format-dropped', 'ruby-flattened'])
})

/*
 * The clause text, from its id to the next clause marker. Keyed by id rather
 * than by section number because the numbers renumber and the ids do not.
 */
const clauseText = (id) => {
  const start = grammar.indexOf(`[${id}]`)
  assert.notEqual(start, -1, `${id} is absent from the grammar`)
  const rest = grammar.slice(start + id.length + 2)
  const end = rest.search(/--\s+NORMATIVE\s+\[CARVE-/)
  return rest.slice(0, end === -1 ? rest.length : end)
}

const REPORTS = {
  'CARVE-P12-049': ['field-unspellable', '`table_cell.blocks`'],
  'CARVE-P12-050': ['structure-unspellable', '`small_caps`'],
  'CARVE-P12-051': ['field-unspellable', '`math.label`', '`math.number`'],
  'CARVE-P12-052': ['structure-unspellable', '`section`'],
}

for (const [id, expected] of Object.entries(REPORTS)) {
  test(`${id} names the channel and what it reports there`, () => {
    const text = clauseText(id).replace(/\n\s+/g, ' ')
    assert.match(text, /PART 11 §1d channel/, `${id} must point its loss at the section 1d channel`)
    for (const token of expected) {
      assert.ok(text.includes(token), `${id} must name ${token}`)
    }
  })
}

test('the published channel schema id matches its build destination', () => {
  assert.equal(channel.$id, 'https://markup-carve.github.io/carve/conversion-diagnostics.schema.json')
  assert.match(read('scripts/publish-schema.mjs'), /'conversion-diagnostics\.schema\.json'/)
})
