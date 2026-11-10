import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a terminal heading hard break does not enter its implicit reference key', () => {
  assert.equal(html('# [g][]\\\n'), '<section id="g">\n  <h1><a href="#g">g</a><br>\n</h1>\n</section>')
  assert.equal(html('# g\\\n\n[g][]\n'), '<section id="g">\n  <h1>g<br>\n</h1>\n  <p><a href="#g">g</a></p>\n</section>')
})
