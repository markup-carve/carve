import { readFileSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

const inventory = JSON.parse(readFileSync(new URL('../resources/markdown-import-inventory.json', import.meta.url)))
const migrate = readFileSync(new URL('../docs/migrate-from-markdown.md', import.meta.url), 'utf8')

test('the same-kind nesting row states the ruled contract, not the lagging engines', () => {
  const row = inventory.constructs.find(construct => construct.construct === 'nested-same-kind-emphasis')
  assert.equal(row.fidelity, 'preserved')
  assert.equal(row.severity, 'info')
  assert.notEqual(row.code, 'structure-unspellable')
  const contract = inventory.constructs.find(construct => construct.code === row.code && construct.construct !== row.construct)
  assert.equal(contract.fidelity, row.fidelity)
})

test('the Markdown migration guide names the contract and the engines behind it', () => {
  const paragraph = migrate.split('\n\n').find(block => block.includes('CommonMark `*(*foo*)*`'))
  assert.match(paragraph, /\{\/\(\{\/foo\/\}\)\/\}/)
  for (const engine of ['carve-php', 'carve-rust']) assert.ok(paragraph.includes(engine), engine)
  assert.ok(!/Its shared Carve\nfallback is/.test(paragraph))
})
