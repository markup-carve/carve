import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P0-008 (carve#3976): a task box is content, so a line in the box's
// columns sits below a marker-line child and folds into its open term.
const html = (src) => renderDoc(parse(src))

test('the issue row', () => {
  assert.equal(html('* [ ] - :: t\n    : a\n'),
    '<ul class="task-list">\n  <li><input type="checkbox" disabled> \n    <ul>\n      <li>\n        <dl>\n          <dt>t\n: a</dt>\n        </dl>\n      </li>\n    </ul>\n  </li>\n</ul>')
})

test('without the box the same column is the child content column', () => {
  assert.match(html('- - :: t\n    : a\n'), /<dd>a<\/dd>/)
})

const hosts = [(l) => l, (l) => '> ' + l, (l) => '  ' + l]
let count = 0
for (const [h, host] of hosts.entries()) for (const outer of ['* ', '- ']) for (const box of ['[ ] ', '[x] ']) for (const inner of ['- ', '* ', '1. ']) {
  for (let col = outer.length + 1; col < outer.length + box.length; col++) for (const lazy of [': a', ': a *b*']) {
    count++
    const lines = [outer + box + inner + ':: t', ' '.repeat(col) + lazy]
    const src = (h === 2 ? '- p\n' : '') + lines.map(host).join('\n') + '\n'
    test(JSON.stringify(src), () => {
      const out = html(src)
      assert.doesNotMatch(out, /<dd>/)
      assert.match(out, /<dt>t\n: a/)
    })
  }
}
test('the sweep is the size the PR states', () => assert.equal(count, 216))
