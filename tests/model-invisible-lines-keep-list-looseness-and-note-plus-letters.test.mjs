import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a column-0 comment before a sibling keeps the blank that loosens the list (carve#5031)', () => {
  assert.equal(html('- a\n\n  %% y\n%% z\n- c\n'), html('- a\n\n  %% y\n- c\n'))
  assert.equal(html('- a\n\n  %% y\n%% z\n- c\n'), '<ul>\n  <li><p>a</p></li>\n  <li><p>c</p></li>\n</ul>')
  assert.equal(html('- %%%\n\n%%%\n%% z\n- c\n'), '<ul>\n  <li></li>\n  <li><p>c</p></li>\n</ul>')
})

test('item content after a marker-line span keeps the list tight (carve#5029)', () => {
  const tight = '<ul>\n  <li>c</li>\n  <li>d</li>\n</ul>'
  assert.equal(html('- %%%\n\n  %%%\n  c\n- d\n'), tight)
  assert.equal(html('- %%%\n\n%%%\n\n  c\n- d\n'), tight)
  assert.equal(html('- %%%\n\n%%%\n  c\n- d\n'), tight)
})
