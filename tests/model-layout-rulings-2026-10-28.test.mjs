import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const hosts = [
  lines => lines,
  lines => lines.map(line => '> ' + line),
  lines => ['::: box', ...lines, ':::'],
  lines => ['::: box', ...lines.map(line => '> ' + line), ':::'],
  lines => ['> ::: box', ...lines.map(line => '> ' + line), '> :::'],
]
const sourceOf = lines => lines.join('\n') + '\n'

function firstItem(blocks) {
  for (const block of blocks) {
    if (block.t === 'list') return block.items[0]
    if (block.children) {
      const item = firstItem(block.children)
      if (item) return item
    }
  }
  return null
}

test('1,000 later terms open in the outer item after shifted separators', () => {
  let checked = 0
  for (const outer of ['- ', '* ', '1. ', '9. ', 'a. '])
    for (const child of ['- ', '* '])
      for (const term of ['t', 'alpha', 'x9', 'foo_bar', 'mixed'])
        for (const shift of [0, 1, 2, 3])
          for (const host of hosts) {
            const column = outer.length
            const lines = [outer + child + ':: ' + term,
              ' '.repeat(column) + ': a',
              ' '.repeat(column + child.length + shift) + ':: sibling',
              ' '.repeat(column + child.length + shift) + 'tail']
            const source = sourceOf(host(lines))
            assert.match(renderDoc(parse(source)), /<dt>sibling\ntail<\/dt>/, source)
            checked++
          }
  assert.equal(checked, 1000)
})

test('1,000 task items have the ordered control ownership at the ruled column', () => {
  let checked = 0
  for (const task of ['* [ ] ', '- [x] ', '* [?] ', '- [>] '])
    for (const child of ['- ', '* '])
      for (const term of ['t', 'alpha', 'x9', 'foo_bar', 'mixed'])
        for (const tail of ['tail', 'more', 'z', 'word9', 'post'])
          for (const host of hosts) {
            const lines = marker => [marker + child + ':: ' + term,
              '      : a', '      :: sibling', '      ' + tail]
            const taskSource = sourceOf(host(lines(task)))
            const controlSource = sourceOf(host(lines('1000. ')))
            assert.deepEqual(firstItem(parse(taskSource).blocks).blocks,
              firstItem(parse(controlSource).blocks).blocks, taskSource)
            checked++
          }
  assert.equal(checked, 1000)
})

test('250 two-level lazy quote variants keep the deepest literal plus', () => {
  let checked = 0
  for (const marker of ['- ', '* ', '1. ', '. ', 'a. '])
    for (const tail of ['s', 'tail', 'q', 'alpha', 'x9', 'more', 'body', 'next', 'z', 'line'])
      for (const items of [2, 3, 4, 5, 6]) {
        const source = ('> > ' + marker + '> +\n').repeat(items) + '>  ' + tail + '\n'
        assert.ok(renderDoc(parse(source)).includes('<p>+\n' + tail + '</p>'), source)
        checked++
      }
  assert.equal(checked, 250)
})
