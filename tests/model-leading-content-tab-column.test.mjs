import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a leading content tab leaves a bullet item\'s content column after the separator (carve#4610)', () => {
  assert.equal(html('- \tx\n  # H\n'), '<ul>\n  <li>\tx\n    <h1 id="H">H</h1>\n  </li>\n</ul>')
  assert.equal(html('- \te\n\n  f\n'), '<ul>\n  <li><p>\te</p>\n    <p>f</p>\n  </li>\n</ul>')
  assert.equal(html('- \te\n\n f\n'), '<ul>\n  <li>\te</li>\n</ul>\n<p>f</p>')
})

test('a leading content tab leaves an ordered item\'s content column after the separator (carve#4610)', () => {
  assert.equal(html('1. \te\n\n   f\n'), '<ol>\n  <li><p>\te</p>\n    <p>f</p>\n  </li>\n</ol>')
})

test('a term and a description keep a leading content tab (carve#4610)', () => {
  assert.equal(html(':: \tx\n'), '<dl>\n  <dt>\tx</dt>\n</dl>')
  assert.equal(html(':: t\n: \tx\n  # H\n'), '<dl>\n  <dt>t</dt>\n  <dd>\n    <p>\tx</p>\n    <h1 id="H">H</h1>\n  </dd>\n</dl>')
  assert.equal(html(':: t\n: \t- x\n'), '<dl>\n  <dt>t</dt>\n  <dd>\t- x</dd>\n</dl>')
})

// The tab is a content character: each shape renders as its twin whose tab is
// a letter, with the letter read back as the tab.
test('a tab-led content run reads as a letter-led run at the same column', () => {
  const markers = ['-', '1)', 'a.', '10.', ':: t\n:']
  const leads = ['\t', '\t\t', '\t ', '\t  ', ' \t']
  const indents = ['', ' ', '  ', '   ', '    ', '      ', '\t']
  const followers = ['f', '- g', '{.c}\nh', '```\nc\n```', '> q', '# H']
  const wraps = [
    (s) => s,
    (s) => s.split('\n').map((l) => (l ? '> ' + l : '>')).join('\n'),
    (s) => '- o\n\n' + s.split('\n').map((l) => (l ? '  ' + l : l)).join('\n'),
    (s) => '[^n]: z\n\n' + s.split('\n').map((l) => (l ? '  ' + l : l)).join('\n') + '\n\n[^n]',
  ]
  let checked = 0
  for (const m of markers) for (const lead of leads) {
    const twinLead = lead.replace('\t', 'Z')
    for (const indent of indents) for (const blank of ['\n', '']) for (const wrap of wraps) {
      const follower = followers[(checked + indent.length) % followers.length]
      const body = follower.split('\n').map((l) => indent + l).join('\n')
      const src = wrap(`${m} ${lead}e\n${blank}${body}\n`) + '\n'
      const twin = wrap(`${m} ${twinLead}e\n${blank}${body}\n`) + '\n'
      assert.equal(html(src), html(twin).replace('Z', '\t'), JSON.stringify(src))
      checked++
    }
  }
  assert.ok(checked >= 1400)
})
