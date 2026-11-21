// The formatted-source tab's line diff: a minimal script that rebuilds both sides.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { diffLines, foldDiff } from '../docs/.vitepress/line-diff.js'

const side = (entries, keep) => entries.filter((e) => e.kind === 'same' || e.kind === keep).map((e) => e.text)

test('the script rebuilds both texts and is minimal', () => {
  const entries = diffLines('a\nb\nc\nd\n', 'a\nx\nc\nd\ne\n')
  assert.deepEqual(side(entries, 'del'), ['a', 'b', 'c', 'd'])
  assert.deepEqual(side(entries, 'add'), ['a', 'x', 'c', 'd', 'e'])
  assert.equal(entries.filter((e) => e.kind !== 'same').length, 3)
})

test('random edits round-trip', () => {
  let seed = 7
  const rand = (n) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n
  for (let round = 0; round < 300; round++) {
    const a = Array.from({ length: rand(12) }, () => 'abcd'[rand(4)])
    const b = Array.from({ length: rand(12) }, () => 'abcd'[rand(4)])
    const entries = diffLines(a.map((l) => `${l}\n`).join(''), b.map((l) => `${l}\n`).join(''))
    assert.deepEqual(side(entries, 'del'), a)
    assert.deepEqual(side(entries, 'add'), b)
  }
})

test('identical texts give only unchanged lines', () => {
  assert.deepEqual(diffLines('x\ny\n', 'x\ny\n').map((e) => e.kind), ['same', 'same'])
})

test('long unchanged runs fold, keeping context around changes', () => {
  const before = Array.from({ length: 20 }, (_, i) => `l${i}`).join('\n') + '\n'
  const after = before.replace('l10\n', 'L10\n')
  const folded = foldDiff(diffLines(before, after), 2)
  assert.deepEqual(folded.map((e) => e.kind === 'skip' ? `skip${e.count}` : e.kind),
    ['skip8', 'same', 'same', 'del', 'add', 'same', 'same', 'skip7'])
})
