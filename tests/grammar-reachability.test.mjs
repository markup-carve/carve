/*
 * The reachability gate's own behavior.
 *
 * The gate it guards (scripts/grammar-reachability-check.mjs) exists because a
 * production nothing exercises is a check that cannot fail. A gate that cannot
 * fail is the same defect one level up, so the failure directions are pinned
 * here rather than trusted.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import * as ohm from 'ohm-js'
import { classifyRules, positivelyReachable, recordReachedRules, START_RULES } from '../scripts/spec/grammar-reach.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const core = ohm.grammar(readFileSync(resolve(repo, 'resources/carve-core.ohm'), 'utf8'))
const declared = new Set(Object.keys(core.rules))

const ledger = new Map()
for (const line of readFileSync(resolve(repo, 'resources/grammar-corpus-coverage.txt'), 'utf8').split('\n')) {
  const row = line.trim()
  if (!row || row.startsWith('#')) continue
  const [rule, kind] = row.split(/\s+/)
  ledger.set(rule, kind)
}

test('a rule mentioned only inside a lookahead is not positively reachable', () => {
  const g = ohm.grammar(`
    G {
      start  = ~guard body
      guard  = "!"
      body   = leaf+
      leaf   = "a"
    }
  `)
  const reachable = positivelyReachable(g, ['start'])
  assert.ok(reachable.has('body'), 'a positive application is reachable')
  assert.ok(reachable.has('leaf'), 'reachability is transitive through positive applications')
  assert.ok(!reachable.has('guard'), 'a rule only under `~` never produces a node, so it is not reachable')
})

test('positivelyReachable refuses a start rule the grammar does not declare', () => {
  const g = ohm.grammar('G { start = "x" }')
  assert.throws(() => positivelyReachable(g, ['nosuch']), /not declared by the grammar/)
})

test('the recorder observes matches and puts the prototype back', () => {
  const g = ohm.grammar('G { start = leaf+  leaf = "a" }')
  const proto = Object.getPrototypeOf(g)
  const before = proto.match

  const { reached, counts, restore } = recordReachedRules(new Set(['start', 'leaf']))
  assert.notEqual(proto.match, before, 'the seam is installed')
  g.match('aaa', 'start')
  restore()

  assert.equal(proto.match, before, 'the seam is removed again')
  assert.ok(counts.walked > 0, 'a successful match yields a CST to walk')
  assert.deepEqual([...reached].sort(), ['leaf', 'start'])
})

test('a failed match contributes no rules', () => {
  const g = ohm.grammar('G { start = "a" }')
  const { reached, counts, restore } = recordReachedRules(new Set(['start']))
  g.match('zzz', 'start')
  restore()
  assert.equal(counts.matched, 1)
  assert.equal(counts.walked, 0, 'nothing to walk, so nothing is claimed as covered')
  assert.equal(reached.size, 0)
})

test('every start rule the gate measures against exists', () => {
  const missing = START_RULES.filter((r) => !declared.has(r))
  assert.deepEqual(missing, [], `START_RULES names rule(s) that are gone: ${missing.join(', ')}`)
})

test('the ledger names only rules the grammar declares', () => {
  const stale = [...ledger.keys()].filter((r) => !declared.has(r)).sort()
  assert.deepEqual(stale, [], `entries for rules that no longer exist pin nothing: ${stale.join(', ')}`)
})

test('the ledger agrees with the grammar about which rules are lookahead-only', () => {
  const { lookaheadOnly } = classifyRules(core)
  const declaredLookahead = [...ledger].filter(([, k]) => k === 'LOOKAHEAD').map(([r]) => r).sort()
  assert.deepEqual([...lookaheadOnly].sort(), declaredLookahead)
})

test('an orphan production is not filed as a lookahead exemption', () => {
  // The two are one subtraction apart and mean opposite things: a lookahead-only
  // rule has a caller and cannot produce a node, an orphan has no caller at all.
  // Collapsing them would let the deadest production the gate can find be waived.
  const g = ohm.grammar(`
    G {
      start   = ~guard body
      guard   = "!"
      body    = "a"
      nobody  = "z"
    }
  `)
  const { positive, lookaheadOnly, orphans } = classifyRules(g, ['start'])
  assert.ok(positive.has('body'))
  assert.deepEqual([...lookaheadOnly].sort(), ['guard'], 'reachable, but only under `~`')
  assert.deepEqual([...orphans].sort(), ['nobody'], 'referenced by nothing at all')
})

test('the grammar has no orphan production that the ledger does not declare', () => {
  const { orphans } = classifyRules(core)
  const declaredOrphans = [...ledger].filter(([, k]) => k === 'ORPHAN').map(([r]) => r).sort()
  assert.deepEqual([...orphans].sort(), declaredOrphans)
})

/*
 * The reason column is a claim, not a note: each GAP says a spelling exists that
 * would close it. An entry whose spelling does not reach its rule would send the
 * next person to write a corpus document that changes nothing.
 */
const CLOSING_SPELLINGS = {
  at: ['a @ b', 'inlines'],
  sqEsc: ["{title='a\\'b'}", 'attrs'],
  spaceChar: ['```\na\n``` \n', 'doc'],
  rich: ['/*a // b*/', 'inlines'],
  delimRun: ['/*a // b*/', 'inlines'],
  dRun: ['/*a // b*/', 'inlines'],
}

test('every declared GAP has a spelling, and every spelling reaches its rule', () => {
  const gaps = [...ledger].filter(([, k]) => k === 'GAP').map(([r]) => r).sort()
  assert.deepEqual(gaps, Object.keys(CLOSING_SPELLINGS).sort(), 'a GAP with no spelling here is an unverified claim')

  for (const [rule, [src, start]] of Object.entries(CLOSING_SPELLINGS)) {
    const { reached, restore } = recordReachedRules(declared)
    const m = core.match(src, start)
    restore()
    assert.ok(m.succeeded(), `${rule}: ${JSON.stringify(src)} must parse as ${start}\n  ${m.message}`)
    assert.ok(
      reached.has(rule),
      `${rule}: ${JSON.stringify(src)} parses but does not reach ${rule}, so the ledger's reason is wrong`,
    )
  }
})

test('a positive lookahead keeps its rule in the question', () => {
  // `&x` puts x in the CST where `~x` does not, and carve-core.ohm uses both.
  // Treating them alike files a reachable rule as one no document could cover.
  const g = ohm.grammar('G { start = &ahead body   ahead = "a"   body = "a" "b" }')
  const reachable = positivelyReachable(g, ['start'])
  assert.ok(reachable.has('ahead'), 'a rule under `&` is still positively reachable')

  const { reached, restore } = recordReachedRules(new Set(['ahead']))
  g.match('ab', 'start')
  restore()
  assert.ok(reached.has('ahead'), 'and a match really does reach it')
})
