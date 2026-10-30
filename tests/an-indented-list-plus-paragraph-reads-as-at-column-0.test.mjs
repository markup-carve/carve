import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const indent = (source, by) => source.split('\n').map(l => l === '' ? '' : by + l).join('\n')

// PART 0 S3: an indented list reads as the unindented one, including the
// paragraph a `+` at the item's marker column attaches (carve#4243).
const heads = ['- a', '1. a', '- [ ] a', '- ```', '- ~~~\n  x', '- :::']
const tails = ['', 'tail\n', '  tail\n', 'q\n']

for (const head of heads) {
  for (const tail of tails) {
    const source = `${head}\n+\np\n${tail}`
    for (const by of [' ', '  ', '   ']) {
      test(`${JSON.stringify(source)} indented by ${by.length} reads as written at column 0`, () => {
        assert.equal(html(indent(source, by)), html(source))
      })
    }
  }
}

test('the reproduction keeps p in the item', () => {
  assert.equal(html('  - a\n  +\n  p\n'), html('- a\n+\np\n'))
  assert.doesNotMatch(html('  - a\n  +\n  p\n'), /\+/)
})
