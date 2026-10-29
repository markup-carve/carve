import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\s+/g, ' ')
const source = (run, closerColumn, middle = []) =>
  ['- outer', '  - inner', `  ${run}`, ...middle, `${' '.repeat(closerColumn)}${run}`, 'next', ''].join('\n')

// The run at the outer item's column interrupts the child paragraph and opens
// in the outer item whether or not a closer follows (carve#4018).
for (const run of ['```', '~~~']) {
  for (const closerColumn of [1, 3, 4, 5]) {
    for (const middle of [[], ['  +'], ['   text']]) {
      test(`${run} at the outer item column opens there; a run at column ${closerColumn} with ${middle.join('') || 'no'} middle line`, () => {
        const result = html(source(run, closerColumn, middle))
        assert.match(result, /<li>inner<\/li> <\/ul> <pre><code>/)
        // Below the outer column the run ends the fence and opens its own; past it, it is content.
        if (closerColumn === 1) assert.match(result, /<\/ul> <pre><code>next <\/code><\/pre>$/)
        else assert.match(result, new RegExp(`${run} </code></pre> </li> </ul> <p>next</p>$`))
      })
    }
  }
  test(`${run} at the outer item's exact column closes its code block`, () => {
    const result = html(source(run, 2, ['  +']))
    assert.match(result, /<pre><code>\+ <\/code><\/pre>/)
    assert.match(result, /<\/ul> <p>next<\/p>$/)
  })
}

test('a blank after the shifted closer ends the lazy child paragraph', () => {
  const result = html('- outer\n  - inner\n  ```\n   ```\n\nnext\n')
  assert.match(result, /<\/ul> <p>next<\/p>$/)
})

test('a heading at the outer item column is payload of the open fence', () => {
  const result = html('- outer\n  - inner\n  ```\n   ```\n  # H\nnext\n')
  assert.match(result, /<pre><code> ``` # H <\/code><\/pre> <\/li> <\/ul> <p>next<\/p>$/)
})

for (const [marker, column] of [['- outer', 2], ['* outer', 2], ['1. outer', 3], ['- [ ] outer', 2]]) {
  for (const depth of [0, 1, 2]) {
    test(`${marker} opens the fence in the outer item, not the child, at quote depth ${depth}`, () => {
      const lines = [marker, `${' '.repeat(column)}- inner`, ' '.repeat(column) + '```',
        `${' '.repeat(column)}+`, ' '.repeat(column + 1) + '```']
      const quoted = lines.map(line => `${'> '.repeat(depth)}${line}`).join('\n')
      const result = html(`${quoted}\nnext\n`)
      assert.match(result, /<li>inner<\/li> <\/ul> <pre><code>\+ ``` <\/code><\/pre> <\/li> <\/(?:ul|ol)>/)
    })
  }
}
