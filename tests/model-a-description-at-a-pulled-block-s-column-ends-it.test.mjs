import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> /g, '>').replace(/ </g, '<')

// A `: +` past its term refuses column 0 (carve#4409), and a `: ` line is still its sibling (carve#4408).
test('a description at column zero is the sibling of a refused + at every marker column and separator', () => {
  for (const marker of [' ', '  ', '   ']) {
    for (const separator of [' ', '  ']) {
      assert.equal(html(`:: t\n${marker}:${separator}+\nl\n: b\n`), '<dl><dt>t</dt><dd></dd></dl><p>l : b</p>')
    }
  }
})

test('a refused + before a quote reads as a letter', () => {
  assert.equal(html(':: t\n : +\n> q\n: b\n'), '<dl><dt>t</dt><dd></dd></dl><blockquote><p>q : b</p></blockquote>')
})

test('a line at or past the body keeps its reading', () => {
  assert.equal(html(':: t\n : +\nl\n   : b\n'), '<dl><dt>t</dt><dd></dd></dl><p>l : b</p>')
  assert.equal(html(':: t\n : +\nl\nm\n'), '<dl><dt>t</dt><dd></dd></dl><p>l m</p>')
})
