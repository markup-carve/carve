import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import Ajv2020 from 'ajv/dist/2020.js'
import { carveToHtml } from '@markup-carve/carve'

const fixtures = JSON.parse(readFileSync(new URL('../resources/footnote-carrier-recovery-fixtures.json', import.meta.url), 'utf8'))
const schema = JSON.parse(readFileSync(new URL('../resources/html-import-schema.json', import.meta.url), 'utf8'))
const validate = new Ajv2020().compile(schema)

test('shared footnote recovery fixtures use valid report fields and source forms', () => {
  const identities = new Set()
  for (const fixture of fixtures) {
    const identity = JSON.stringify([fixture.mode, fixture.html])
    assert.ok(!identities.has(identity), fixture.name)
    identities.add(identity)
    assert.ok(validate({ mode: fixture.mode, adapter: 'generic', diagnostics: fixture.expectedDiagnostics.map((row) => ({ ...row, message: '' })) }), JSON.stringify(validate.errors))
    const rendered = carveToHtml(fixture.expectedSource)
    assert.ok(rendered.includes('body'), fixture.name)
    for (const name of fixture.forbiddenAuthoredAttributes) {
      assert.ok(!fixture.expectedSource.includes(name), fixture.name)
      assert.ok(!rendered.includes(name), fixture.name)
    }
  }
})
