import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// Rule A (carve#3885, carve#3950): a separator that folds lazily into a
// marker-line child's open term opens nothing, so a later line that reaches
// the child's content column is still the child's.
const html = (lines) => renderDoc(parse(lines.join('\n') + '\n'))
const liDepth = (out) => {
  const before = out.slice(0, out.indexOf('FOLLOW'))
  return (before.match(/<li[ >]/g) ?? []).length - (before.match(/<\/li>/g) ?? []).length
}

test('the issue rows', () => {
  const inner = '<ul>\n  <li>\n    <ul>\n      <li>\n        <dl>\n          <dt>t\n: d</dt>\n        </dl>\n'
  assert.equal(html(['- * :: t', '   : d', '', '    > r']),
    inner + '        <blockquote><p>r</p></blockquote>\n      </li>\n    </ul>\n  </li>\n</ul>')
  assert.equal(html(['- * :: t', '   : d', '      > r']),
    inner + '        <blockquote><p>r</p></blockquote>\n      </li>\n    </ul>\n  </li>\n</ul>')
})

test('a separator at the child marker column still opens in the outer item', () => {
  assert.match(html(['- * :: t', '  : d', '', '    > r']), /<\/ul>\n    : d\n    <blockquote>/)
})

const hosts = [[(l) => l], [(l) => (l === '' ? '>' : '> ' + l)], [(l) => (l === '' ? '' : '  ' + l), '- p', '']]
const outers = ['- ', '1. ', '- [ ] ']
const inners = ['* ', '1. ', '10. ']
const lazies = [': d', ':  d *e*']
const followers = ['> FOLLOW', ':: FOLLOW', 'FOLLOW', '# FOLLOW', '```\nFOLLOW\n```', '- FOLLOW']
let count = 0
for (const [host, ...lead] of hosts) for (const outer of outers) for (const inner of inners) for (const lazy of lazies) {
  const childCol = outer.length + inner.length
  for (let col = outer.length + 1; col < childCol; col++) for (const follower of followers) for (const blank of [false, true]) for (const extra of [0, 2]) {
    count++
    const body = [outer + inner + ':: t', ' '.repeat(col) + lazy, ...(blank ? [''] : []),
      ...follower.split('\n').map((l) => ' '.repeat(childCol + extra) + l)]
    const want = lead.length / 2 + 2 + (follower.startsWith('- ') ? 1 : 0)
    test(`${JSON.stringify(body.join('\n'))} in host ${hosts.findIndex((h) => h[0] === host)}`, () => {
      assert.equal(liDepth(html([...lead, ...body.map(host)])), want)
    })
  }
}
test('the sweep is the size the PR states', () => assert.equal(count, 2592))
