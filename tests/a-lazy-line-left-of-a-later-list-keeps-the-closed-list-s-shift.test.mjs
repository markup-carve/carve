import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const indent = (source, by) => source.split('\n').map(l => l === '' ? '' : by + l).join('\n')

// PART 0 S3: a lazy line left of a list that opened right of an indented
// list it closed still moves by the closed list's shift (carve#4304).
const heads = ['1. a\n   ```', '- a\n  ```', '- [ ] a\n  ```', '1. a\n   x', '- a\n  > b']
const lists = [' - y', ' 1. y', '  - y', ' * y']
const nexts = ['+\n> q', '+\np', '+\n# H', 'z\n> q', '+\n+\n: a']

for (const head of heads) {
  for (const list of lists) {
    for (const next of nexts) {
      const source = `${head}\n${list}\n${next}\n`
      for (const by of [' ', '  ', '   ']) {
        test(`${JSON.stringify(source)} indented by ${by.length} reads as written at column 0`, () => {
          assert.equal(html(indent(source, by)), html(source))
        })
      }
    }
  }
}
