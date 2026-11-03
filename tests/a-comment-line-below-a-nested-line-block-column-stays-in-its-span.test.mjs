// A comment line below a nested line block's column stays in that block's open `%%%` span (carve#4994).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('the lane rs4994 shapes', () => {
  const empty = '<ul>\n  <li>\n    <ul>\n      <li>\n        <div class="line-block">\n\n        </div>\n      </li>\n    </ul>\n  </li>\n</ul>\n<p>z</p>'
  assert.equal(html('- - ::: |\n    %%%\n%%%%\n    %%%\nz\n'), empty)
  assert.equal(html('- - ::: |\n    %%%\n%%%%\n    %%%\n    %%%\nz\n'), html('- - ::: |\n    %%%\n    %%%%\n    %%%\n    %%%\nz\n'))
  assert.equal(html('- x\n  - ::: |\n    %%%\n%%%%\n    %%%\nz\n'),
    '<ul>\n  <li>x\n    <ul>\n      <li>\n        <div class="line-block">\n\n        </div>\n      </li>\n    </ul>\n  </li>\n</ul>\n<p>z</p>')
})

// Indentation is part of neither delimiter (PART 9 §28), so moving a payload line
// from the block's column to any column below it changes nothing.
test('a payload line below the block column reads as the same line at that column', () => {
  const hosts = [
    [['- ::: |'], 2], [['- - ::: |'], 4], [['- x', '  - ::: |'], 4], [['1. - ::: |'], 5],
    [['- - - ::: |'], 6], [['- :: t', '  : ::: |'], 4], [['- - :: t', '    : ::: |'], 6],
  ]
  const followers = [['z'], ['@%%%', 'z'], ['', 'z'], ['- b'], ['@%%%', '@b', 'z']]
  let checked = 0
  for (const [head, block] of hosts) {
    for (const verse of [[], ['a']]) for (const line of ['%%%%', '%% c', '%%%% c', '%%%']) for (const follow of followers) {
      const at = (col) => ' '.repeat(col)
      const doc = (col) => [...head, ...verse.map((v) => at(block) + v), at(block) + '%%%', at(col) + line,
        ...follow.map((f) => f.startsWith('@') ? at(block) + f.slice(1) : f)].join('\n') + '\n'
      for (let col = 0; col < block; col++) {
        assert.equal(html(doc(col)), html(doc(block)), JSON.stringify(doc(col)))
        checked++
      }
    }
  }
  assert.equal(checked, 1240)
})

// The stanza checks reuse their answer across held payload lines instead of walking the body again.
for (const [name, make] of [
  ['at column 0 and the item column', (n) => '- - ::: |\n    %%%\n' + '%%%% p\n  %% q\n'.repeat(n) + '    %%%\nz\n'],
  ['between the item and block columns', (n) => '- - ::: |\n    a\n    %%%\n' + '   %%%% p\n'.repeat(n) + '    %%%\nz\n'],
]) {
  test(`a span with payload ${name} is read in linear time`, () => {
    const scanned = (n) => {
      resetLayoutWork()
      parse(make(n))
      return layoutWork.scan
    }
    const small = scanned(500)
    const large = scanned(2000)
    assert.ok(large <= small * 4 * 1.25, `500 lines: ${small} scanned, 2000 lines: ${large}`)
  })
}
