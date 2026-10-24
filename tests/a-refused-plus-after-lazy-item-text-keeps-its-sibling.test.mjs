import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

for (const [follower, ending] of [
  ['- b', '<li>b</li></ul>'],
  ['* b', '</ul><ul><li>b</li></ul>'],
]) {
  test(`a lazy item paragraph keeps a refused plus before ${follower}`, () => {
    assert.equal(html(`- q\nr\n+\n${follower}\n`), `<ul><li>q\nr\n+</li>${ending}`)
  })
}

test('the same rule holds across several lazy lines', () => {
  assert.equal(html('- q\nr\ns\n+\n- b\n'), '<ul><li>q\nr\ns\n+</li><li>b</li></ul>')
})

test('a blank before plain text does not revive the old item', () => {
  const blocks = parse('- q\n\nr\n+\n- b\n').blocks
  assert.deepEqual(blocks[0].items[0].blocks[0].lines, ['q'])
  assert.equal(blocks[1].t, 'para')
})
