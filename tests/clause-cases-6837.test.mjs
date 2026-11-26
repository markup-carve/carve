import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const cases = JSON.parse(read('../spec/0.2/conformance/clause-cases.json')).cases
const byId = new Map(cases.map((entry) => [entry.id, entry]))

test('no render case expects a line feed after its last closing tag (carve#6837)', () => {
  const trailing = cases.filter((entry) => typeof entry.expected?.html === 'string' && /<\/[a-z0-9]+>\n$/.test(entry.expected.html))
  assert.deepEqual(trailing.map(({ id }) => id), [])
  for (const id of ['CC-2237', 'CC-2238', 'CC-2239', 'CC-2240', 'CC-2246', 'CC-2248']) {
    assert.ok(byId.get(id).expected.html.endsWith('</table>'), id)
  }
})
