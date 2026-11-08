import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, '')
const note = (source) => html(source).match(/<li id="fn1">(.*?)<p><a href/)?.[1] ?? null

test('a block at the body column of a marker-line note after its + block is the note\'s, carve#5512', () => {
  for (const block of ['# z', '> r', '| a |', '- v', '```\n    c\n    ```']) {
    assert.match(note(`- [^a]: +\n  p\n    ${block}\n\nsee[^a]\n`), /^<p>p<\/p>./, block)
    assert.match(html(`- [^a]: +\n  p\n    ${block}\n\nsee[^a]\n`), /^<ul><li><\/li><\/ul>/, block)
  }
  assert.equal(note('- [^a]: +\n  p\n    ``` x\n    [^z]: code\n\nsee[^a]\n'), '<p>p</p><pre><code class="language-x">[^z]: code</code></pre>')
})

test('a block at the item column after the + block stays the item\'s', () => {
  assert.equal(html('- [^a]: +\n  p\n  # z\n\n  more\n'), '<ul><li><h1 id="z">z</h1><p>more</p></li></ul>')
  const source = '- [^a]: +\n  p\n  # z\n\nsee[^a]\n'
  assert.match(html(source), /^<ul><li><h1 id="z">z<\/h1><\/li><\/ul>/)
  assert.match(html(source), /<li id="fn1"><p>p<a /)
})
