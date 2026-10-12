import assert from 'node:assert/strict'
import { test } from 'node:test'
import { TYPOGRAPHY_FLANK, isTypographyFlank, renderInline, renderInlineHardBreaks } from '../scripts/spec/render.mjs'

test('typography flanks are space, tab, LF, CR, NBSP, soft break and hard break', () => {
  assert.deepEqual([...TYPOGRAPHY_FLANK], [' ', '\t', '\n', '\r', '\u00a0'])
  // Soft and hard break boundaries both use LF in the typography context.
  const members = [
    ['space', ' '], ['tab', '\t'], ['line feed', '\n'],
    ['carriage return', '\r'], ['no-break space', '\u00a0'],
    ['soft break', '\n'], ['hard break', '\n'],
  ]
  assert.equal(members.length, 7)
  for (const [name, member] of members) assert.equal(isTypographyFlank(member), true, name)
  for (const other of ['', '\v', '\f', '\u0085', '\u2003', 'x', '=', '--']) {
    assert.equal(isTypographyFlank(other), false, JSON.stringify(other))
  }
  assert.equal(renderInline('x\n"q"'), 'x\n“q”')
  assert.equal(renderInlineHardBreaks('x\n"q"'), 'x<br>\n“q”')
})

for (const flank of ['\t', '\u00a0']) {
  test(`${JSON.stringify(flank)} opens a quote and counts as space before a dash run`, () => {
    const htmlFlank = flank === '\u00a0' ? '&nbsp;' : flank
    assert.equal(renderInline(`x${flank}"q"`), `x${htmlFlank}“q”`)
    assert.equal(renderInline(`x${flank}--q`), `x${htmlFlank}--q`)
    assert.equal(renderInline(`x${flank}-- q`), `x${htmlFlank}– q`)
  })
}
