import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

// carve#5610: only the line after a refused run is forced into its paragraph
// (CARVE-P2-035). A list marker at an item's body column then opens a sublist
// (§24 C3), and an unindented line is a lazy line of that sublist's paragraph.
test('the reproduction of carve#5610 renders its Expected section', () => {
  assert.equal(render('- +\n  {.x\n  .y}\n  ```\n  - li\ntail\n'), [
    '<ul>',
    '  <li>{.x',
    '.y}',
    '<code></code>',
    '    <ul>',
    '      <li>li',
    'tail</li>',
    '    </ul>',
    '  </li>',
    '</ul>',
  ].join('\n'))
})

for (const [name, head, pad] of [
  ['plus item', '- +\n', '  '],
  ['ordered plus item', '1. +\n', '   '],
  ['item paragraph', '- a\n', '  '],
]) {
  for (const run of ['```', '````', '~~~']) {
    test(`a ${name} opens the sublist after a ${run} follower and keeps the lazy line`, () => {
      const output = render(`${head}${pad}{.x\n${pad}.y}\n${pad}${run}\n${pad}- li\ntail\n`)
      assert.match(output, /<ul>\n\s*<li>li\ntail<\/li>\n\s*<\/ul>/)
      assert.doesNotMatch(output, /<p>tail<\/p>/)
    })
  }
}

test('a root paragraph still folds a later list marker into its unclosed code span', () => {
  assert.match(render('{.x\n.y}\n```\nwa\n- li\ntail\n'), /<code>\nwa\n- li\ntail<\/code><\/p>/)
})

// A fence-shaped line short of the child's column is read in the parent (PART 0 S4):
// it closes no follower span, and a code fence there takes no lazy line.
for (const [name, source] of [
  ['item', '- - a\n    {.x\n    .y}\n    ```\n   ```\ntail\n'],
  ['stacked plus', '- - +\n    {.x\n    .y}\n    ```\n   ```\ntail\n'],
  ['quoted stacked plus', '> - +\n>   {.x\n>   .y}\n>   ```\n>  ```\ntail\n'],
]) {
  test(`a ${name} keeps the shallower fence out of the follower span`, () => {
    const output = render(source)
    assert.match(output, /<code><\/code><\/li>\n\s*<\/ul>\n\s*<pre><code><\/code><\/pre>/)
    assert.match(output, /<p>tail<\/p>\n?$/)
  })
}
