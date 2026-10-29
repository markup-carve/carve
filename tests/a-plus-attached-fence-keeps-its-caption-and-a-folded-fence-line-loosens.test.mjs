/*
 * A list continuation marker gives its attached fence the following caption.
 * A fence line folded into a child paragraph is text in the looseness scan.
 * Only an invalid opener folds: a valid one always opens (carve#4018).
 * The controls keep blank gaps, other hosts, and real fences in place.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const doc = (...lines) => lines.join('\n') + '\n'
const html = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()
const codeFigure = '<figure><pre><code>x </code></pre><figcaption>cap</figcaption></figure>'

for (const fence of ['```', '~~~']) {
  test(`${fence} caption attaches after a list continuation`, () => {
    assert.equal(html(doc('- x', '+', fence, 'x', fence, '^ cap', '- c')),
      `<ul><li>x ${codeFigure}</li><li>c</li></ul>`)
  })
}

test('first-block and ordered continuation forms take the caption', () => {
  assert.equal(html(doc('- +', '```', 'x', '```', '^ cap', '- c')),
    `<ul><li>${codeFigure}</li><li>c</li></ul>`)
  assert.equal(html(doc('1. x', '+', '~~~', 'x', '~~~', '^ cap', '2. c')),
    `<ol><li>x ${codeFigure}</li><li>c</li></ol>`)
})

test('only a figure colon fence takes its caption', () => {
  assert.equal(html(doc('- x', '+', '::: figure', '![a](b.png)', ':::', '^ cap', '- c')),
    '<ul><li>x <figure class="carve-figure-group"><img src="b.png" alt="a"><figcaption>cap</figcaption></figure></li><li>c</li></ul>')
  assert.equal(html(doc('- x', '+', '::: figure', 'hi', ':::', '^ cap', '- c')),
    '<ul><li>x <figure class="carve-figure-group"><p>hi</p><figcaption>cap</figcaption></figure></li><li>c</li></ul>')
  for (const [opener, expected] of [
    ['::: figure [label]', '<p class="div-label">label</p>'],
    ['::: figure "t"', '<p class="admonition-title">t</p>'],
  ]) {
    assert.equal(html(doc('- x', '+', opener, 'hi', ':::', '^ cap', '- c')),
      `<ul><li>x <div class="figure">${expected}<p>hi</p></div></li></ul><p>^ cap - c</p>`)
  }
  assert.equal(html(doc('- x', '+', '::: note', 'hi', ':::', '^ cap', '- c')),
    '<ul><li>x <aside class="admonition note" aria-label="Note"><p>hi</p></aside></li></ul><p>^ cap - c</p>')
  assert.equal(html(doc('- x', '+', '::: aside', 'hi', ':::', '^ cap', '- c')),
    '<ul><li>x <div class="aside"><p>hi</p></div></li></ul><p>^ cap - c</p>')
})

test('a blank gap leaves the continuation extent unchanged', () => {
  assert.equal(html(doc('- x', '+', '```', 'x', '```', '', '^ cap', '- c')),
    '<ul><li>x <pre><code>x </code></pre></li></ul><p>^ cap - c</p>')
})

test('an unclosed attached fence owns the remainder', () => {
  assert.equal(html(doc('- x', '+', '```', 'x', '^ cap', '- c')),
    '<ul><li>x <pre><code>x ^ cap - c </code></pre></li></ul>')
})

for (const host of ['> q', '[^f]: n', ':: t\n:  d']) {
  test(`${host} does not gain a caption through its continuation`, () => {
    const source = doc(...host.split('\n'), '+', '```', 'x', '```', '^ cap', '- c')
    if (host === '> q') assert.match(html(source), /<figcaption>cap - c<\/figcaption>/)
    else assert.match(html(source), /<p>\^ cap - c<\/p>/)
  })
}

for (const fence of ['```', '~~~']) {
  test(`${fence} folded into a child paragraph leaves the outer list loose`, () => {
    const result = html(doc('- - text', `  ${fence}js title="x"`, '  x', '', '  cap', '- c'))
    assert.match(result, /<\/ul><p>cap<\/p><\/li><li><p>c<\/p><\/li><\/ul>$/)
  })
}

test('an ordinary lazy line also leaves the outer list loose', () => {
  assert.match(html(doc('- - text', '  ![i](x.png)', '', '  cap', '- c')),
    /<\/ul><p>cap<\/p><\/li><li><p>c<\/p><\/li><\/ul>$/)
})

test('without a blank, the folded fence line leaves the list tight', () => {
  assert.equal(html(doc('- - text', '  ```js title="x"', '  x', '  cap', '- c')),
    '<ul><li><ul><li>text <code>js title="x" x cap</code></li></ul></li><li>c</li></ul>')
})

test('a real fence stays tight while blank-separated inline span paragraphs loosen', () => {
  assert.equal(html(doc('- outer', '  - head', '', '    ```', '    a', '  ```', '', '  tail')),
    '<ul><li>outer <ul><li>head <pre><code>a </code></pre></li></ul><pre><code> tail </code></pre></li></ul>')
  assert.equal(html(doc('- a', '  ```js title="x"', '  x', '', '  z', '', '  w')),
    '<ul><li><p>a <code>js title="x" x</code></p><p>z</p><p>w</p></li></ul>')
})
