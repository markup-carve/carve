import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('an authored title in any case replaces a fence header title', () => {
  assert.match(html('{TITLE=z}\n```js "t"\nc\n```\n'), /^<pre TITLE="z"><code/)
  assert.match(html('{Title=z}\n```js "t"\nc\n```\n'), /^<pre Title="z"><code/)
  assert.match(html('{TITLE}\n```js "t"\nc\n```\n'), /^<pre TITLE=""><code/)
})

test('a boolean authored role replaces the generated math role', () => {
  assert.equal(html('$`m`{role}\n'), '<p><span class="math inline" role="">\\(m\\)</span></p>')
  assert.equal(html('$$`m`{ROLE}\n'), '<p><span class="math display" ROLE="">\\[m\\]</span></p>')
  assert.equal(html('$`m`{.c}\n'), '<p><span class="math inline c" role="math">\\(m\\)</span></p>')
})
