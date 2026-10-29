import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Ajv2020 } from 'ajv/dist/2020.js'

const schema = JSON.parse(readFileSync(new URL('../resources/render-loss-report.schema.json', import.meta.url), 'utf8'))
const validate = new Ajv2020({ strict: false }).compile(schema)
const pos = { startLine: 2, endLine: 4, startColumn: 1, endColumn: 4, startOffset: 7, endOffset: 16 }
const loss = {
  code: 'markdown-container-flattened',
  target: 'markdown',
  nodeType: 'block',
  message: 'Flattened a container into Markdown blocks',
  pos,
}
const included = { ...loss, file: 'snippets/div.crv', includedBy: [{ file: 'docs/d.crv', line: 3, column: 1 }] }
const report = (row) => ({ file: 'docs/d.crv', losses: [row], totalLosses: 1, truncated: false })

test('a loss in included content names its file and include chain', () => {
  assert.equal(validate(report(loss)), true)
  assert.equal(validate(report(included)), true)
  for (const changed of [
    { ...loss, file: 'snippets/div.crv' },
    { ...loss, includedBy: [{ file: 'docs/d.crv', line: 3, column: 1 }] },
    { ...included, includedBy: [] },
    { ...included, includedBy: [{ file: 'docs/d.crv', line: 3 }] },
    { ...loss, pos: { ...pos, file: resolve('docs/snippets/div.crv') } },
  ]) assert.equal(validate(report(changed)), false)
})
