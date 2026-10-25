import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Ajv2020 } from 'ajv/dist/2020.js'

const schema = JSON.parse(readFileSync(new URL('../resources/render-loss-report.schema.json', import.meta.url), 'utf8'))
const validate = new Ajv2020({ strict: false }).compile(schema)
const loss = {
  code: 'fence-title-dropped',
  target: 'markdown',
  nodeType: 'block',
  message: 'Dropped a code fence title without a language in Markdown',
}
const report = (row) => ({ losses: [row], totalLosses: 1, truncated: false })

test('a no-language fence title has a closed Markdown loss shape', () => {
  assert.equal(validate(report(loss)), true)
  for (const changed of [
    { ...loss, target: 'html' },
    { ...loss, nodeType: 'inline' },
    { ...loss, message: 'Dropped title' },
    { ...loss, format: 'markdown' },
    { ...loss, attribute: 'title' },
  ]) assert.equal(validate(report(changed)), false)
})
