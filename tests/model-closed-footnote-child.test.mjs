import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'

for (const [name, child, type] of [
  ['heading', '   # Heading', 'heading'],
  ['table', '  | a |', 'table'],
  ['rule', '  ---', 'hr'],
]) {
  test(`a ${name} closes the note paragraph claim before a flush line`, () => {
    const doc = parse(`see[^n]\n\n[^n]: para\n${child}\ntail\n`)
    assert.deepEqual(doc.blocks.at(-1), { t: 'para', lines: ['tail'] })
    assert.equal(doc.footnoteDefs.get('n').at(-1).t, type)
  })
}

test('an open note paragraph still claims a flush line', () => {
  const doc = parse('see[^n]\n\n[^n]: para\ntail\n')
  assert.equal(doc.blocks.length, 1)
  assert.deepEqual(doc.footnoteDefs.get('n'), [{ t: 'para', lines: ['para', 'tail'] }])
})
