import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CaseFileError, agrees, matchDiagnostics, checkCase, enumFields, indexClauseCases, loadModel, parseCaseFile, run } from '../scripts/expected-check.mjs'

const root = resolve(import.meta.dirname, '..')
const fixtures = resolve(root, 'tests/fixtures/expected-check')
const conflicts = resolve(fixtures, 'conflicts.crv')
const readJson = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const quiet = { log: () => {}, error: () => {} }

test('the case file gives each case its operation, input and expected output', () => {
  const cases = parseCaseFile(readFileSync(conflicts, 'utf8'))
  assert.deepEqual(cases.map(c => [c.id.split(' ')[0], c.operation]), [['6569', 'ast'], ['6557', 'fmt'], ['6561', 'fmt'], ['6569', 'ast']])
  assert.equal(cases[1].input, '^[\\]\n[\\^][n]\n')
  assert.equal(cases[1].expected, '^[\\]\n[^][n]\n')
  assert.deepEqual(cases[0].expected, [{ type: 'paragraph', children: [{ type: 'critic_comment', value: 'a\n%% b' }] }])
  assert.deepEqual(cases[2].clauses, ['C2-W-088'])
})

test('a longer fence holds a shorter one, and lint expectations take a place', () => {
  const [c] = parseCaseFile('## x\n\n- operation: lint\n\n````crv\n```\ncode\n```\n````\n\n```text\nsome-rule 1:1\nother-rule\n```\n')
  assert.equal(c.input, '```\ncode\n```\n')
  assert.deepEqual(c.expected, [{ code: 'some-rule', line: 1, column: 1 }, { code: 'other-rule' }])
})

test('a malformed case file is a tool error, exit 2', async () => {
  assert.throws(() => parseCaseFile('## x\n\n- operation: yaml\n\n```\na\n```\n\n```\nb\n```\n'), CaseFileError)
  assert.throws(() => parseCaseFile('## x\n\n- operation: fmt\n\n```\na\n```\n'), /two fenced blocks/)
  assert.throws(() => parseCaseFile('## x\n\n- operation: fmt\n\n```\na\n'), /never closed/)
  assert.equal(await run([resolve(fixtures, 'missing.crv')], quiet), 2)
})

const jsDir = resolve(process.env.CARVE_JS_DIR ?? resolve(root, 'engines/carve-js'))
const engine = existsSync(resolve(jsDir, 'src/index.ts')) || existsSync(resolve(jsDir, 'v2/src/index.ts'))
const skip = engine ? false : `needs a carve-js next2 checkout at CARVE_JS_DIR or engines/carve-js (the readiness workflow has one)`

async function setup(clauseCases = readJson('spec/0.2/conformance/clause-cases.json').cases) {
  const model = await loadModel(jsDir)
  const fields = enumFields(readJson('spec/0.2/data/ast-schema.json'))
  return { model, fields, index: indexClauseCases(model, clauseCases, fields) }
}
const caseNamed = prefix => parseCaseFile(readFileSync(conflicts, 'utf8')).find(c => c.id.startsWith(prefix))

test('carve#6569 as filed conflicts with the model and lists the C2-B-138 clause cases', { skip }, async () => {
  const { model, fields, index } = await setup()
  const r = checkCase(model, index, fields, caseNamed('6569 editorial'))
  assert.equal(r.agrees, false)
  const ids = r.atRisk.map(hit => hit.case.id)
  assert.ok(ids.includes('CC-240') && ids.includes('CC-241'), `C2-B-138 cases missing from ${ids}`)
  assert.ok(r.atRisk.filter(hit => hit.case.clauses.includes('C2-B-138')).every(hit => hit.modelPasses))
})

test('carve#6561 as filed lists CC-1568 as it was pinned then', { skip }, async () => {
  const old = readJson('tests/fixtures/expected-check/cc-1568-before-6572.json').case
  const { model, fields, index } = await setup(readJson('spec/0.2/conformance/clause-cases.json').cases.map(c => c.id === old.id ? old : c))
  const c = caseNamed('6561')
  // The carve-js output the ticket recorded (8b8792cd); a later carve-js gives the Expected form.
  const recorded = { ...model, run: (op, input, options) => op === 'fmt' && input === c.input ? { output: '- ^a{\\{^}^},,{{^,,\n' } : model.run(op, input, options) }
  const r = checkCase(recorded, index, fields, c)
  assert.equal(r.agrees, false)
  assert.ok(r.atRisk.some(hit => hit.case.id === 'CC-1568'), `CC-1568 missing from ${r.atRisk.map(hit => hit.case.id)}`)
})

test('carve#6557 as filed conflicts with the model', { skip }, async () => {
  const { model, fields, index } = await setup()
  const r = checkCase(model, index, fields, caseNamed('6557'))
  assert.equal(r.agrees, false)
  // Since carve-js#5459 (C2-I-089 tie-break) the expected text parses to the output's tree, so case eight leads, not C2-W-075.
  assert.ok(r.atRisk.some(hit => hit.case.clauses.includes('C2-W-125')), `no C2-W-125 case in ${r.atRisk.map(hit => hit.case.id)}`)
})

test('the command exits 1 on the conflicts and 0 on cases the model gives', { skip }, async () => {
  const env = process.env.CARVE_JS_DIR
  process.env.CARVE_JS_DIR = jsDir
  try {
    const lines = []
    assert.equal(await run([conflicts], { log: text => lines.push(text), error: () => {} }), 1)
    assert.match(lines.join('\n'), /CONFLICT 6569 editorial[\s\S]*ok {4}6569 corrected/)
    assert.equal(await run([resolve(fixtures, 'clean.crv')], quiet), 0)
  } finally {
    if (env === undefined) delete process.env.CARVE_JS_DIR
    else process.env.CARVE_JS_DIR = env
  }
})

// The readiness baseline pins an older carve-js than the one with the CLI table of standard extensions.
const catalogSkip = skip || (existsSync(resolve(jsDir, 'cli/standard-extensions.ts')) ? false : `needs a carve-js with cli/standard-extensions.ts`)

test('a case names a standard extension as the CLI does (carve#6858)', { skip: catalogSkip }, async () => {
  const model = await loadModel(jsDir)
  const options = { extensions: ['carve.listTable'], renderers: { 'carve.listTable': 'standard' } }
  const r = model.run('html', '::: list-table\n- - a\n:::\n', options)
  assert.equal(r.error, undefined)
  assert.match(r.output, /^<table>\n  <tbody>\n    <tr><td>a<\/td><\/tr>/)
  assert.deepEqual(options.extensions, ['carve.listTable'])
  for (const operation of ['fmt', 'ast', 'lint']) assert.equal(model.run(operation, '::: list-table\n- - a\n:::\n', options).error, undefined, operation)
  // A standard renderer that brings document transforms renders through renderWithDocumentTransforms.
  for (const name of ['carve.cite', 'carve.glossary', 'carve.index']) {
    assert.equal(model.run('html', 'a\n', { extensions: [name], renderers: { [name]: 'standard' } }).output, '<p>a</p>', name)
  }
})

test('a Carve 0.2 level-2 heading starts a case as well', () => {
  const [c] = parseCaseFile('== x\n\n- operation: html\n\n```crv\na\n```\n\n```html\n<p>a</p>\n```\n')
  assert.equal(c.id, 'x')
})

test('each expected finding takes its own finding', () => {
  const found = [{ code: 'r', line: 1, column: 1 }, { code: 'r', line: 2, column: 1 }]
  assert.equal(matchDiagnostics(found, [{ code: 'r', line: 1, column: 1 }, { code: 'r', line: 1, column: 1 }]), false)
  assert.equal(matchDiagnostics(found, [{ code: 'r' }, { code: 'r', line: 1, column: 1 }]), true)
  assert.equal(matchDiagnostics(found, [{ code: 'r', severity: 'error' }]), false)
})

test('html keeps trailing spaces significant', () => {
  assert.equal(agrees('html', { output: '<p>a</p>\n' }, '<p>a</p>'), true)
  assert.equal(agrees('html', { output: '<p>a</p>\n' }, '<p>a</p>  '), false)
})
