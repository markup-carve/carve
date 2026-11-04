import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

// A sibling marker ends the item holding an unclosed line block, so the outer
// item's tracker has no stanza left for a column-0 line (CARVE-P0-009, carve#5166).
test('a column-0 line after a sibling that ends a nested line block is a document paragraph', () => {
  for (const depth of [1, 2, 3, 4]) {
    for (const tail of ['# h', '| x |', '```\ncode\n```', '---']) {
      const lead = Array.from({ length: depth }, (_, d) => `${'  '.repeat(d)}- a${d}`)
      const at = '  '.repeat(depth)
      const sibling = [`${at}- c`, ...tail.split('\n').map((line) => `${at}  ${line}`)]
      const source = [...lead, `${at}- b`, `${at}  ::: |`, `${at}  text`, ...sibling, 'after', ''].join('\n')
      const closed = source.replace(`${at}  text\n`, `${at}  text\n${at}  :::\n`)
      const html = render(source)
      assert.match(html, /<\/ul>\n<p>after<\/p>\n?$/, source)
      assert.equal(html, render(closed), source)
    }
  }
})

test('the ticket shape (carve#5166)', () => {
  assert.equal(render('- a0\n  - a1\n    - b\n      ::: |\n      text\n    - c\n      # h\nafter\n'), [
    '<ul>',
    '  <li>a0',
    '    <ul>',
    '      <li>a1',
    '        <ul>',
    '          <li>b',
    '            <div class="line-block">',
    '              <p>text</p>',
    '            </div>',
    '          </li>',
    '          <li>c',
    '            <h1 id="h">h</h1>',
    '          </li>',
    '        </ul>',
    '      </li>',
    '    </ul>',
    '  </li>',
    '</ul>',
    '<p>after</p>',
  ].join('\n'))
})

test('a lazy line still folds into a stanza no marker ended', () => {
  const html = render('- a0\n  - a1\n    - b\n      ::: |\n      text\nafter\n')
  assert.match(html, /<p>text<br>\nafter<\/p>/)
})
