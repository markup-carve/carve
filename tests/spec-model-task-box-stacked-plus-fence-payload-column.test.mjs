import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))
const FENCE = '```'

// carve#5607: a task box is content (CARVE-P0-008), so the fence a stacked `+`
// attaches keeps its payload's column relative to the opener (CARVE-P2-006).
for (const [name, head, col] of [
  ['bullet', '- [ ] - +', 6],
  ['ordered inner', '- [x] 1. +', 6],
  ['wide box gap', '- [ ]  - +', 7],
  ['task inner', '- [ ] - [ ] +', 6],
]) {
  const pad = ' '.repeat(col)
  for (const shift of [0, 1, 2, 4]) {
    test(`a ${name} host keeps the payload flush with a closer ${shift} columns left`, () => {
      const output = render(`${head}\n${pad}${FENCE}\n\n${pad}x\n${' '.repeat(col - shift)}${FENCE}\n`)
      assert.match(output, /<pre><code>\nx\n<\/code><\/pre>/)
    })
  }
  test(`a ${name} host keeps a deeper payload line's relative indentation`, () => {
    const output = render(`${head}\n${pad}${FENCE}\n\n${pad} x\n${pad}${FENCE}\n`)
    assert.match(output, /<pre><code>\n x\n<\/code><\/pre>/)
  })
}

test('the reproduction of carve#5607 renders its Expected section', () => {
  assert.equal(render(`- [ ] - +\n      ${FENCE}\n\n      x\n     ${FENCE}\n`), [
    '<ul class="task-list">',
    '  <li><input type="checkbox" disabled> ',
    '    <ul>',
    '      <li>',
    '        <pre><code>',
    'x',
    '</code></pre>',
    '      </li>',
    '    </ul>',
    '  </li>',
    '</ul>',
  ].join('\n'))
})
