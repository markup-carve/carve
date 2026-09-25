import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Ajv2020 from 'ajv/dist/2020.js'
import { migrateBbcode, migrateDjot, migrateHtml, migrateMarkdown } from '@markup-carve/carve'

const manifest = JSON.parse(readFileSync(new URL('./importer-fidelity/manifest.json', import.meta.url)))
const schema = JSON.parse(readFileSync(new URL('../resources/importer-fidelity-schema.json', import.meta.url)))
const reportSchema = JSON.parse(readFileSync(new URL('../resources/migration-report-schema.json', import.meta.url)))
const formats = ['pandoc-json', 'pdf-extraction-json']
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

test('built-in importers without construct-level evidence report that boundary explicitly', () => {
  const validate = new Ajv2020().compile(reportSchema)
  for (const [sourceFormat, result] of [
    ['markdown', migrateMarkdown('**strong**')],
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

test('a known ordered task loss is reported beside the incomplete-assessment row', () => {
  const result = migrateMarkdown('1. [x] done\n')
  const validate = new Ajv2020().compile(reportSchema)
  assert.equal(validate(result.report), true, JSON.stringify(validate.errors))
  assert.equal(result.value, '1. [x] done\n')
  const rows = result.report.diagnostics.map(({ code, fidelity, confidence }) => ({ code, fidelity, confidence })).sort((a, b) => a.code.localeCompare(b.code))
  const expected = [
    { code: 'fidelity-unverified', fidelity: 'dropped', confidence: 'fallback' },
    { code: 'structure-unspellable', fidelity: 'dropped', confidence: 'exact' },
  ]
  assert.deepEqual(rows, expected)
})

test('externally replayed fixtures name their release-gate repository', () => {
  const external = manifest.cases.filter(item => item.runner === 'external')
  assert.deepEqual(external.map(item => [item.sourceFormat, item.repository]), [
    ['pandoc-json', 'markup-carve/pandoc-carve'],
    ['pandoc-json', 'markup-carve/pandoc-carve'],
    ['pdf-extraction-json', 'markup-carve/pdf-to-carve']
  ])
})
