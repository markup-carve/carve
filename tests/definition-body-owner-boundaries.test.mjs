import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'

const cases = [
  {
    name: 'tabbed fence with an in-body closer',
    source: ':: t\n: a\n\t```\n  ```\n',
    owner: ['deflist', 'dd', 'code'],
    code: '',
  },
  {
    name: 'tabbed fence with a closer below the body',
    source: ':: t\n: a\n\t```\n ```\n',
    // The fence opens with no closer (carve#4018); the line below the body ends it.
    owner: ['deflist', 'dd', 'code'],
    code: '',
  },
  {
    name: 'nested marker at the invisible note body column',
    source: '. d\n   [^n]: e\n     - a\n',
    owner: ['list', 'item', 'para'],
    noteLines: ['e', '- a'],
  },
  {
    name: 'nested marker below the note body column is text of the note (carve#4160)',
    source: '. d\n   [^n]: e\n    - a\n',
    owner: ['list', 'item', 'para'],
    noteLines: ['e', '- a'],
  },
  {
    name: 'definition fence with payload and a closer at its authored base',
    source: ':: m\n: l\n     ```\ne\n     ```\n',
    // The fence opens with no closer (carve#4018); the line below the body ends it.
    owner: ['deflist', 'dd', 'code'],
    code: '',
  },
  {
    name: 'definition fence with a closer outside its body',
    source: ':: m\n: l\n     ```\ne\n ```\n',
    // The fence opens with no closer (carve#4018); the line below the body ends it.
    owner: ['deflist', 'dd', 'code'],
    code: '',
  },
]

for (const { name, source, owner, code, noteLines } of cases) {
  test(name, () => {
    const doc = parse(source)
    const block = doc.blocks[0]
    const child = owner[1] === 'dd' ? block.items[1].ddBlocks.at(-1) : block.items[0].blocks.at(-1)
    assert.equal(block.t, owner[0])
    assert.equal(child.t, owner[2])
    if (code !== undefined) assert.equal(child.text, code)
    if (noteLines) {
      const actual = doc.footnoteDefs.get('n')[0].lines
      assert.deepEqual(actual, noteLines)
    }
  })
}
