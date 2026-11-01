import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

for (const [name, source, expected] of [
  ['a later closer does not absorb a description sibling',
    ':: t\n: +\n:::\n: b\n:::\n',
    '<dl>\n  <dt>t</dt>\n  <dd>\n    <div>\n\n    </div>\n  </dd>\n  <dd>b</dd>\n</dl>\n<div>\n\n</div>'],
  ['a term is also a sibling of the attached frame',
    ':: t\n: +\n:::\n:: u\n: v\n',
    '<dl>\n  <dt>t</dt>\n  <dd>\n    <div>\n\n    </div>\n  </dd>\n  <dt>u</dt>\n  <dd>v</dd>\n</dl>'],
  ['an own-line plus uses the same host boundary',
    ':: t\n: a\n+\n:::\n: b\n:::\n',
    '<dl>\n  <dt>t</dt>\n  <dd>\n    <p>a</p>\n    <div>\n\n    </div>\n  </dd>\n  <dd>b</dd>\n</dl>\n<div>\n\n</div>'],
]) test(name, () => assert.equal(html(source), expected))

test('an attribute lead keeps the colon frame and its sibling boundary', () => {
  assert.equal(html(':: t\n: +\n{.x}\n:::\n: b\n:::\n'),
    '<dl>\n  <dt>t</dt>\n  <dd>\n    <div class="x">\n\n    </div>\n  </dd>\n  <dd>b</dd>\n</dl>\n<div>\n\n</div>')
})

test('a sibling-shaped code payload stays inside the colon frame', () => {
  assert.equal(html(':: t\n: +\n:::\n```\n: hidden\n```\n: b\n:::\n'),
    '<dl>\n  <dt>t</dt>\n  <dd>\n    <div>\n      <pre><code>: hidden\n</code></pre>\n    </div>\n  </dd>\n  <dd>b</dd>\n</dl>\n<div>\n\n</div>')
})
