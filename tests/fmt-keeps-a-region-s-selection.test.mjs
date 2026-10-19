/*
 * CARVE-P11-073: `fmt` does not change what an include region selects
 * (carve#3330). Engines read `tests/fixtures/region-marker-fmt.json` and assert
 * `fmt(source) == fmt` byte for byte; this file checks the fixture itself and
 * the pinned carve-js against it.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { carveToCarve } from '@markup-carve/carve'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const fixture = JSON.parse(readFileSync(new URL('./fixtures/region-marker-fmt.json', import.meta.url), 'utf8'))

// CARVE-P6-001 I1b (a): only the `%%` line form is a marker in a Carve include.
const MARKER = /^[ \t]*%%[ \t]*#(region|endregion)(?:[ \t]+([A-Za-z0-9_][A-Za-z0-9_-]*))?[ \t]*$/

/** Every region's selected source: the physical lines strictly between its markers. */
function regions(source) {
  const lines = source.split('\n')
  const open = []
  const selected = {}
  lines.forEach((line, index) => {
    const match = MARKER.exec(line)
    if (match === null) return
    if (match[1] === 'region') {
      open.push({ name: match[2], from: index + 1 })
      return
    }
    const region = open.pop()
    assert.ok(region !== undefined, `unmatched closer on line ${index + 1}`)
    if (match[2] !== undefined) assert.equal(match[2], region.name, `mismatched closer on line ${index + 1}`)
    selected[region.name] = lines.slice(region.from, index).map((l) => `${l}\n`).join('')
  })
  assert.equal(open.length, 0, 'an unclosed region')
  return selected
}

test('the region-marker fixture is version 1 of CARVE-P11-073', () => {
  assert.equal(fixture.version, 1)
  assert.equal(fixture.clause, 'CARVE-P11-073')
  assert.ok(fixture.rows.length > 0)
})

for (const row of fixture.rows) {
  test(`${row.id}: each region selects the same lines before and after fmt`, () => {
    assert.deepEqual(regions(row.source), row.regions)
    assert.deepEqual(regions(row.fmt), row.regions)
  })

  test(`${row.id}: the expected output reads as the source does`, () => {
    assert.equal(renderDoc(parse(row.fmt)), renderDoc(parse(row.source)))
  })

  test(`${row.id}: the pinned carve-js writes the expected bytes`, () => {
    const compare = () => assert.equal(carveToCarve(row.source), row.fmt)
    if (row.aheadOfPin !== true) return compare()
    assert.throws(compare, { code: 'ERR_ASSERTION' }, `${row.id} is declared aheadOfPin but the pinned engine passes it: drop the flag`)
  })
}
