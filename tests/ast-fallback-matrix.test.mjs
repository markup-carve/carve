import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFallbackMatrix, validateMatrix } from '../scripts/ast-fallback-matrix.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(resolve(repo, path), 'utf8')
const source = read('resources/spec/23-ast-foundations.ebnf')
const contracts = {
  registry: JSON.parse(read('resources/spec/rules.json')),
  schema: JSON.parse(read('resources/ast-schema.json')),
  conversion: JSON.parse(read('resources/conversion-diagnostics.schema.json')),
  renderLoss: JSON.parse(read('resources/render-loss-report.schema.json')),
  grammar: readdirSync(resolve(repo, 'resources/spec')).filter((file) => file.endsWith('.ebnf')).sort()
    .map((file) => read(`resources/spec/${file}`)).join(''),
}
const check = (text) => validateMatrix(parseFallbackMatrix(text), contracts)

test('fallback rows resolve to their clauses, AST fields and diagnostic contracts', () => {
  check(source)
})

test('a removed row cannot leave a clause pointing at an absent fallback', () => {
  assert.throws(() => check(source.replace(/^\| ruby \|.*\n/m, '')), /missing fallback row/)
})

test('an existing rule cannot be assigned another clause\'s fallback row', () => {
  assert.throws(() => check(source.replace('| small_caps | CARVE-P12-050 |', '| small_caps | CARVE-P12-052 |')), /disagrees with its clause/)
})

test('a schema field rename invalidates the table until its reference is updated', () => {
  const changed = { ...contracts, schema: structuredClone(contracts.schema) }
  delete changed.schema.$defs.table_cell.properties.blocks
  assert.throws(() => validateMatrix(parseFallbackMatrix(source), changed), /unknown fallback field/)
})

test('a diagnostic enum change cannot silently leave a stale code in the table', () => {
  const changed = { ...contracts, renderLoss: structuredClone(contracts.renderLoss) }
  changed.renderLoss.properties.losses.items.properties.code.enum = ['raw-format-dropped']
  assert.throws(() => validateMatrix(parseFallbackMatrix(source), changed), /unknown diagnostic code/)
})

test('a missing target column and duplicate table are refused', () => {
  assert.throws(() => check(source.replace(' | ANSI |', ' |')), /invalid fallback matrix columns/)
  assert.throws(() => check(`${source}\n${source}`), /expected one AST fallback matrix/)
})

test('unknown actions and diagnostic codes are refused', () => {
  assert.throws(() => check(source.replace('| cell_blocks |', '| invented |')), /unknown fallback action/)
  assert.throws(() => check(source.replace('ruby-flattened (Carve,Plain,ANSI)', 'invented-loss (Carve)')), /unknown diagnostic code/)
})

test('malformed diagnostic scopes and missing legends are refused', () => {
  assert.throws(() => check(source.replace('ruby-flattened (Carve,Plain,ANSI)', 'ruby-flattened (HTMLish)')), /invalid diagnostic targets/)
  assert.throws(() => check(source.replace('   ACTIONS', '   LEGEND')), /action legend is absent/)
})

test('two clauses cannot claim the same fallback row', () => {
  const changed = { ...contracts, grammar: contracts.grammar.replace('fallback matrix row `section`', 'fallback matrix row `ruby`') }
  assert.throws(() => validateMatrix(parseFallbackMatrix(source), changed), /duplicate fallback clause reference/)
})

test('an existing diagnostic code cannot replace a different clause\'s code', () => {
  assert.throws(() => check(source.replace('ruby-flattened (Carve,Plain,ANSI)', 'raw-format-dropped (Carve)')), /diagnostic code is absent from its clause/)
})

test('duplicate action definitions cannot silently overwrite the legend', () => {
  assert.throws(() => check(source.replace('   omit_field: omit the field.', '   omit_field: omit the field.\n   omit_field: another meaning.')), /duplicate fallback action definition/)
})
