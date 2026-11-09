import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { carveToCarve } from '@markup-carve/carve'

const item = (source) => parse(source).blocks[0].items[0]

test('CARVE-P11-041 folds X into the checked default', () => {
  assert.deepEqual(item('- [X] done\n'), item('- [x] done\n'))
  assert.equal(item('- [X] done\n').taskState, undefined)
  assert.equal(carveToCarve('- [X] done\n'), '- [x] done\n')
})

test('CARVE-P11-041 keeps a nondefault open-state spelling', () => {
  assert.equal(item('- [_] open\n').taskState, '_')
  assert.equal(carveToCarve('- [_] open\n'), '- [_] open\n')
})
