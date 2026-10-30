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

for (const src of [':: t\n: [^q]: +\n- y\n\nr[^q]\n', ':: t\n: [^q]: +\n - y\n\nr[^q]\n']) {
  test(`a list below the body after a refused note + opens after the list: ${JSON.stringify(src)} (carve#4228)`, () => {
    assert.match(html(src), /^<dl>\n {2}<dt>t<\/dt>\n {2}<dd><\/dd>\n<\/dl>\n<ul>\n {2}<li>y<\/li>\n<\/ul>/)
    assert.deepEqual(note(src), [{ t: 'para', lines: ['+'] }])
  })
}

test('inside a quote the list follows the description list in the quote (carve#4228)', () => {
  assert.match(html('> :: t\n> : [^q]: +\n> - y\n\nr[^q]\n'), /<\/dl>\n {2}<ul>\n {4}<li>y<\/li>\n {2}<\/ul>\n<\/blockquote>/)
})

test('a list at the body column still opens in the description (carve#4228)', () => {
  assert.match(html(':: t\n: [^q]: +\n  - y\n\nr[^q]\n'), /<dd>\n {4}<ul>\n {6}<li>y<\/li>/)
})
