import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

// CARVE-P2-035 with PART 0 S4: a valid wrapped attribute run opens no paragraph, so a column-0 line leaves the container.
test('a run at a description body column inside an item lets a column-0 line leave the item', () => {
  assert.equal(html('- :: t\n  : a\n    {#i\n     .y}\nQQ\nz'),
    '<ul>\n  <li>\n    <dl>\n      <dt>t</dt>\n      <dd>a</dd>\n    </dl>\n  </li>\n</ul>\n<p>QQ\nz</p>')
  assert.equal(html('- :: t\n  : a\n    {#i\n    .y}\nQQ'),
    '<ul>\n  <li>\n    <dl>\n      <dt>t</dt>\n      <dd>a\n{#i\n.y}\nQQ</dd>\n    </dl>\n  </li>\n</ul>')
})

test('a run after a nested marker or description lead is measured from its brace', () => {
  assert.equal(html('- p\n  - {.x\n     }\nplain'),
    '<ul>\n  <li>p\n    <ul>\n      <li></li>\n    </ul>\n  </li>\n</ul>\n<p>plain</p>')
  assert.equal(html('- p\n  - {.x\n    }\nplain'),
    '<ul>\n  <li>p\n    <ul>\n      <li>{.x\n}\nplain</li>\n    </ul>\n  </li>\n</ul>')
  assert.equal(html('- - {.x\n     }\nplain'),
    '<ul>\n  <li>\n    <ul>\n      <li></li>\n    </ul>\n  </li>\n</ul>\n<p>plain</p>')
  assert.equal(html('- :: t\n  : {.x\n     }\nplain'),
    '<ul>\n  <li>\n    <dl>\n      <dt>t</dt>\n      <dd></dd>\n    </dl>\n  </li>\n</ul>\n<p>plain</p>')
})

test('an unprefixed continuation of a quoted run is measured by its source column', () => {
  assert.equal(html('> {.x\n   .y}\nplain'), '<blockquote>\n\n</blockquote>\n<p>plain</p>')
  assert.equal(html('> {.x\n  .y}\nplain'), '<blockquote><p>{.x\n.y}\nplain</p></blockquote>')
  assert.equal(html('- > {.x\n     .y}\nplain'),
    '<ul>\n  <li>\n    <blockquote>\n\n    </blockquote>\n  </li>\n</ul>\n<p>plain</p>')
  // CARVE-P2-035 and carve#5619 measure the unprefixed line at its written column, even after a tab.
  assert.equal(html('> \t{.x\n     .y}\nplain'), '<blockquote>\n\n</blockquote>\n<p>plain</p>')
  assert.equal(html('> - {.x\n   .y}\nplain'),
    '<blockquote>\n  <ul>\n    <li>{.x\n.y}\nplain</li>\n  </ul>\n</blockquote>')
})
