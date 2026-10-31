// carve#4545, PART 0 S4: between an item's columns a marker is a sibling only on every §11 N1 axis.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')
const lists = (source) => (html(source).match(/<(ul|ol)[ >]/g) ?? []).length

const differing = [['- a', '- [ ] b'], ['- [ ] a', '- b'], ['- a', '* b'], ['1. a', 'a. b'], ['1. a', 'i. b'], ['a. a', '1. b'], ['1. a', '2) b'], ['- a', '1. b']]
const siblings = [['- a', '- b'], ['- [ ] a', '- [x] b'], ['1. a', '2. b'], ['a. a', 'b. b'], ['h. a', 'i. b']]

test('a marker that differs on any axis folds into the paragraph between the columns', () => {
  for (const [first, second] of differing) {
    for (const indent of [' ', '  ']) {
      if (indent.length >= first.indexOf(' ') + 1) continue
      assert.equal(lists(`${first}\n${indent}${second}\n`), 1, `${first} / ${indent}${second}`)
      assert.equal(lists(`- x\n  ${first}\n  ${indent}${second}\n`), 2, `nested ${first} / ${indent}${second}`)
    }
  }
})

test('a marker that matches on every axis stays a sibling, and column 0 still opens a new list', () => {
  for (const [first, second] of siblings) {
    assert.match(html(`${first}\n ${second}\n`), /<\/li><li[ >]/, `${first} / ${second}`)
  }
  for (const [first, second] of differing) assert.equal(lists(`${first}\n${second}\n`), 2, `${first} / ${second}`)
})
