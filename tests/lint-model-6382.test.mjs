import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const model = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-model.json', import.meta.url), 'utf8'))
const cases = JSON.parse(readFileSync(new URL('../spec/0.2/conformance/clause-cases.json', import.meta.url), 'utf8')).cases

// carve#6382: only lists and paragraphs between two sibling lists keep the deeper one open (C2-B-055).
test('the prior-list lookup of list-marker-below-content-column stops at a block that closes the list', () => {
  const row = model.rules.find(({ id }) => id === 'list-marker-below-content-column')
  const closer = row.let.closer_index?.lookup
  assert.ok(closer, 'the row must find the last closing sibling')
  assert.equal(closer.before, true)
  assert.deepEqual(closer.key.if[0], { not: { in: [{ f: 'item.type' }, ['list', 'paragraph']] } })
  assert.deepEqual(closer.value, { f: 'ancestor_ids.1' })
  assert.deepEqual(row.let.prev_index?.lookup?.value, { v: 'prev_list' })
  const bound = row.report[1].when.all.find((term) => term.any)
  assert.deepEqual(bound, {
    any: [
      { not: { ge: [{ v: 'closer_index' }, 0] } },
      { lt: [{ v: 'closer_index' }, { v: 'prev_index' }] },
    ],
  })
})

test('closed and open deeper lists are pinned by clause cases', () => {
  const byId = new Map(cases.map((entry) => [entry.id, entry]))
  for (const id of ['CC-1645', 'CC-1646', 'CC-1647', 'CC-1648', 'CC-1649', 'CC-1630']) {
    assert.deepEqual(byId.get(id)?.expected.notReported, ['list-marker-below-content-column'], id)
  }
  for (const id of ['CC-1650', 'CC-1651', 'CC-1652', 'CC-1628']) {
    assert.ok(byId.get(id)?.expected.diagnostics.some(({ code }) => code === 'list-marker-below-content-column'), id)
  }
})
