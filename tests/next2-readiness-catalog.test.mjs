import { test } from 'node:test'
import assert from 'node:assert/strict'
import { catalogRole, forbiddenCatalogReports } from '../scripts/next2-readiness-catalog.mjs'

test('catalog status selects the shared trigger denominator', () => {
  assert.equal(catalogRole('obsolete'), 'excluded')
  assert.equal(catalogRole('void'), 'excluded')
  assert.equal(catalogRole('engine-local'), 'engine-local')
  for (const status of ['kept', 'new', 'renamed']) assert.equal(catalogRole(status), 'shared')
})

test('historical diagnostics on clause cases fail for every engine output channel', () => {
  const cases = [{ area: 'clauses', id: 'CC-1' }, { area: 'examples', id: 'example-1' }]
  const rules = [{ id: 'old', status: 'obsolete' }, { id: 'empty', status: 'void' }, { id: 'writer-refused', status: 'engine-local' }]
  const outputs = {
    js: [{ diagnostics: [{ code: 'old' }] }, { diagnostics: [{ code: 'old' }] }],
    php: [{ stdoutDiagnostics: [{ code: 'empty' }] }, {}],
    rs: [{ stderrDiagnostics: [{ code: 'old' }, { code: 'writer-refused' }] }, {}],
  }
  assert.deepEqual(forbiddenCatalogReports(cases, outputs, rules), ['js/CC-1: old', 'php/CC-1: empty', 'rs/CC-1: old'])
})
