import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('an invisible attribute lead does not loosen its list', () => {
  assert.equal(html('- {.c}\n\n  Body.\n- x\n'),
    '<ul>\n  <li><p class="c">Body.</p></li>\n  <li>x</li>\n</ul>')
})

test('a paragraph after an earlier visible nested block loosens the item', () => {
  assert.equal(html('- - a\n\n  Body.\n'),
    '<ul>\n  <li>\n    <ul>\n      <li>a</li>\n    </ul>\n    <p>Body.</p>\n  </li>\n</ul>')
})

test('comments do not split a three-blank hard list boundary', () => {
  assert.equal(html('- a\n\n\n%% c\n\n- b\n'),
    '<ul>\n  <li>a</li>\n</ul>\n<ul>\n  <li>b</li>\n</ul>')
})
