/*
 * CARVE-P9-077, ruled on carve#2570. The endnote item's lines are read off what
 * the body's blocks RENDER. The renderer used to ask two questions instead - a
 * block count, plus a `holdsAnInvisibleBlock` flag the layout pass set for a
 * comment-only body - and spelled an all-invisible body with a line that all
 * three engines omit. Measured against carve-js at the pin and at 991f8e0: both
 * omit it, for every spelling below.
 *
 * The two ends of the range are what the fix has to keep apart, so both are here:
 * a body with no blocks at all, and a body holding a visible block beside an
 * invisible one.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const item = (source) => /<li id="fn1">[\s\S]*?<\/li>/.exec(renderDoc(parse(source)))[0]
const BACKLINK = '<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a>'
const EMPTY = `<li id="fn1">\n      <p>${BACKLINK}</p>\n    </li>`

test('every spelling of an all-invisible body opens on the backlink', () => {
  for (const source of [
    'x[^1]\n\n[^1]: %% n\n',
    'x[^1]\n\n[^1]: %%%\n  n\n  %%%\n',
    'x[^1]\n\n[^1]: ```=latex\n  \\x\n  ```\n',
    'x[^1]\n\n[^1]: ```=foo\n  \\x\n  ```\n',
    'x[^1]\n\n[^1]: ```=latex\n  ```\n',
    'x[^1]\n\n[^1]: %% n\n\n  ```=latex\n  \\x\n  ```\n',
  ]) {
    assert.equal(item(source), EMPTY, source)
  }
})

test('a body with no blocks at all reads the same way', () => {
  assert.equal(item('x[^1]\n\n[^1]: {.k}\n'), EMPTY)
})

test('a visible block beside an invisible one keeps its own line', () => {
  assert.equal(
    item('x[^1]\n\n[^1]: > q\n\n  ```=latex\n  \\x\n  ```\n'),
    `<li id="fn1">\n      <blockquote><p>q</p></blockquote>\n      <p>${BACKLINK}</p>\n    </li>`,
  )
})

test('a raw block the html target matches is visible and takes a line', () => {
  assert.equal(
    item('x[^1]\n\n[^1]: ```=html\n  <b>x</b>\n  ```\n'),
    `<li id="fn1">\n      <b>x</b>\n      <p>${BACKLINK}</p>\n    </li>`,
  )
})

test('an ordinary body still carries the backlink inside its last paragraph', () => {
  assert.equal(item('x[^1]\n\n[^1]: a\n'), `<li id="fn1">\n      <p>a${BACKLINK}</p>\n    </li>`)
})
