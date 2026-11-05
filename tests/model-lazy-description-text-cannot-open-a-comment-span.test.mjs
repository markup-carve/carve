import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

test('termless lazy description text cannot open a comment span', () => {
  assert.equal(render('- x\n: %%\n: %%%\nz\n'), '<ul>\n  <li>x\n:\n:\nz</li>\n</ul>')
})

test('a genuine description comment still hides its span', () => {
  assert.equal(render(':: t\n: %%%\n  secret\n  %%%\n'), '<dl>\n  <dt>t</dt>\n  <dd></dd>\n</dl>')
})
