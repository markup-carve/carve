/*
 * CARVE-P9-067: an intervening column refuses a first-block `+` in every host
 * group, so a footnote's `+` stays text and an interrupting block below its body
 * column leaves the note (carve#4212).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))
const note = (out) => out.slice(out.indexOf('<li id="fn1">'))
const body = (out) => out.slice(0, out.indexOf('<section role="doc-endnotes"'))

for (const [host, pad] of [['', ' '], ['> ', '>  '], ['> > ', '> >  '], ['- x\n  ', '   ']]) {
  for (const block of ['# H', '::: d\nH\n:::', '> H', '{.k}\nH']) {
    test(`${JSON.stringify(host)}[^b]: + refuses ${JSON.stringify(block)} at an intervening column`, () => {
      const lines = block.split('\n').map((l) => (l === '' ? '' : pad + l))
      const out = html(`${host}[^b]: +\n${lines.join('\n')}\n\nr[^b]\n`)
      assert.match(note(out), /<p>\+<a href/, out)
      assert.match(body(out), /H/, out)
    })
  }
}

test('the shortest reproduction renders the heading at document level', () => {
  assert.match(html('[^b]: +\n # H\n\nr[^b]\n'), /^<section id="H">\n  <h1>H<\/h1>/)
})
