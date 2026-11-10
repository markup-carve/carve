import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// CARVE-P2-035: the note definition after a refused run is paragraph text in
// the run's host, as the decision trace already reads it (carve#5772).
for (const [name, source, host, html] of [
  ['description', ':: t\n: {.x\n}\n[^m]: n\nz\n', 'doc/dd:2',
    '<dl>\n  <dt>t</dt>\n  <dd>{.x\n}\n[^m]: n\nz</dd>\n</dl>'],
  ['item', '- {.x\n}\n[^m]: n\nz\n', 'doc/item:1',
    '<ul>\n  <li>{.x\n}\n[^m]: n\nz</li>\n</ul>'],
  ['own-line item run', '- a\n  {.x\n  }\n[^m]: n\nz\n', 'doc/item:1',
    '<ul>\n  <li>a\n{.x\n}\n[^m]: n\nz</li>\n</ul>'],
  ['description in an item', '- :: t\n  : {.x\n}\n[^m]: n\nz\n', 'doc/item:1/dd:2',
    '<ul>\n  <li>\n    <dl>\n      <dt>t</dt>\n      <dd>{.x\n}\n[^m]: n\nz</dd>\n    </dl>\n  </li>\n</ul>'],
  ['indented follower in an item description', '- :: t\n  : a\n\n    {.x\n    }\n [^m]: n\nz\n', 'doc/item:1/dd:2',
    '<ul>\n  <li>\n    <dl>\n      <dt>t</dt>\n      <dd>\n        <p>a</p>\n        <p>{.x\n}\n[^m]: n\nz</p>\n      </dd>\n    </dl>\n  </li>\n</ul>'],
]) {
  test(`a ${name} keeps the refused run's note definition follower`, () => {
    const lines = source.split('\n')
    const at = lines.findIndex((line) => line.trimStart().startsWith('[^m]:')) + 1
    const record = modelTrace(source).find((r) => r.line === at)
    assert.equal(record.owner, host)
    assert.equal(renderDoc(parse(source)), html)
  })
}

test('an attribute line after a refused item run still leaves the item', () => {
  const source = '- {.x\n}\n{.q}\nz\n'
  assert.equal(modelTrace(source).find((r) => r.line === 3).owner, 'doc')
  assert.equal(renderDoc(parse(source)), '<ul>\n  <li>{.x\n}</li>\n</ul>\n<p class="q">z</p>')
})

test('a note definition after prose that follows the run still leaves the item', () => {
  const source = '- {.x\n}\ny\n[^m]: n\n\nsee[^m]\n'
  assert.equal(modelTrace(source).find((r) => r.line === 4).owner, 'doc/footnote:4')
})

test('a `: ` line with no term above it is prose, so its brace opens no run', () => {
  const source = '- : {.x\n}\n[^m]: n\n\nsee[^m]\n'
  assert.equal(modelTrace(source).find((r) => r.line === 3).owner, 'doc/footnote:3')
  assert.match(renderDoc(parse(source)), /<li id="fn1">/)
})
