// carve#4814 (ruling B): `* * *` and `- - -` are thematic breaks; nothing else spaced is.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\n\s*/g, '')
const nested = (body) => `<ul><li><ul><li>${body}</li></ul></li></ul>`

for (const marker of ['*', '-']) {
  test(`spaced ${marker} runs of any length break`, () => {
    for (const count of [3, 4, 9]) {
      assert.equal(html(`${Array(count).fill(marker).join(' ')}\n`), '<hr>')
    }
    assert.equal(html(`${marker} ${marker} ${marker}  \n`), '<hr>')
  })

  test(`a spaced ${marker} run interrupts a paragraph and sits in containers like ${marker.repeat(3)}`, () => {
    const spaced = `${marker} ${marker} ${marker}`
    const solid = marker.repeat(3)
    for (const shape of ['para\nB\n', '> B\n', 'para\n\nB\n\nmore\n', '::: note\nB\n:::\n', ' B\n']) {
      assert.equal(html(shape.replace('B', spaced)), html(shape.replace('B', solid)))
    }
  })

  test(`a gap, two markers or trailing text keep the ${marker} list`, () => {
    assert.equal(html(`${marker}  ${marker}  ${marker}\n`), nested(marker))
    assert.equal(html(`${marker} ${marker}\n`), `<ul><li>${marker}</li></ul>`)
    assert.match(html(`${marker} ${marker} ${marker} x\n`), /<li>x<\/li>/)
  })
}

test('a mixed run stays a list and a spaced _ run stays text', () => {
  assert.equal(html('- * -\n'), nested('-'))
  assert.equal(html('_ _ _\n'), '<p>_ _ _</p>')
  assert.equal(html('_ _ _ _\n'), '<p>_ _ _ _</p>')
})

test('a list item can hold a spaced break', () => {
  assert.equal(html('- * * *\n'), '<ul><li><hr></li></ul>')
})
