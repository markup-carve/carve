import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const cases = JSON.parse(read('../spec/0.2/conformance/clause-cases.json')).cases
const byId = new Map(cases.map((entry) => [entry.id, entry]))

test('CC-1354 ends with status 0 once the djot- rows are off (carve#6833, C2-T-050, C2-W-156)', () => {
  const entry = byId.get('CC-1354')
  assert.equal(entry.expected.status, 0)
  assert.equal(entry.expected.stdout, 'a {~s~} b\n')
  assert.ok(!entry.why.includes('djot-subscript-tilde-braced'))
})
