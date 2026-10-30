import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const indent = (source, by) => source.split('\n').map(l => l === '' ? '' : by + l).join('\n')

// PART 0 S3: a line that misses an indented list's item moves with the list,
// so a marker of another kind at the list's column opens a list (carve#4264).
const heads = ['- p', '1. p', '- [ ] p', '1) p', '- p\n  q', '- p\n  - c', '1. p\n   - c', '- > p', ':: t\n: d']
const nexts = ['- s', '1. s', '* s', '1) s', 'z', '> s', '# s', ': s', '| s |']

for (const head of heads) {
  for (const mid of ['', ' ', '   ']) {
    for (const next of nexts) {
      const source = `${head}\n${mid}${next}\n`
      for (const by of [' ', '  ', '   ']) {
        test(`${JSON.stringify(source)} indented by ${by.length} reads as written at column 0`, () => {
          assert.equal(html(indent(source, by)), html(source))
        })
      }
    }
  }
}

test('the reproduction opens an ordered list', () => {
  assert.equal(html('  - p\n  1. s\n'), '<ul>\n  <li>p</li>\n</ul>\n<ol>\n  <li>s</li>\n</ol>')
})

test('a list the readers reopen left of the marker keeps its own columns', () => {
  assert.match(html('  1. para text\n- ::: note\n  ::{}:\n:::\n'), /<aside[^>]*>\n      <p>::\{\}:<\/p>/)
})
