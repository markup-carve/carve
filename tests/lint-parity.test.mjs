import assert from 'node:assert/strict'
import test from 'node:test'
import { differences, generate } from '../scripts/lint-parity.mjs'

test('the generator is deterministic per seed', () => {
  assert.deepEqual(generate(7, 50), generate(7, 50))
  assert.notDeepEqual(generate(7, 50), generate(8, 50))
})

test('the generator produces every listed block construct', () => {
  const all = generate(1, 2000).join('\n')
  for (const marker of ['\n> ', '\n- ', '\n1. ', '\n:: ', '\n: ', '[^', ':::', '|= ', '^ ', '```', '{#', '{{ ', '%%', '*[', '$$', '\t']) {
    assert.ok(all.includes(marker), marker)
  }
})

test('differences are classified by count, then range, then message', () => {
  const d = (code, start, end, message = 'm') => ({ code, start, end, message })
  assert.deepEqual(differences([[d('a', 0, 1)], [d('a', 0, 1)], []]), [{ rule: 'a', kind: 'count', pattern: 'rs<js=php' }])
  assert.deepEqual(differences([[d('a', 0, 1)], [d('a', 0, 2)], [d('a', 0, 1)]]), [{ rule: 'a', kind: 'range', pattern: 'js=rs<php' }])
  assert.deepEqual(differences([[d('a', 0, 1)], [d('a', 0, 1)], [d('a', 0, 1, 'n')]]), [{ rule: 'a', kind: 'message', pattern: 'js=php<rs' }])
  assert.deepEqual(differences([[d('a', 0, 1)], [d('a', 0, 1)], [d('a', 0, 1)]]), [])
})
