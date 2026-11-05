/*
 * A refused brace run whose continuation folds in lazily is paragraph text
 * (CARVE-P2-035); the line's internal LAZY frame must not reach the output.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (src) => renderDoc(parse(src)).trim()

test('a lazy continuation of a refused comment run renders as text', () => {
  assert.equal(render('- {% c\nd %}\n'), '<ul>\n  <li>{% c\nd %}</li>\n</ul>')
  assert.equal(render('> {% c\nd %}\n'), '<blockquote><p>{% c\nd %}</p></blockquote>')
})

test('no host leaks the frame', () => {
  for (const host of ['- ', '> ', '1. ', ': ', '- - ', '> - ']) {
    const src = (host === ': ' ? ':: t\n' : '') + host + '{% c\nd %}\n'
    assert.ok(!render(src).includes('\u0000'), JSON.stringify(src))
  }
})
