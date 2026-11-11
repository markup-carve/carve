import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const nested = (marker, lead, attr = '{#i}') => {
  const pad = ' '.repeat(marker.length + 1)
  return `${marker} x\n${pad}${marker} +\n${pad}[^m]: n\n${pad}${lead}${attr}\n${pad}q\n\np[^m]\n`
}

test('a nested plus attaches the line after a note with an attribute line in its body (carve#5963)', () => {
  for (const marker of ['-', '*', '1.', '10.']) {
    for (const lead of ['  ', '   ', '    ', '\t', ' \t', '  \t', '   \t']) {
      const out = html(nested(marker, lead))
      assert.doesNotMatch(out, /id="i"/, JSON.stringify(nested(marker, lead)))
      assert.match(out, /<li>q<\/li>/, JSON.stringify(nested(marker, lead)))
    }
  }
})

test('the attribute line sits at the same column with a tab as with its space spelling (PART 9 §24 C5)', () => {
  // After `1. ` a tab at column 3 stops at column 7, so it reads as four spaces.
  assert.equal(html(nested('1.', '   \t')), html(nested('1.', '    ')))
  assert.equal(html(nested('1.', '   \t', '{#i\n    z}')), html(nested('1.', '    ', '{#i\n    z}')))
})
