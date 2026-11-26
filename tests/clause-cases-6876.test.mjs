import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const cases = JSON.parse(read('../spec/0.2/conformance/clause-cases.json')).cases
const byId = new Map(cases.map((entry) => [entry.id, entry]))
const at = (id) => byId.get(id).expected.diagnostics.map(({ code, line, column }) => `${line}:${column} ${code}`)

test('a definition outside the profile is reported, an abbreviation definition is not (carve#6876)', () => {
  assert.deepEqual(at('CC-2475'), ['1:1 profile-construct-degraded', '3:15 profile-construct-degraded', '5:1 profile-construct-degraded'])
  assert.deepEqual(at('CC-2476'), ['3:1 profile-construct-degraded', '5:3 profile-construct-degraded'])
  for (const id of ['CC-2475', 'CC-2476', 'CC-2477']) assert.equal(byId.get(id).expected.diagnosticsComplete, true)
})

test('a comment of each form outside the profile is reported once (carve#6876)', () => {
  assert.deepEqual(at('CC-2477'), ['1:2 profile-construct-degraded', '3:1 profile-construct-degraded', '7:3 profile-construct-degraded'])
})
