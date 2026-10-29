import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// PART 1 S4 (carve#3949): an unmarked line folds lazily only into an open
// paragraph. After a block that leaves none, at any depth of a stack of items
// and quotes, it closes every container and opens a paragraph at the top.
const html = (lines) => renderDoc(parse(lines.join('\n') + '\n'))
const markers = { item: '- ', ordered: '1. ', quote: '> ' }
const stacks = [
  ['item', 'quote', 'item', 'quote'],
  ['item', 'quote', 'ordered', 'quote'],
  ['quote', 'item', 'quote', 'item'],
  ['item', 'ordered', 'quote', 'item'],
  ['quote', 'item', 'quote', 'quote', 'item'],
  ['item', 'quote', 'item'],
]
const blocks = [['# H'], ['---'], ['```', 'c', '```'], ['[r]: /u'], ['{.c}'], ['| a |'], ['::: note', 'z', ':::']]

for (const stack of stacks) {
  let first = ''
  let rest = ''
  for (const kind of stack) {
    first += markers[kind]
    rest += kind === 'quote' ? '> ' : ' '.repeat(markers[kind].length)
  }
  for (const block of blocks) {
    test(`\`${first}para\` then \`${block[0]}\`: an unmarked line opens a top-level paragraph`, () => {
      assert.match(html([first + 'para', ...block.map((b) => rest + b), 'tail']), /\n<p[^>]*>tail<\/p>$/)
    })
  }
  test(`\`${first}para\` then a paragraph line: an unmarked line folds into it`, () => {
    assert.doesNotMatch(html([first + 'para', rest + 'more', 'tail']), /<p>tail<\/p>/)
  })
}

test('the issue row', () => {
  assert.equal(html(['- > - > para', '  >   > # H', 'tail']),
    '<ul>\n  <li>\n    <blockquote>\n      <ul>\n        <li>\n          <blockquote>\n            <p>para</p>\n            <h1 id="H">H</h1>\n          </blockquote>\n        </li>\n      </ul>\n    </blockquote>\n  </li>\n</ul>\n<p>tail</p>')
})
