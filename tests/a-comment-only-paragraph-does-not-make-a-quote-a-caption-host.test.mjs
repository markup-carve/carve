// A paragraph of only braced comments renders nothing, so a quote holding one
// has no content to caption (carve#4799); any other text in the quote still hosts.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

const NO_HOST = [
  '> {% c %}\n^ cap\n',
  '> {%%}\n^ cap\n',
  '> {% c %} {% d %}\n^ cap\n',
  '> {% c %} %% x\n^ cap\n',
  '> {%\n> c\n> %}\n^ cap\n',
  '> {.x}\n> {% c %}\n^ cap\n',
  '> {% c %}\n>\n> {% d %}\n^ cap\n',
  '> > {% c %}\n^ cap\n',
  '> :::\n> {% c %}\n> :::\n^ cap\n',
]

for (const source of NO_HOST) {
  test(`no caption: ${JSON.stringify(source)}`, () => {
    const out = html(source)
    assert.doesNotMatch(out, /figure/)
    assert.match(out, /<p>\^ cap<\/p>$/)
  })
}

const HOST = [
  '> {% c %} x\n^ cap\n',
  '> x {% c %}\n^ cap\n',
  '> {% c %}\n> x\n^ cap\n',
  '> {% c %}\n>\n> x\n^ cap\n',
  '> {% c\n^ cap\n',
  '> `{% c %}`\n^ cap\n',
  '> \\{% c %}\n^ cap\n',
  '> {% c %}%% x\n^ cap\n',
]

for (const source of HOST) {
  test(`caption: ${JSON.stringify(source)}`, () => {
    assert.match(html(source), /<figcaption>cap<\/figcaption>\n<\/figure>$/)
  })
}

const NOTHING = [
  ['{% c %}\n', ''],
  ['{% c %} {% d %}\n', ''],
  ['{% c %} %% x\n', ''],
  ['{% a\nb %}\n', ''],
  ['> {% c %}\n^ cap\n', '<blockquote>\n\n</blockquote>\n<p>^ cap</p>'],
  ['- {% c %}\n', '<ul>\n  <li></li>\n</ul>'],
  ['{.k}\n{% c %}\n\np\n', '<p class="k">p</p>'],
  ['- a\n\n  {% c %}\n', '<ul>\n  <li>a</li>\n</ul>'],
  ['- {% c %}\n\n  c\n', '<ul>\n  <li>c</li>\n</ul>'],
  ['- a\n\n{% c %}\n\n- b\n', '<ul>\n  <li><p>a</p></li>\n  <li><p>b</p></li>\n</ul>'],
]

for (const [source, expected] of NOTHING) {
  test(`renders nothing: ${JSON.stringify(source)}`, () => assert.equal(html(source), expected))
}

test('a braced comment beside text is still that paragraph', () => {
  assert.equal(html('x\n{% c %}\ny\n'), '<p>x\n\ny</p>')
  assert.equal(html('{% c %} x\n'), '<p> x</p>')
})
