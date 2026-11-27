import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('6934: the directory migration report has its own diagnostic contract', () => {
  const tooling = read('../spec/0.2/tooling.md')
  const writer = read('../spec/0.2/writer.md')
  const dataReadme = read('../spec/0.2/data/README.md')
  const reportSchema = JSON.parse(read('../docs/public/migration-report-schema.json'))
  const scope = tooling.split('**C2-T-003**')[1].split('\n')[0]
  assert.match(scope, /Outside this specification/)
  assert.match(scope, /directory import/)
  assert.match(writer, /\*\*C2-W-106\*\*[^\n]*directory migration report/)
  assert.match(dataReadme, /`lint-rules\.json` \|[^\n]*directory migration report/)
  assert.match(reportSchema.description, /outside the shared diagnostic record/)
  assert.deepEqual(reportSchema.properties.diagnostics.items.properties.severity.enum, ['info', 'warning', 'error'])
  assert.equal(reportSchema.properties.diagnostics.items.properties.channel, undefined)
})
