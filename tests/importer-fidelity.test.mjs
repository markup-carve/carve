import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Ajv2020 from 'ajv/dist/2020.js'
import { migrateBbcode, migrateDjot, migrateHtml, migrateMarkdown } from '@markup-carve/carve'

const manifest = JSON.parse(readFileSync(new URL('./importer-fidelity/manifest.json', import.meta.url)))
const schema = JSON.parse(readFileSync(new URL('../resources/importer-fidelity-schema.json', import.meta.url)))
const reportSchema = JSON.parse(readFileSync(new URL('../resources/migration-report-schema.json', import.meta.url)))
const formats = ['html', 'markdown', 'djot', 'bbcode', 'pandoc-json', 'pdf-extraction-json']
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
    if (item.runner === 'external') assert.match(item.repository, /^markup-carve\/[a-z0-9-]+$/)
    for (const diagnostic of item.expected.diagnostics) {
      assert.equal(typeof diagnostic.code, 'string')
      assert.ok(fidelity.includes(diagnostic.fidelity))
      assert.ok(confidence.includes(diagnostic.confidence))
    }
  }
})

test('the reference importer replays every fixture assigned to it', () => {
  const validateReport = new Ajv2020().compile(reportSchema)
  const importers = { html: migrateHtml, markdown: migrateMarkdown, djot: migrateDjot, bbcode: migrateBbcode }
  const referenceCases = manifest.cases.filter(item => item.runner === 'reference')
  assert.deepEqual([...new Set(referenceCases.map(item => item.sourceFormat))].sort(), Object.keys(importers).sort())
  for (const item of referenceCases) {
    const result = importers[item.sourceFormat](item.input)
    assert.equal(validateReport(result.report), true, `${item.id}: ${JSON.stringify(validateReport.errors)}`)
    assert.equal(result.report.schemaVersion, 2, item.id)
    assert.equal(result.report.sourceFormat, item.sourceFormat, item.id)
    assert.deepEqual(
      result.report.diagnostics.map(({ code, fidelity, confidence }) => ({ code, fidelity, confidence })),
      item.expected.diagnostics,
      item.id
    )
  }
})

test('externally replayed fixtures name their release-gate repository', () => {
  const external = manifest.cases.filter(item => item.runner === 'external')
  assert.deepEqual(external.map(item => [item.sourceFormat, item.repository]), [
    ['pandoc-json', 'markup-carve/pandoc-carve'],
    ['pdf-extraction-json', 'markup-carve/pdf-to-carve']
  ])
})
