// A paragraph of only braced comments renders nothing at any line count, so list
// tightness, the sibling skip and the `+` read it as they read `%%` lines (carve#4799).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s+</g, '<').replace(/>\s+/g, '>').trim()

const COMMENTS = [['{% c %}'], ['{% c', ' d %}'], ['{% a', ' b', ' c %}'], ['{% a %} {% b %}']]
const SHAPES = [
  (b) => ['- ' + b[0], ...b.slice(1).map((l) => '  ' + l), '', '  Body.'],
  (b) => ['- a', '', ...b.map((l) => '  ' + l)],
  (b) => ['- a', '', ...b.map((l) => '  ' + l), '# H'],
  (b) => ['- a', '', ...b.map((l) => '  ' + l), '', '  text'],
  (b) => ['- a', '', ...b, '', '- b'],
  (b) => ['1. a', '', ...b, '', '2. b'],
  (b) => [':: t', ': a', '', ...b, '', ':: u', ': b'],
  (b) => ['- +', b[0], ...b.slice(1).map((l) => '  ' + l), '', '# H'],
  (b) => ['> +', b[0], ...b.slice(1).map((l) => '  ' + l), '', 'x'],
  (b) => ['- +', b[0], ...b.slice(1).map((l) => '  ' + l), '# H'],
]

for (const comment of COMMENTS) {
  for (const shape of SHAPES) {
    const source = shape(comment).join('\n') + '\n'
    const twin = shape(comment.map(() => '%% c')).join('\n') + '\n'
    test(`as its %% twin: ${JSON.stringify(source)}`, () => {
      assert.equal(html(source), html(twin))
    })
  }
}
