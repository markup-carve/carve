import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#5288: a note the host keeps is skipped before the attached block
// (PART 9 §17 L3), so the fence after it runs through its closer as it does
// without the note.
const html = source => renderDoc(parse(source)).trim()
const withoutNote = source => source.split('\n').filter(line => !line.includes('[^n]:')).join('\n')

const cases = {
  'a blank body': '- +\n  [^n]: x\n```\n\n```\n',
  'a line, then a blank': '- +\n  [^n]: x\n```\nz\n\n```\n',
  'a blank, then a line': '- +\n  [^n]: x\n~~~\n\nz\n~~~\n',
  'an ordered host': '1. +\n   [^n]: x\n```\n\n```\n',
  'a note at the marker column': '- +\n[^n]: x\n```\n\n```\n',
}

for (const [name, source] of Object.entries(cases)) {
  test(`a fence a + attaches after a note keeps ${name}`, () => {
    assert.equal(html(source), html(withoutNote(source)))
  })
}

test('the reported document renders one code block holding the blank', () => {
  assert.equal(html('- +\n  [^n]: x\n```\n\n```\n'), '<ul>\n  <li>\n    <pre><code>\n</code></pre>\n  </li>\n</ul>')
})
