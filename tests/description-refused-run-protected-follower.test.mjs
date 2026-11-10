import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

test('a refused description run keeps a note-definition follower as text', () => {
  assert.equal(html(':: t\n: {.x\n}\n[^m]: n\nz'), '<dl>\n  <dt>t</dt>\n  <dd>{.x\n}\n[^m]: n\nz</dd>\n</dl>')
  assert.equal(html(':: t\n: {% c\n%}\n[^m]: n\nz'), '<dl>\n  <dt>t</dt>\n  <dd>{% c\n%}\n[^m]: n\nz</dd>\n</dl>')
})

test('the protected follower rule applies to other block shapes and ends at a sibling', () => {
  assert.equal(html(':: t\n: {.x\n}\n# h\nz'), '<dl>\n  <dt>t</dt>\n  <dd>{.x\n}\n# h\nz</dd>\n</dl>')
  assert.equal(html(':: t\n: {.x\n}\n> q\nz'), '<dl>\n  <dt>t</dt>\n  <dd>{.x\n}\n&gt; q\nz</dd>\n</dl>')
  assert.equal(html(':: t\n: {.x\n}\n- x\nz'), '<dl>\n  <dt>t</dt>\n  <dd>{.x\n}\n- x\nz</dd>\n</dl>')
  assert.equal(html(':: t\n: {.x\n}\n[^m]: n\nz\n: next'), '<dl>\n  <dt>t</dt>\n  <dd>{.x\n}\n[^m]: n\nz</dd>\n  <dd>next</dd>\n</dl>')
  assert.equal(html(':: t\n: {#id\n}\n[r]: /u\nz'), '<dl>\n  <dt>t</dt>\n  <dd>{#id\n}\nz</dd>\n</dl>')
})

test('a protected brace follower cannot become a fresh refused run', () => {
  assert.equal(html(':: t\n: {.x\n}\n{.y\n}\n# h\nz'), '<dl>\n  <dt>t</dt>\n  <dd>{.x\n}\n{.y\n}</dd>\n</dl>\n<section id="h">\n  <h1>h</h1>\n  <p>z</p>\n</section>')
})

test('a protected fence follower keeps its payload through the closer', () => {
  assert.equal(html(':: t\n: {.x\n}\n```\n# h\n```\nz'), '<dl>\n  <dt>t</dt>\n  <dd>{.x\n}\n<code>\n# h\n</code>\nz</dd>\n</dl>')
})
