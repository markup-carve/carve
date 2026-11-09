import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'

test('CARVE-P11-073 leaves a region marker between two lists', () => {
  const blocks = parse('- a\n%% #region sample\n- b\n%% #endregion sample\n').blocks
  assert.equal(blocks.length, 2)
  assert.deepEqual(blocks.map((block) => block.items.map((item) => item.blocks[0].lines[0])), [['a'], ['b']])
})
