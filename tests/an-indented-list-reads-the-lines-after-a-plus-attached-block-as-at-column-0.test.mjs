import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const indent = (source, by) => source.split('\n').map(l => l === '' ? '' : by + l).join('\n')

// PART 0 S3: the lines after a block a `+` attaches move with the list, so an
// indented list reads as the unindented one (carve#4245).
const heads = ['- a', '1. a', '- [ ] a', '- a\n  - b', ':: t\n: d', '> a', '[^n]: a']
const blocks = ['# h', '> q', '| x |', '```\nx\n```', '***', '{.c}\npara', 'p']
const tails = ['', '+\nz', '- s', '1. s', '\nafter', 'z', '+\n> w']

for (const head of heads) {
  for (const block of blocks) {
    for (const tail of tails) {
      const source = `${head}\n+\n${block}\n${tail}\n`
      for (const by of [' ', '   ']) {
        test(`${JSON.stringify(source)} indented by ${by.length} reads as written at column 0`, () => {
          assert.equal(html(indent(source, by)), html(source))
        })
      }
    }
  }
}

test('the reproduction keeps the second + and z in the item', () => {
  const got = html('  - a\n  +\n  # h\n  +\n  z\n')
  assert.equal(got, html('- a\n+\n# h\n+\nz\n'))
  assert.doesNotMatch(got, /\+/)
})

test('a sibling marker after an attached quote stays a sibling', () => {
  assert.equal(html('  - a\n  +\n  > q\n  - s\n'), html('- a\n+\n> q\n- s\n'))
})

test('a paragraph after a blank below an attached quote leaves the list', () => {
  assert.equal(html('  - a\n  +\n  > q\n\n  after\n'), html('- a\n+\n> q\n\nafter\n'))
})

test('an indented quote reads the line after its + as at column 0', () => {
  assert.equal(html('  > q\n  +\n  para\n'), html('> q\n+\npara\n'))
})

// The same for a first-block `+` on the marker line.
const firstBlockHeads = ['- +', '1. +', '- [ ] +', ':: t\n: +', '[^n]: +', '> +']
for (const head of firstBlockHeads) {
  for (const block of ['# h', '> q', '```\nx\n```', '{.c}\npara', 'p']) {
    for (const tail of ['', '+\nz', '- s', '\nafter', 'z']) {
      const source = `${head}\n${block}\n${tail}\n` + (head.includes('[^n]') ? '\nx[^n]\n' : '')
      test(`${JSON.stringify(source)} indented by 2 reads as written at column 0`, () => {
        assert.equal(html(indent(source, '  ')), html(source))
      })
    }
  }
}

test('a follower between the marker and content columns keeps the shift too', () => {
  assert.equal(html('   1. +\n     # h\n   z\n'), html('1. +\n  # h\nz\n'))
})
