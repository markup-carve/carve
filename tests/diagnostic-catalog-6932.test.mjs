import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('6932: AST migration loss is a shared diagnostic code', () => {
  const catalog = JSON.parse(read('../spec/0.2/data/lint-rules.json')).rules
  const row = catalog.find(({ id }) => id === 'migration-loss')
  assert.ok(row)
  assert.equal(row.channel, 'render-loss')
  assert.equal(row.severity, 'warning')
  assert.ok(row.clauses.includes('C2-A-180'))
  assert.ok(row.messages.length)
  const table = read('../spec/0.2/writer.md').split('### The codes of the parse channel and of the render-loss channel')[1].split(/^### /m)[0]
  assert.match(table, /^\| `migration-loss` \| render-loss \| warning \|/m)
})
