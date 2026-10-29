import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  BASELINE_PATH, MUTATIONS_PATH, applyEdits, gatedRules, ratchet, readJson, redundantGroups, validateMutations,
} from '../scripts/lib/rule-coverage.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const registry = readJson(repo, 'resources/spec/rules.json')
const map = readJson(repo, MUTATIONS_PATH)
const baseline = readJson(repo, BASELINE_PATH)

const edit = (find, replace = 'x') => ({ file: 'scripts/spec/layout.mjs', find, replace })

test('the committed mutation map is valid against the rule registry', () => {
  assert.deepEqual(validateMutations(map, registry), [])
})

test('every committed edit still finds its site exactly once', () => {
  const read = (file) => readFileSync(resolve(repo, file), 'utf8')
  for (const entry of map.mutations) assert.doesNotThrow(() => applyEdits(entry, read), entry.rule)
})

test('every gated rule has a mutation or a reason it has none', () => {
  const placed = new Set([...map.mutations.map((entry) => entry.rule), ...Object.keys(map.unmapped ?? {})])
  assert.deepEqual(gatedRules(map, registry).filter((id) => !placed.has(id)), [])
})

test('the baseline names only gated rules', () => {
  const gated = new Set(gatedRules(map, registry))
  assert.deepEqual(baseline.uncovered.filter((id) => !gated.has(id)), [])
  assert.deepEqual(Object.keys(baseline.killers).filter((id) => !gated.has(id)), [])
})

test('validation refuses entries that cannot mutate the model', () => {
  const id = registry.rules[0].id
  const errors = validateMutations({
    scopes: ['parsing'],
    mutations: [
      { rule: 'CARVE-P0-999', edits: [edit('a')] },
      { rule: id, edits: [{ file: 'tests/corpus.test.mjs', find: 'a', replace: 'b' }] },
      { rule: id, edits: [edit('same', 'same')] },
    ],
    unmapped: { [id]: 'none' },
  }, registry)
  assert.equal(errors.length, 5, errors.join('\n'))
})

test('an edit must match exactly once', () => {
  const read = () => 'one two two'
  assert.equal(applyEdits({ rule: 'R', edits: [edit('one', '1')] }, read).get('scripts/spec/layout.mjs'), '1 two two')
  assert.throws(() => applyEdits({ rule: 'R', edits: [edit('two')] }, read), /matches 2 times/)
  assert.throws(() => applyEdits({ rule: 'R', edits: [edit('three')] }, read), /matches 0 times/)
  // `$&` in a replacement is text, not a back-reference.
  assert.equal(applyEdits({ rule: 'R', edits: [edit('one', '$&$&')] }, read).get('scripts/spec/layout.mjs'), '$&$& two two')
})

test('the ratchet fails a new uncovered rule, a stale entry and a grown baseline', () => {
  const gated = ['A', 'B', 'C']
  const killed = new Map([['A', 'row-1'], ['B', null]])
  assert.deepEqual(ratchet({ gated, killed, baseline: { uncovered: ['B', 'C'] }, base: { uncovered: ['B', 'C'] } }).failures, [])
  const fresh = ratchet({ gated, killed, baseline: { uncovered: ['B'] } }).failures
  assert.match(fresh.join('\n'), /^C: .*no mutation entry/m)
  const stale = ratchet({ gated, killed, baseline: { uncovered: ['A', 'B', 'C'] } }).failures
  assert.match(stale.join('\n'), /^A: covered now/m)
  const grown = ratchet({ gated, killed, baseline: { uncovered: ['B', 'C'] }, base: { uncovered: ['C'] } }).failures
  assert.match(grown.join('\n'), /^B: added to the uncovered baseline/m)
})

test('rules failing the same rows are redundant', () => {
  const groups = redundantGroups(new Map([['A', ['r1', 'r2']], ['B', ['r2', 'r1']], ['C', ['r1']], ['D', []], ['E', []]]))
  assert.deepEqual(groups, [['A', 'B']])
})

test('a broken rule is killed by its row and a mutation no row sees survives', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'rule-coverage-test-'))
  const corpus = join(scratch, 'corpus')
  mkdirSync(corpus)
  for (const row of ['250-line-endings-and-a-byte-order-mark-3', '01-emphasis']) {
    for (const ext of ['crv', 'html']) copyFileSync(resolve(repo, `tests/corpus/${row}.${ext}`), join(corpus, `${row}.${ext}`))
  }
  const mutations = join(scratch, 'mutations.json')
  const entry = (rule) => map.mutations.find((item) => item.rule === rule)
  writeFileSync(mutations, JSON.stringify({ scopes: map.scopes, mutations: [entry('CARVE-P0-001'), entry('CARVE-P0-002')] }))
  const out = execFileSync(process.execPath, [
    resolve(repo, 'scripts/rule-coverage.mjs'), `--corpus=${corpus}`, `--mutations=${mutations}`,
    `--baseline=${join(scratch, 'none.json')}`, '--rules=CARVE-P0-001,CARVE-P0-002', '--jobs=2',
  ], { encoding: 'utf8' })
  assert.equal(out, 'CARVE-P0-001\t250-line-endings-and-a-byte-order-mark-3\nCARVE-P0-002\tSURVIVED\n')
})
