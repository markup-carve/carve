import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

// carve#4127: each unclosed `{` line scanned forward for a `}` up to the next
// blank line, so a run of them read quadratically many lines.
const shapes = [
  ['d\n', '{.c x\ny\n'],
  ['- d\n', '  {.c x\ny\n'],
  ['- d\n', '  {.c x\n'],
  ['[^f]: d\n', '  {.c x\ny\n'],
  ['> d\n', '> {.c x\n'],
  ['[^f]: d\n', '  {.c x\ny\n', '}\n'],
]
const scanned = (head, unit, tail, count) => {
  resetLayoutWork()
  parse(head + unit.repeat(count) + tail)
  return layoutWork.attrScan
}

for (const [head, unit, tail = ''] of shapes) {
  test(`${JSON.stringify(head + unit + tail)} scans a linear number of attribute lines`, () => {
    const small = scanned(head, unit, tail, 500)
    const large = scanned(head, unit, tail, 2000)
    assert.ok(large <= small * 4 * 1.25, `500 units: ${small} lines, 2000 units: ${large}`)
  })
}

test('a bare value may hold a brace on a wrapped line below a footnote body (carve#4104)', () => {
  assert.match(html('[^f]: d\n  {.c\nk=a{b}\n  x\n\n[^f]\n'), /<p>d<\/p>\n {6}<p class="c" k="a\{b">x/)
})

test('a line that opens a block still ends a wrap', () => {
  assert.equal(html('d\n{.c\n{b}\nx\n'), '<p>d\n{.c</p>\n<p b="">x</p>')
})
