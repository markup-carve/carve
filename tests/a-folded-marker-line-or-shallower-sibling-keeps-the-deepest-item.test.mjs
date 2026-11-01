import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const flat = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> </g, '><').trim()

// carve#4348: a third-level item's + paragraph takes a column-0 lazy line (PART 0 S4).
test('a nested first-block + paragraph takes a lazy line at any depth', () => {
  const cases = [
    ['- a\n  * b\n    - +\n    q\nafter\n', '<ul><li>a <ul><li>b <ul><li>q after</li></ul></li></ul></li></ul>'],
    ['- a\n  * b\n    - +\n      q\nafter\n', '<ul><li>a <ul><li>b <ul><li>+ q after</li></ul></li></ul></li></ul>'],
    ['- a\n  * b\n    * c\n      - +\n      q\nafter\n', '<ul><li>a <ul><li>b <ul><li>c <ul><li>q after</li></ul></li></ul></li></ul></li></ul>'],
    ['- a\n  * b\n    - +\n    q\n    r\nafter\n', '<ul><li>a <ul><li>b <ul><li>q r after</li></ul></li></ul></li></ul>'],
  ]
  for (const [source, expected] of cases) assert.equal(flat(source), expected, source)
})

// carve#4345, carve#4545: a marker line no sibling of the deepest item opens a new list, and its fence is live.
test('a marker line of another kind opens a new list', () => {
  const cases = [
    ['1. 1. a\n    1. y\n      - ~~~\nz\n', '<ol><li><ol><li>a</li><li>y</li></ol><ul><li><pre><code></code></pre></li></ul></li></ol><p>z</p>'],
    ['- 1. a\n   1. y\n     - ~~~\nz\n', '<ul><li><ol><li>a</li><li>y</li></ol><ul><li><pre><code></code></pre></li></ul></li></ul><p>z</p>'],
    ['1. 1. a\n    1. y\n      - ```\nz\n', '<ol><li><ol><li>a</li><li>y</li></ol><ul><li><pre><code></code></pre></li></ul></li></ol><p>z</p>'],
    ['1. - a\n     - y\n      1. ~~~\nz\n', '<ol><li><ul><li>a <ul><li>y</li></ul><ol><li><pre><code></code></pre></li></ol></li></ul></li></ol><p>z</p>'],
  ]
  for (const [source, expected] of cases) assert.equal(flat(source), expected, source)
})

// carve#4346: a sibling at a shallower column ends the sublist the fence opened, so its column owns the next line.
test('a shallower sibling marker owns its content column after a nested fence', () => {
  const table = '<table><tbody><tr><td></td></tr></tbody></table>'
  const cases = [
    ['- [ ] - [ ] a\n            - ~~~\n      - [ ] y\n            ||\nz\n',
      `<ul class="task-list"><li><input type="checkbox" disabled><ul class="task-list"><li><input type="checkbox" disabled aria-label="a"> a <ul><li><pre><code></code></pre></li></ul></li><li><input type="checkbox" disabled aria-label="y"> y ${table}</li></ul></li></ul><p>z</p>`],
    ['- - a\n    - ~~~\n  - y\n    ||\nz\n', `<ul><li><ul><li>a <ul><li><pre><code></code></pre></li></ul></li><li>y ${table}</li></ul></li></ul><p>z</p>`],
  ]
  for (const [source, expected] of cases) assert.equal(flat(source), expected, source)
})
