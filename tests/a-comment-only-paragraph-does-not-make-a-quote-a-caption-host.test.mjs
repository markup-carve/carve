// A paragraph of only braced comments holds no content for the caption-host
// test (CARVE-P9-080, carve#4799); any other text in the quote still hosts.

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
