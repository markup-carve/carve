import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(readFileSync(resolve(root, 'resources/render-loss-report.schema.json'), 'utf8'))
const validate = new Ajv2020({ strict: true }).compile(schema)
const pos = { startLine: 1, endLine: 1, startColumn: 1, endColumn: 12, startOffset: 0, endOffset: 11 }

test('the render-loss report accepts the shared checked-render shape', () => {
  const report = {
    losses: [{ code: 'raw-format-dropped', format: 'latex', target: 'html', nodeType: 'inline', message: 'Dropped inline raw format "latex" while rendering html', pos }],
    totalLosses: 1,
    truncated: false,
  }
  assert.equal(validate(report), true, JSON.stringify(validate.errors))
})

test('the report is closed and its vocabulary is stable', () => {
  assert.equal(validate({ losses: [], totalLosses: 0, truncated: false, unknown: true }), false)
  assert.equal(validate({ losses: [{ code: 'other', format: 'latex', target: 'html', nodeType: 'inline', message: 'x' }], totalLosses: 1, truncated: false }), false)
})
