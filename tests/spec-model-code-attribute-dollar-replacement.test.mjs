import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const value of ['$`', '$&', "$$", "$'"]) {
  test(`code attributes preserve JavaScript replacement sequence ${JSON.stringify(value)}`, () => {
    const source = `\`b\`{k="${value}"}\n`
    const escaped = value.replaceAll('&', '&amp;').replaceAll("'", '&apos;')
    assert.equal(renderDoc(parse(source)), `<p><code k="${escaped}">b</code></p>`)
  })
}
