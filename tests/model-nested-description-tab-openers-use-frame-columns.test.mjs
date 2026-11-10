import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))
const host = ':: t\n: a\n  :: t\n  : a\n'

test('nested description block openers use the column of each owner frame (carve#4085)', () => {
  for (const [tail, visible] of [
    ['::: note\n', '<aside class="admonition note"'],
    ['::: note\n      x\n      :::\n', '<aside class="admonition note"'],
    ['- z\n', '<li>z</li>'],
    ['```\n      x\n      ```\n', '<pre><code>x\n</code></pre>'],
  ]) {
    const spaced = html(host + '      ' + tail)
    const tabbed = html(host + '  \t' + tail.replaceAll('      ', '  \t'))
    assert.equal(tabbed, spaced, tail)
    assert.ok(tabbed.includes(visible), tail)
  }
})
