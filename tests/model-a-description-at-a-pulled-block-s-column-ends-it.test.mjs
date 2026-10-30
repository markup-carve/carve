import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> /g, '>').replace(/ </g, '<')

test('a description at the pulled block\'s column ends it at every marker column and separator', () => {
  for (const marker of [' ', '  ', '   ']) {
    for (const separator of [' ', '  ']) {
      assert.equal(html(`:: t\n${marker}:${separator}+\nl\n: b\n`), '<dl><dt>t</dt><dd>l</dd><dd>b</dd></dl>')
    }
  }
})

test('so it does after a quote, whose paragraph takes no such line', () => {
  assert.equal(html(':: t\n : +\n> q\n: b\n'), '<dl><dt>t</dt><dd><blockquote><p>q</p></blockquote></dd><dd>b</dd></dl>')
})

test('a line at or past the body keeps its reading', () => {
  assert.equal(html(':: t\n : +\nl\n   : b\n'), '<dl><dt>t</dt><dd>l : b</dd></dl>')
  assert.equal(html(':: t\n : +\nl\nm\n'), '<dl><dt>t</dt><dd>l m</dd></dl>')
})
