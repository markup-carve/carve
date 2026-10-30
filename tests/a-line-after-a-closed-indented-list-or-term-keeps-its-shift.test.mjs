import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const indent = (source, by) => source.split('\n').map(l => l === '' ? '' : by + l).join('\n')

// PART 0 S3: lines after an indented list or term run that a line at or past
// its column ended keep that run's shift (carve#4316).
const cases = [
  ['- a\n  x\n{.c}\n+\n- y\n', 2],
  ['- a\n  x\n{.c}\n+\n- y\n```\n', 3],
  ['1. a\n   ```\n+\n ```\n```\n p\n', 3],
  [':: t\n: > b\n  +\n p\np\n: a\n', 3],
  ['- [ ] a\n  ```\n# H\n - y\n +\n: a\n', 1],
  [':: t\np\n - y\n+\n# H\n', 3],
]
for (const [source, by] of cases) {
  test(`${JSON.stringify(source)} indented by ${by} reads as written at column 0`, () => {
    assert.equal(html(indent(source, ' '.repeat(by))), html(source))
  })
}

const heads = ['- a\n  x', '1. a\n   ```', ':: t\np', '- a\n  ```\n# H']
const mids = ['{.c}', '{#i}', ' - y', '# H']
const nexts = ['+\n- y', '+\np', '+\n> q', '+\n# H']
for (const head of heads) {
  for (const mid of mids) {
    for (const next of nexts) {
      const source = `${head}\n${mid}\n${next}\n`
      for (const by of [' ', '  ', '   ']) {
        test(`${JSON.stringify(source)} indented by ${by.length} reads as written at column 0`, () => {
          assert.equal(html(indent(source, by)), html(source))
        })
      }
    }
  }
}
