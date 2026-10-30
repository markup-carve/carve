import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

const parts = ['> ', '- ', '1. ', '- [ ] ', '[^n]: ']
const chains = []
const grow = (chain, depth) => {
  if (chain.length) chains.push(chain)
  if (depth) for (const part of parts) grow([...chain, part], depth - 1)
}
grow([], 3)
// A note nested in a note of its own label renders nothing to look at.
const held = chains.filter((chain) => chain.includes('> ') && chain.filter((part) => part === '[^n]: ').length < 2)
const followers = []
for (const indent of [0, 1, 2, 3, 4, 5, 6]) {
  for (const form of ['- x', '1. x', '* x', 'a. x', '- [ ] x', ':  d', ': d', ':   d']) followers.push(' '.repeat(indent) + form)
}
const lead = (chain) => (chain.includes('[^n]: ') ? 'r[^n]\n\n' : '')

test('a marker or separator past a quote never continues its term (carve#4300)', () => {
  for (const chain of held) {
    for (const follower of followers) {
      const source = `${lead(chain)}${chain.join('')}:: t\n${follower}\n`
      assert.match(render(source), /<dt>t<\/dt>/, JSON.stringify(source))
    }
  }
})

test('the line is read as it would be without the quote (carve#4300)', () => {
  for (const chain of held.filter((c) => c[0] === '> ' && !c.includes('[^n]: '))) {
    for (const follower of followers) {
      const term = `${chain.join('')}:: t\n`
      assert.equal(
        render(`${term}${follower}\n`).trim(),
        `${render(term).trim()}\n${render(`${follower}\n`).trim()}`,
        JSON.stringify(term + follower),
      )
    }
  }
})

test('plain text still continues a quoted term', () => {
  for (const chain of held) {
    for (const follower of ['plain', ' plain', '  plain']) {
      const source = `${lead(chain)}${chain.join('')}:: t\n${follower}\n`
      assert.match(render(source), /<dt>t\nplain<\/dt>/, JSON.stringify(source))
    }
  }
})

test('a term in a footnote body in an item leaves a marker to the item', () => {
  assert.match(render('r[^n]\n\n- [^n]: :: t\n  - x\n'), /<ul>\s*<li>\s*<ul>\s*<li>x<\/li>/)
})

test('a separator past a footnote body alone keeps the term fold (carve#3458)', () => {
  assert.match(render('r[^n]\n\n[^n]: :: t\n: d\n'), /<dt>t\n: d<\/dt>/)
})

test('a marked line below an item column keeps the term fold', () => {
  assert.match(render('> - item\n>   :: term\n>  :  def\n'), /<dt>term\n:  def<\/dt>/)
})
