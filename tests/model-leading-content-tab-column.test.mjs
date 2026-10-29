import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a leading content tab moves a bullet item\'s content column to where the content starts (carve#4103)', () => {
  assert.equal(html('- \te\n\n  f\n'), '<ul>\n  <li>e</li>\n</ul>\n<p>f</p>')
  assert.equal(html('- \te\n\n    f\n'), '<ul>\n  <li><p>e</p>\n    <p>f</p>\n  </li>\n</ul>')
})

test('a leading content tab moves an ordered item\'s content column (carve#4103)', () => {
  assert.equal(html('1. \te\n\n   f\n'), '<ol>\n  <li>e</li>\n</ol>\n<p>f</p>')
})

test('the whole leading whitespace run is stripped and counted (CARVE-P2-010)', () => {
  assert.equal(html('- \t\te\n\n      f\n'), '<ul>\n  <li>e</li>\n</ul>\n<p>f</p>')
  assert.equal(html('- \t\te\n\n        f\n'), '<ul>\n  <li><p>e</p>\n    <p>f</p>\n  </li>\n</ul>')
})

test('a sub-item\'s leading tab is measured in the sub-item\'s frame (PART 9 SS24 C5)', () => {
  assert.equal(html('- o\n\n  1. \t e\n\n       f\n'), html('- o\n\n  1.   e\n\n       f\n'))
})

// Each shape with a tab-led content run renders as its twin whose run is spaces
// reaching the same column of the marker's frame.
test('a tab-led content run reads as the space run to the same column', () => {
  const markers = ['-', '1)', 'a.', '10.']
  const leads = ['\t', '\t\t', '\t ', '\t  ']
  const indents = ['', '  ', '   ', '     ', '      ', '\t']
  const followers = ['f', '- g', '{.c}\nh', '```\nc\n```', '> q']
  const wraps = [
    (s) => s,
    (s) => s.split('\n').map((l) => (l ? '> ' + l : '>')).join('\n'),
    (s) => '- o\n\n' + s.split('\n').map((l) => (l ? '  ' + l : l)).join('\n'),
    (s) => '[^n]: z\n\n' + s.split('\n').map((l) => (l ? '  ' + l : l)).join('\n') + '\n\n[^n]',
  ]
  let checked = 0
  for (const m of markers) for (const sep of [' ']) for (const lead of leads) {
    let col = m.length + sep.length
    for (const ch of lead) col = ch === '\t' ? (Math.floor(col / 4) + 1) * 4 : col + 1
    const twinLead = ' '.repeat(col - m.length)
    for (const indent of indents) for (const blank of ['\n', '']) for (const wrap of wraps) {
      const follower = followers[(indent.length + lead.length + m.length) % followers.length]
      const body = follower.split('\n').map((l) => indent + l).join('\n')
      const src = wrap(`${m}${sep}${lead}e\n${blank}${body}\n`) + '\n'
      const twin = wrap(`${m}${twinLead}e\n${blank}${body}\n`) + '\n'
      assert.equal(html(src), html(twin), JSON.stringify(src))
      checked++
    }
  }
  assert.ok(checked > 700)
})
