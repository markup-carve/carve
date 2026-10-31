import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a matched comment payload that misses nested quotes leaves no lazy paragraph (carve#4658)', () => {
  const source = '> > %%%\n> > x\ny\n> > %%%\n'
  assert.equal(renderDoc(parse(source)), '<blockquote>\n  <blockquote><p>x</p></blockquote>\n</blockquote>\n<p>y</p>\n<blockquote>\n  <blockquote>\n\n  </blockquote>\n</blockquote>')
})

test('a comment-shaped line in a nested line block remains line-block payload', () => {
  const source = '> > ::: |\n> > %%%\n> > x\n> > %%%\ny\n> > :::\n'
  assert.equal(renderDoc(parse(source)), '<blockquote>\n  <blockquote>\n    <div class="line-block">\n      <p>y</p>\n    </div>\n  </blockquote>\n</blockquote>')
})

test('nested comment ownership is independent of depth, width, payload and closer indentation', () => {
  let checked = 0
  for (const depth of [2, 3, 4]) {
    const prefix = '> '.repeat(depth)
    for (const width of [3, 4, 5, 6]) {
      const fence = '%'.repeat(width)
      for (const payload of ['a', 'word', 'x y', '*bold*', '`code`', '%% line', '# heading', '| a |', '::: note', 'plain']) {
        for (const closerIndent of [0, 1, 2]) {
          for (const outside of ['outside', 'other', 'last']) {
            const source = `${prefix}${fence}\n${prefix}${payload}\n${outside}\n${prefix}${' '.repeat(closerIndent)}${fence}\n`
            const blocks = parse(source).blocks
            assert.equal(blocks[1]?.t, 'para', source)
            assert.deepEqual(blocks[1]?.lines, [outside], source)
            checked++
          }
        }
      }
    }
  }
  assert.equal(checked, 1080)
})
