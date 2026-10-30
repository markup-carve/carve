import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const note = (src, label = 'q') => parse(src).footnoteDefs.get(label)

test('a follower at the description body column refuses a marker-line note + (carve#4227)', () => {
  assert.deepEqual(note(':: t\n: [^q]: +\n  para\n\nr[^q]\n'), [{ t: 'para', lines: ['+', 'para'] }])
  assert.deepEqual(note(':: t\n: [^q]: +\n   para\n\nr[^q]\n'), [{ t: 'para', lines: ['+', 'para'] }])
})

test('column zero and the note body column still take the block (carve#4227)', () => {
  assert.deepEqual(note(':: t\n: [^q]: +\npara\n\nr[^q]\n'), [{ t: 'para', lines: ['para'] }])
  assert.deepEqual(note(':: t\n: [^q]: +\n    para\n\nr[^q]\n'), [{ t: 'para', lines: ['para'] }])
  assert.deepEqual(note(':: t\n: x\n  [^q]: +\n  para\n\nr[^q]\n'), [{ t: 'para', lines: ['para'] }])
})

// carve#4396: the refused `+` reads like a letter, so a marker that misses the note folds.
for (const follower of ['- y', ' - y', '  - y', '> - y']) {
  for (const head of [':: t\n: ', '> :: t\n> : ']) {
    const src = (letter) => `${head}[^q]: ${letter}\n${follower}\n\nr[^q]\n`
    test(`a marker below a hosted note reads as under a letter: ${JSON.stringify(src('+'))}`, () => {
      assert.equal(html(src('+')), html(src('Q')).replaceAll('Q', '+'))
    })
  }
}
