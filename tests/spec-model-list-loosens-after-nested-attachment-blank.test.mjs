import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

test('a direct item block after a blank-ended nested attachment loosens its list', () => {
  for (const nested of ['  :: t\n  : +', '  [^1]: +']) {
    const source = `- outer\n${nested}\n  ::: x\n\n  ::: y\n  b\n  :::\n\n  [^1]\n# next\n`
    const html = render(source)
    assert.match(html, /<li><p>outer<\/p>/, source)
    assert.match(html, /<div class="y">\s*<p>b<\/p>\s*<\/div>\s*(?:<p>.*?<\/p>\s*)?<\/li>/s, source)
  }
})
