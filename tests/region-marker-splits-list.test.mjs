import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a region marker that is the list sibling splits matching item runs', () => {
  const hosts = [
    (lines) => lines.join('\n'),
    (lines) => lines.map((line) => `> ${line}`).join('\n'),
    (lines) => `::: note\n${lines.join('\n')}\n:::`,
    (lines) => `- outer\n${lines.map((line) => `  ${line}`).join('\n')}`,
  ]
  const markers = ['- ', '* ', '1. ', '. ']
  const regions = ['%% #region x', '%% #endregion x', '%% #endregion', '%%  #region x']
  let count = 0
  for (const host of hosts) for (const marker of markers) for (const region of regions) {
    for (const word of ['a', 'long', 'α', '2']) for (const tail of ['', ' ', '\t', '  ']) {
      const src = `${host([`${marker}${word}`, `${region}${tail}`, `${marker}b`])}\n`
      const out = html(src)
      const listTags = (out.match(/<(?:ul|ol)>/g) ?? []).length
      assert.equal(listTags, host === hosts[3] ? 3 : 2, src)
      count++
    }
  }
  assert.equal(count, 1024)
})

test('the marker at list column interrupts two otherwise matching items', () => {
  assert.equal(html('- a\n%% #region x\n- b\n'), '<ul>\n  <li>a</li>\n</ul>\n<ul>\n  <li>b</li>\n</ul>')
})
