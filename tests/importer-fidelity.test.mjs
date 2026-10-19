import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Ajv2020 from 'ajv/dist/2020.js'
import { migrateBbcode, migrateDjot, migrateHtml } from '@markup-carve/carve'

const manifest = JSON.parse(readFileSync(new URL('./importer-fidelity/manifest.json', import.meta.url)))
const schema = JSON.parse(readFileSync(new URL('../resources/importer-fidelity-schema.json', import.meta.url)))
const reportSchema = JSON.parse(readFileSync(new URL('../resources/migration-report-schema.json', import.meta.url)))
const formats = ['markdown', 'bbcode', 'pandoc-json', 'pdf-extraction-json']
const fidelity = ['preserved', 'normalized', 'degraded', 'dropped']
const confidence = ['exact', 'inferred', 'fallback']

test('the importer fidelity manifest is a replayable version 2 release contract', () => {
  const validate = new Ajv2020().compile(schema)
  assert.equal(validate(manifest), true, JSON.stringify(validate.errors))
  assert.equal(manifest.schemaVersion, 2)
  assert.deepEqual([...new Set(manifest.cases.map(item => item.sourceFormat))].sort(), [...formats].sort())
  for (const item of manifest.cases) {
    assert.match(item.id, /^[a-z0-9-]+$/)
    assert.equal(typeof item.input, 'string')
    assert.equal(typeof item.expected.output, 'string')
    if (item.runner === 'external') assert.match(item.repository, /^markup-carve\/[a-z0-9-]+$/)
    for (const diagnostic of item.expected.diagnostics) {
      assert.equal(typeof diagnostic.code, 'string')
      assert.ok(fidelity.includes(diagnostic.fidelity))
      assert.ok(confidence.includes(diagnostic.confidence))
    }
  }
})

test('opaque raw HTML and incomplete assessment fail closed under the report schema', () => {
  const validate = new Ajv2020().compile(reportSchema)
  const raw = migrateHtml('<x-widget>opaque</x-widget>', { mode: 'roundtrip' }).report
  assert.equal(validate(raw), true, JSON.stringify(validate.errors))
  assert.ok(raw.diagnostics.some(({ code, fidelity }) => code === 'raw-preserved' && fidelity === 'degraded'))

  const incomplete = {
    schemaVersion: 2,
    sourceFormat: 'future-format',
    diagnostics: [{
      code: 'diagnostics-truncated', message: 'report cap reached', severity: 'warning',
      fidelity: 'dropped', confidence: 'fallback'
    }]
  }
  assert.equal(validate(incomplete), true, JSON.stringify(validate.errors))
  incomplete.diagnostics[0].fidelity = 'degraded'
  assert.equal(validate(incomplete), false, 'truncation must not validate as merely degraded')
})

test('the pinned engine retains its pre-assessment compatibility boundary', () => {
  const validate = new Ajv2020().compile(reportSchema)
  for (const [sourceFormat, result] of [
    ['djot', migrateDjot('_emphasis_')],
    ['bbcode', migrateBbcode('[b]strong[/b]')]
  ]) {
    assert.equal(validate(result.report), true, `${sourceFormat}: ${JSON.stringify(validate.errors)}`)
    assert.deepEqual(
      result.report.diagnostics.map(({ code, fidelity, confidence }) => ({ code, fidelity, confidence })),
      [{ code: 'fidelity-unverified', fidelity: 'dropped', confidence: 'fallback' }],
      sourceFormat
    )
  }
})

test('the Markdown contract covers literal inputs and source-located construct families', () => {
  const inventory = JSON.parse(readFileSync(new URL('../resources/markdown-import-inventory.json', import.meta.url)))
  const core = manifest.cases.filter(row => row.runner === 'core')
  for (const construct of inventory.constructs) {
    assert.ok(core.some(row => row.constructs?.includes(construct.construct)), construct.construct)
  }
  for (const fixture of core) {
    for (const row of fixture.expected.diagnostics) {
      const contract = inventory.constructs.find(construct => construct.code === row.code)
      if (contract) assert.equal(row.fidelity, contract.fidelity, fixture.id)
    }
  }
})

test('Markdown construct paths and external fixture boundaries are enforced', () => {
  const validateReport = new Ajv2020().compile(reportSchema)
  const report = { schemaVersion: 2, sourceFormat: 'markdown', diagnostics: [{
    code: 'markdown-strong', message: 'Strong emphasis.', severity: 'info', fidelity: 'preserved', confidence: 'exact', path: 'line:1'
  }] }
  assert.equal(validateReport(report), true)
  report.diagnostics[0].path = 'line:0'
  assert.equal(validateReport(report), false)
  delete report.diagnostics[0].path
  assert.equal(validateReport(report), false)
  const validateManifest = new Ajv2020().compile(schema)
  const external = structuredClone(manifest.cases.find(row => row.runner === 'external'))
  external.expected.exit = 0
  assert.equal(validateManifest({ schemaVersion: 2, cases: [external] }), false)
})

test('a dropped BBCode quote attribution field is a located exact loss', () => {
  const validate = new Ajv2020().compile(reportSchema)
  const row = { code: 'bbcode-quote-field-dropped', message: 'Dropped the quote attribution field user_id.', severity: 'warning', fidelity: 'dropped', confidence: 'exact', path: 'line:1' }
  assert.equal(validate({ schemaVersion: 2, sourceFormat: 'bbcode', diagnostics: [row] }), true, JSON.stringify(validate.errors))
  for (const change of [{ path: undefined }, { path: 'line:0' }, { fidelity: 'degraded' }, { confidence: 'fallback' }, { severity: 'info' }]) {
    const changed = { ...row, ...change }
    if ('path' in change && change.path === undefined) delete changed.path
    assert.equal(validate({ schemaVersion: 2, sourceFormat: 'bbcode', diagnostics: [changed] }), false, JSON.stringify(change))
  }
  const fixture = manifest.cases.find(item => item.id === 'bbcode-quote-field-dropped')
  assert.equal(fixture.input, '[quote="alice" post_id=12 time=1700000000 user_id=3]q3[/quote]')
  assert.deepEqual(fixture.expected.diagnostics.find(item => item.code === row.code),
    { code: row.code, severity: 'warning', fidelity: 'dropped', confidence: 'exact', path: 'line:1' })
})

test('a case-only heading fragment rewrite is a located normalized fixup', () => {
  const validate = new Ajv2020().compile(reportSchema)
  const row = {
    code: 'link-fragment-case-rewritten',
    message: 'Rewrote link fragment #install-steps to #Install-Steps, the one heading id it matches without regard to case.',
    severity: 'info', fidelity: 'normalized', confidence: 'inferred', path: 'link:b.md#install-steps'
  }
  assert.equal(validate({ schemaVersion: 2, sourceFormat: 'markdown', diagnostics: [row] }), true, JSON.stringify(validate.errors))
  for (const change of [{ path: undefined }, { path: 'line:3' }, { path: 'link:b.md' }, { fidelity: 'preserved' }, { confidence: 'exact' }, { severity: 'warning' }, { message: 'Rewrote a fragment.' }]) {
    const changed = { ...row, ...change }
    if ('path' in change && change.path === undefined) delete changed.path
    assert.equal(validate({ schemaVersion: 2, sourceFormat: 'markdown', diagnostics: [changed] }), false, JSON.stringify(change))
  }
  const fixture = manifest.cases.find(item => item.id === 'link-fragment-case-rewritten')
  assert.equal(fixture.input, '# Install Steps\n\nSee [steps](#install-steps).\n')
  assert.equal(fixture.expected.output, '# Install Steps\n\nSee [steps](#Install-Steps).\n')
  assert.deepEqual(fixture.expected.diagnostics.at(-1),
    { code: row.code, severity: 'info', fidelity: 'normalized', confidence: 'inferred', path: 'link:#install-steps' })
})

test('externally replayed fixtures name their release-gate repository', () => {
  const external = manifest.cases.filter(item => item.runner === 'external')
  assert.deepEqual(external.map(item => [item.sourceFormat, item.repository]), [
    ['pandoc-json', 'markup-carve/pandoc-carve'],
    ['pandoc-json', 'markup-carve/pandoc-carve'],
    ['pdf-extraction-json', 'markup-carve/pdf-to-carve']
  ])
})
