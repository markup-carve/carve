import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { miscount } from '../scripts/spec/participants.mjs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const map = JSON.parse(read('resources/spec/ownership-procedure.json'))
const layout = read('resources/spec/01-layout.ebnf')
const checker = read('scripts/spec/layout.mjs')
const guide = read('docs/ownership-procedure.md')
const rules = new Set(JSON.parse(read('resources/spec/rules.json')).rules.map(rule => rule.id))

test('the ownership map covers the complete Part 0 inventory and live qualifications', () => {
  const required = [...layout.matchAll(/NORMATIVE\s*\[(CARVE-P0-\d+)\]/g)].map(match => match[1])
  assert.equal(miscount({ label: 'Part 0 rules', actual: required.length, expected: 22 }), null)
  const mapped = map.phases.flatMap(phase => phase.rules)
  assert.equal(mapped.length, new Set(mapped).size, 'Each Part 0 rule needs one primary phase')
  assert.deepEqual([...new Set(mapped.filter(id => id.startsWith('CARVE-P0-')))].sort(), [...required].sort())
  for (const id of [...mapped, ...map.qualifications]) {
    assert.ok(rules.has(id), `inactive or unknown rule: ${id}`)
    assert.ok(guide.includes(id), `guide omits ${id}`)
  }
})

test('the map preserves decision order and points to existing collector helpers', () => {
  assert.deepEqual(map.phases.map(phase => phase.id), [
    'normalize', 'order', 'strip', 'owner', 'fold', 'classify', 'transition', 'exceptions',
  ])
  // Every step PART 0 names is a phase of the map, in the order the clause gives.
  assert.deepEqual(map.phases.map(phase => phase.step), ['INPUT', 'ORDER', 'O1', 'O2', 'O3', 'O4', 'T', 'X1-X3'])
  for (const step of ['O1', 'O2', 'O3', 'O4', 'X1', 'X2', 'X3']) {
    assert.ok(new RegExp(`^ {5}${step} [A-Z]`, 'm').test(layout), `PART 0 no longer names step ${step}`)
  }
  assert.match(layout, /^ {11}T {2}TRANSITIONS\./m)
  let last = -1
  for (const phase of map.phases) {
    const heading = guide.indexOf(`## ${phase.title}`)
    assert.ok(heading > last, `missing or reordered guide phase: ${phase.id}`)
    last = heading
    const next = guide.indexOf('\n## ', heading + 1)
    const section = guide.slice(heading, next === -1 ? undefined : next)
    for (const id of phase.rules) assert.ok(section.includes(id), `${phase.id} omits its rule ${id}`)
    assert.ok(phase.checkerHelpers.length > 0)
    for (const helper of phase.checkerHelpers) {
      assert.match(helper, /^[A-Za-z][A-Za-z0-9]*$/)
      assert.ok(new RegExp(`^(?:export )?function ${helper}\\(`, 'm').test(checker), `missing helper: ${helper}`)
    }
  }
})

test('the reviewed ownership and boundary banks retain their required populations', () => {
  assert.equal(map.evidence.fixtures.length, 2)
  for (const { path, count } of map.evidence.fixtures) {
    const fixtures = JSON.parse(read(path))
    assert.equal(miscount({ label: path, actual: fixtures.length, expected: count }), null)
  }
})
