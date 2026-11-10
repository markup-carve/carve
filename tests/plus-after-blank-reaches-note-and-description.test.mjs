import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

test('a marker-column plus after a blank reaches its note or description (#5639)', () => {
  for (const [host, suffix, holder] of [
    [':: t\n: h', '', /<dd>[\s\S]*<p>pp<\/p>[\s\S]*<\/dd>/],
    ['[^n]: h', '\n\nsee[^n]', /<li id="fn1">[\s\S]*<p>pp<a href="#fnref1"/],
  ]) {
    for (const blanks of ['\n\n', '\n\n\n']) {
      const source = `${host}${blanks}+\npp${suffix}`
      const html = render(source)
      assert.match(html, holder, source)
      assert.doesNotMatch(html, /<p>\+\npp<\/p>/, source)
    }
  }
})
