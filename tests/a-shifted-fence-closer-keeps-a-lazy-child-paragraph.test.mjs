import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\s+/g, ' ')
const source = (run, closerColumn, middle = []) =>
  ['- outer', '  - inner', `  ${run}`, ...middle, `${' '.repeat(closerColumn)}${run}`, 'next', ''].join('\n')

for (const run of ['```', '~~~']) {
  for (const closerColumn of [1, 3, 4, 5]) {
    for (const middle of [[], ['  +'], ['   text']]) {
      // carve#4018: the opener interrupts the child paragraph and opens in the outer item.
      test(`${run} below the child opens in the outer item, line at column ${closerColumn}, ${middle.join('') || 'no'} middle line`, () => {
        const result = html(source(run, closerColumn, middle))
        assert.match(result, /<li>inner<\/li> <\/ul> <pre><code>/)
        if (closerColumn < 2) assert.match(result, /<\/code><\/pre> <\/li> <\/ul> <pre><code>next <\/code><\/pre>$/)
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

test('a line past a blank after the shifted closer ends the fence and the list', () => {
  const result = html('- outer\n  - inner\n  ```\n   ```\n\nnext\n')
  assert.match(result, /<\/ul> <p>next<\/p>$/)
})

test('a heading at the outer item column is payload of the fence opened there', () => {
  const result = html('- outer\n  - inner\n  ```\n   ```\n  # H\nnext\n')
  assert.match(result, /<pre><code> ``` # H <\/code><\/pre> <\/li> <\/ul> <p>next<\/p>$/)
})

for (const [marker, column] of [['- outer', 2], ['* outer', 2], ['1. outer', 3], ['- [ ] outer', 2]]) {
  for (const depth of [0, 1, 2]) {
    test(`${marker} reads a shifted closer as payload of its own fence at quote depth ${depth}`, () => {
      const lines = [marker, `${' '.repeat(column)}- inner`, ' '.repeat(column) + '```',
        `${' '.repeat(column)}+`, ' '.repeat(column + 1) + '```']
      const quoted = lines.map(line => `${'> '.repeat(depth)}${line}`).join('\n')
      const result = html(`${quoted}\nnext\n`)
      assert.match(result, /<li>inner<\/li> <\/ul> <pre><code>\+ ``` <\/code><\/pre> <\/li> <\/(?:ul|ol)>/)
      assert.match(result, /<p>next<\/p>$/)
    })
  }
}
