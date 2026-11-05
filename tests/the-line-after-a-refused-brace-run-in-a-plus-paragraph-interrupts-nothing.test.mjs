import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

// carve#5181: a `+` paragraph pulled from column 0 keeps the line after a
// refused brace run, even at the item's content column (CARVE-P2-035).
test('the reproduction renders as the ticket expects', () => {
  assert.equal(html('- a\n+\n{x\ny}\n  > c\n'), '<ul><li>a\n    {x\ny}\n&gt; c</li></ul>')
})

for (const [follower, text] of [['# c', '# c'], ['::: d', '::: d'], ['| c |', '| c |'], [':: t', ':: t'], ['{.k}', '{.k}']]) {
  for (const host of ['- a', '1. a', '- [ ] a']) {
    test(`${follower} after a refused run in a ${host} + paragraph is text`, () => {
      const col = host.startsWith('1.') ? '   ' : '  '
      const out = html(`${host}\n+\n{x\ny}\n${col}${follower}\n`)
      assert.ok(out.includes(`y}\n${text}</li>`), out)
    })
  }
}

test('a fence after the run is paragraph text through its closer', () => {
  const out = html('- a\n+\n{x\ny}\n  ```\n  k\n  ```\n  > z\n')
  assert.match(out, /y}<code>\nk<\/code><blockquote><p>z<\/p><\/blockquote><\/li><\/ul>$/)
})

test('only the one line after the run is kept', () => {
  assert.match(html('- a\n+\n{x\ny}\n  > c\n  > d\n'), /&gt; c<blockquote><p>d<\/p><\/blockquote><\/li><\/ul>$/)
})

test('without a refused run a block at the content column still ends the paragraph', () => {
  assert.equal(html('- a\n+\nb\n  > c\n'), '<ul><li>a\n    b<blockquote><p>c</p></blockquote></li></ul>')
})
