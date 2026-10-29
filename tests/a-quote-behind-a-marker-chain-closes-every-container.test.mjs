import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// PART 1 S4 (carve#3968, carve#3980): a quote reached through several markers,
// or through a task box (CARVE-P0-008), ends on its own last block, so an
// unmarked line after a block that leaves no paragraph closes every container.
const html = (lines) => renderDoc(parse(lines.join('\n') + '\n'))
const stacks = [['- ', '- '], ['- ', '- ', '- '], ['* ', '1. ', '- '], ['- [ ] '], ['- ', '- [x] '], ['- [ ] ', '1. ']]
const inners = ['', '- ', '1. ', '- [ ] ']
const blocks = [['# H'], ['---'], ['```', 'c', '```'], ['| a |']]

for (const outer of ['', '> ', '> > ']) {
  for (const stack of stacks) {
    for (const inner of inners) {
      const head = outer + stack.join('') + '> ' + inner + 'para'
      const pad = outer + ' '.repeat(stack.join('').length) + '> ' + ' '.repeat(inner.length)
      for (const block of blocks) {
        test(`"${head}" then "${block[0]}": an unmarked line opens a top-level paragraph`, () => {
          assert.match(html([head, ...block.map((b) => pad + b), 'tail']), /\n<p>tail<\/p>$/)
        })
      }
      test(`"${head}" then a paragraph line: an unmarked line folds into it`, () => {
        assert.doesNotMatch(html([head, pad + 'more', 'tail']), /<p>tail<\/p>/)
      })
    }
  }
}

test('carve#3968', () => {
  assert.match(html(['- - - > - para', '      >   # H', 'tail']), /<\/ul>\n<p>tail<\/p>$/)
})

test('carve#3980', () => {
  assert.equal(html(['> - [ ] 1. > # H0', '>          > ---', 'tail']),
    '<blockquote>\n  <ul class="task-list">\n    <li><input type="checkbox" disabled> \n      <ol>\n        <li>\n          <blockquote>\n            <h1 id="H0">H0</h1>\n            <hr>\n          </blockquote>\n        </li>\n      </ol>\n    </li>\n  </ul>\n</blockquote>\n<p>tail</p>')
})
