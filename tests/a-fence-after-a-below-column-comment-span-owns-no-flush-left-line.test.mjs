import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = src => renderDoc(parse(src))
const source = (depth, fence, column, closed, tail) => {
  const pad = ' '.repeat(column)
  const lines = ['- item', `${pad}%%%`, `${pad}hidden`, '  %%%', `  ${fence}`]
  if (closed) lines.push(`  ${fence}`)
  lines.push(...tail.split('\n'))
  return lines.map(line => '> '.repeat(depth) + line).join('\n') + '\n'
}

for (const depth of [0, 1, 2]) {
  for (const character of ['`', '~']) {
    // Column 0 is the list's own column, where a matched span ends the item (PART 0 X1).
    for (const column of [1]) {
      for (const closed of [false, true]) {
        for (const [kind, tail] of [['text', 'tail'], ['marker', '- tail'], ['blank then text', '\ntail']]) {
          test(`quote depth ${depth}, ${character} fence, span column ${column}, ${closed ? 'closed' : 'unclosed'}, ${kind}`, () => {
            const fence = character.repeat(3)
            assert.equal(html(source(depth, fence, column, closed, tail)),
              html(source(depth, fence, 2, closed, tail)))
          })
        }
      }
    }
  }
}

test('513-a-comment-span-opened-below-every-content-column-is-located-there-8 leaves tail at document level', () => {
  assert.equal(html('- item\n %%%\n hidden\n  %%%\n  ```\ntail\n'),
    '<ul>\n  <li>item\n    <pre><code></code></pre>\n  </li>\n</ul>\n<p>tail</p>')
})
