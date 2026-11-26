import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const cases = JSON.parse(read('../spec/0.2/conformance/clause-cases.json')).cases
const byId = new Map(cases.map((entry) => [entry.id, entry]))

test('frontmatter outside the profile writes nothing and is reported once (carve#6877)', () => {
  for (const [id, profile] of [['CC-2478', 'comment'], ['CC-2479', 'minimal']]) {
    const entry = byId.get(id)
    assert.equal(entry.options.profile, profile)
    assert.equal(entry.expected.html, '<p>x</p>')
    assert.deepEqual(entry.expected.diagnostics.map(({ code, line, column }) => `${line}:${column} ${code}`), ['1:1 profile-construct-degraded'])
    assert.equal(entry.expected.diagnosticsComplete, true)
  }
})
