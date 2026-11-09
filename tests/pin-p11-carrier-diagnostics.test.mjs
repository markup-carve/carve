import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'

const schema = JSON.parse(readFileSync(new URL('../resources/migration-report-schema.json', import.meta.url), 'utf8'))
const validate = new Ajv2020({ strict: true }).compile(schema)
const report = (code, fidelity, confidence) => ({
  schemaVersion: 2,
  sourceFormat: 'markdown',
  diagnostics: [{ code, message: 'carrier marker cannot be restored', severity: 'warning', fidelity, confidence }],
})

test('CARVE-P11-063 requires a degraded fallback for damaged carrier markers', () => {
  for (const code of ['carrier-markers-damaged', 'carrier-marker-dropped']) {
    assert.equal(validate(report(code, 'degraded', 'fallback')), true, JSON.stringify(validate.errors))
    assert.equal(validate(report(code, 'preserved', 'fallback')), false)
    assert.equal(validate(report(code, 'degraded', 'exact')), false)
  }
})
