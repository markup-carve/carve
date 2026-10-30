import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a list marker below a quote\'s attached paragraph folds into it (carve#4080 shapes 4, 5)', () => {
  assert.equal(html('>\n+\n.\n- m\n'), '<blockquote><p>.\n- m</p></blockquote>')
  assert.equal(html('>\n+\nl\n- m\n'), '<blockquote><p>l\n- m</p></blockquote>')
  assert.equal(html('> +\nl\n1. m\n'), '<blockquote><p>l\n1. m</p></blockquote>')
})

test('an item\'s attached block still ends at a list marker below it', () => {
  assert.equal(html('- +\nx\n- m\n'), '<ul>\n  <li>x</li>\n  <li>m</li>\n</ul>')
  assert.equal(html('- +\n  x\n- m\n'), '<ul>\n  <li>+\nx</li>\n  <li>m</li>\n</ul>')
})

test('a line after a heading a hosted quote took closes the outer quote (carve#4080 shape 14)', () => {
  assert.match(html('> - > +\n# h\n`\n'), /<blockquote><p>\+<\/p><\/blockquote>/)
  assert.equal(html('> - > +\n>   # h\n`\n'),
    '<blockquote>\n  <ul>\n    <li>\n      <blockquote>\n        <h1 id="h">h</h1>\n      </blockquote>\n    </li>\n  </ul>\n</blockquote>\n<p><code></code></p>')
})

test('a line below the item after a heading its quote took closes the item', () => {
  assert.match(html('- > +\n# h\n `\n'), /<blockquote><p>\+<\/p><\/blockquote>/)
  assert.equal(html('- > +\n  # h\n `\n'),
    '<ul>\n  <li>\n    <blockquote>\n      <h1 id="h">h</h1>\n    </blockquote>\n  </li>\n</ul>\n<p><code></code></p>')
})

test('a hosted quote\'s attached paragraph still takes a lazy line', () => {
  assert.match(html('> - > +\nl\n`\n'), /<p>\+\nl\n<code>/)
  assert.equal(html('> - > +\n>   l\n`\n'),
    '<blockquote>\n  <ul>\n    <li>\n      <blockquote><p>l\n<code></code></p></blockquote>\n    </li>\n  </ul>\n</blockquote>')
})
