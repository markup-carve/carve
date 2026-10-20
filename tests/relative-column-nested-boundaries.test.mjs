import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

test('a refused nested marker folds like letter text', () => {
  for (const source of ['- a\n  - b\n    - c\n    +\n  para', '- a\n  - b\n    - c\n    +\n  > q', '- a\n  - b\n    - c\n    +\n  - d']) {
    assert.equal(html(source), html(source.replace('    +', '    q')).replace('c\nq', 'c\n+'))
  }
})

test('a marker at a deep item column ends its fence and attaches there', () => {
  for (const fence of ['```', '~~~']) {
    const source = `- a\n  - b\n    - ${fence}\n      x\n    +\n    > q`
    assert.match(html(source), /<pre><code>x\n<\/code><\/pre>\n            <blockquote><p>q<\/p><\/blockquote>/)
  }
})

test('an ancestor marker leaves one newline in a deeper unclosed fence', () => {
  for (const source of ['- - ```\n    x\n+\n> q', '- - - ```\n      x\n  +\n  > q']) {
    assert.match(html(source), /<pre><code>x\n<\/code><\/pre>/)
  }
})

test('a refused marker in a quote folds like letter text', () => {
  const source = '> - a\n>   - b\n>     - c\n>     +\n>   para'
  assert.equal(html(source), html(source.replace('>     +', '>     q')).replace('q\n', '+\n'))
})

test('a blank before a refused marker leaves ordinary text at its column', () => {
  assert.equal(html('- a\n\n+\n- b'), '<ul>\n  <li>a</li>\n</ul>\n<p>+</p>\n<ul>\n  <li>b</li>\n</ul>')
  assert.equal(html('> - a\n>\n> +\n> - b'), '<blockquote>\n  <ul>\n    <li>a</li>\n  </ul>\n  <p>+</p>\n  <ul>\n    <li>b</li>\n  </ul>\n</blockquote>')
})

test('a closed list leaves no refused sibling marker behind', () => {
  assert.equal(html('- a\n\npara\n\n+\n- b'), '<ul>\n  <li>a</li>\n</ul>\n<p>para</p>\n<p>+\n- b</p>')
  assert.equal(html('> - a\n>\n> para\n>\n> +\n> - b'), '<blockquote>\n  <ul>\n    <li>a</li>\n  </ul>\n  <p>para</p>\n  <p>+\n- b</p>\n</blockquote>')
  assert.match(html('[^1]: n\n+\n- b\n\nx[^1]'), /<li id="fn1">[\s\S]*<ul>[\s\S]*<li>b<\/li>/)
})

test('nested refused siblings keep their plus in quotes and footnotes', () => {
  const quoted = html('- > - a\n  > +\n  > - b')
  const footnote = html('x[^1]\n\n[^1]: n\n\n  - a\n  +\n  - b')
  assert.match(quoted, /<li>a\n\+<\/li>/)
  assert.match(footnote, /<li>a\n\+<\/li>/)
  assert.doesNotMatch(quoted + footnote, /[\uE100-\uE1FF]/)
})

test('a quote marker attaches at its own column and other columns stay text', () => {
  assert.equal(html('> q\n   +'), '<blockquote><p>q\n+</p></blockquote>')
  assert.equal(html('- > q\n  +\n  para'), '<ul>\n  <li>\n    <blockquote>\n      <p>q</p>\n      <p>para</p>\n    </blockquote>\n  </li>\n</ul>')
})
