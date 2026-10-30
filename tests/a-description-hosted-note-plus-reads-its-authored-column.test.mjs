import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const note = (src, label = 'q') => parse(src).footnoteDefs.get(label)

test('a follower off the note marker column refuses a marker-line note + (carve#4227)', () => {
  assert.deepEqual(note(':: t\n: [^q]: +\npara\n\nr[^q]\n'), [{ t: 'para', lines: ['+', 'para'] }])
  assert.deepEqual(note(':: t\n: [^q]: +\n   para\n\nr[^q]\n'), [{ t: 'para', lines: ['+', 'para'] }])
  assert.deepEqual(note(':: t\n: [^q]: +\n    para\n\nr[^q]\n'), [{ t: 'para', lines: ['+', 'para'] }])
})

test('the note marker column takes the block (carve#4227)', () => {
  assert.deepEqual(note(':: t\n: [^q]: +\n  para\n\nr[^q]\n'), [{ t: 'para', lines: ['para'] }])
  assert.deepEqual(note(':: t\n: x\n  [^q]: +\n  para\n\nr[^q]\n'), [{ t: 'para', lines: ['para'] }])
})

for (const src of [':: t\n: [^q]: +\n- y\n\nr[^q]\n', ':: t\n: [^q]: +\n - y\n\nr[^q]\n']) {
  test(`a list off the note marker column folds into the refused +: ${JSON.stringify(src)} (carve#4228)`, () => {
    assert.match(html(src), /^<dl>\n {2}<dt>t<\/dt>\n {2}<dd><\/dd>\n<\/dl>\n<p>r/)
    assert.deepEqual(note(src), [{ t: 'para', lines: ['+', '- y'] }])
  })
}

test('inside a quote the note marker column is measured through the prefix (carve#4228)', () => {
  assert.deepEqual(note('> :: t\n> : [^q]: +\n> - y\n\nr[^q]\n'), [{ t: 'para', lines: ['+', '- y'] }])
  assert.match(html('> :: t\n> : [^q]: +\n>   - y\n\nr[^q]\n'), /<li id="fn1">\s*<ul>\s*<li>y<\/li>/)
})

test('a list at the note marker column opens in the note (carve#4228)', () => {
  assert.match(html(':: t\n: [^q]: +\n  - y\n\nr[^q]\n'), /<dd><\/dd>[^]*<li id="fn1">\s*<ul>\s*<li>y<\/li>/)
})
