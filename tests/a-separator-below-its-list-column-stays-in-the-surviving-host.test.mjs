import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const depth of [1, 2, 3]) {
  test(`a separator at the outer marker column ends an item at depth ${depth}`, () => {
    const items = Array.from({ length: depth }, (_, i) => `${'  '.repeat(i)}- a\n`).join('')
    const source = `${items}${'  '.repeat(depth)}:: m\n: l\n: l\n`
    const html = renderDoc(parse(source)).replace(/\s+/g, ' ')
    assert.match(html, /<\/ul> <p>: l : l<\/p>$/)
    assert.doesNotMatch(html, /<dd>/)
  })
}

test('one column inside the item folds the separator into the open term', () => {
  const html = renderDoc(parse('- a\n  :: m\n : l\n'))
  assert.match(html, /<dt>m\n: l<\/dt>/)
  assert.doesNotMatch(html, /<dd>/)
})

for (const depth of [2, 3]) {
  test(`an open quote paragraph at depth ${depth} keeps the separator`, () => {
    const source = `> lead\n${'> '.repeat(depth)}inner\n${'> '.repeat(depth)}:: key\n${'> '.repeat(depth)}:  body\n>   tail\n:  next\n`
    const html = renderDoc(parse(source)).replace(/\s+/g, ' ')
    assert.match(html, /<dd>body tail : next<\/dd>/)
    assert.equal((html.match(/<blockquote>/g) ?? []).length, depth)
  })
}

test('a term spelled inside code gives no separator claim', () => {
  const source = '- a\n  ```\n  :: x\n  ```\n  para\n: l\n'
  const html = renderDoc(parse(source)).replace(/\s+/g, ' ')
  assert.match(html, /<pre><code>:: x <\/code><\/pre> para : l <\/li>/)
})

test('a marker line term accepts a separator at its source column', () => {
  assert.match(renderDoc(parse('- :: t\n: d\n')), /<dd>d<\/dd>/)
})

test('a separator below a deeper list ends that list after its body paragraph', () => {
  const source = '- a\n   :: m\n   : d\n   more\n: l\n'
  const html = renderDoc(parse(source)).replace(/\s+/g, ' ')
  assert.match(html, /<dd>d more<\/dd>/)
  assert.match(html, /<\/ul> <p>: l<\/p>$/)
})

for (const depth of [1, 2, 3]) {
  test(`separator at a nested item marker column ends that item at depth ${depth}`, () => {
    const prefix = '- '.repeat(depth)
    const source = `${prefix}a\n${'  '.repeat(depth)}:: m\n${'  '.repeat(depth - 1)}: l\n`
    const html = renderDoc(parse(source))
    assert.match(html, /<dt>m<\/dt>/)
    assert.doesNotMatch(html, /<dt>m\n: l<\/dt>|<dd>/)
  })
}

for (const marker of ['- ', '1. ', '- [ ] ']) {
  test(`a ${marker.trim()} child releases the separator at its marker column`, () => {
    const source = `- ${marker}a\n${' '.repeat(2 + marker.length)}:: m\n  : l\n`
    const html = renderDoc(parse(source))
    assert.match(html, /<dt>m<\/dt>/)
    assert.doesNotMatch(html, /<dt>m\n: l<\/dt>|<dd>/)
  })
}

for (const quoteDepth of [1, 2]) {
  test(`a nested separator releases its item inside ${quoteDepth} quote levels`, () => {
    const quote = '> '.repeat(quoteDepth)
    const source = `${quote}- - a\n${quote}    :: m\n${quote}  : l\n`
    const html = renderDoc(parse(source))
    assert.match(html, /<dt>m<\/dt>/)
    assert.doesNotMatch(html, /<dt>m\n: l<\/dt>|<dd>/)
  })
}

test('a folded separator leaves the item paragraph interruptible', () => {
  const html = renderDoc(parse('- a\n   :: term\n  :  detail\n    :: term\n    :  detail\n      [^n]: note\n       q\n1. ordered\n'))
  assert.match(html, /<dt>term<\/dt>\n\s*<dd>detail<\/dd>/)
  assert.match(html, /<\/dl>\n\s*q\n\s*<\/li>/)
  assert.doesNotMatch(html, /\[\^n\]: note/)
})

test('a document quote ends a description before a later fence closer', () => {
  const html = renderDoc(parse(':: term\n: detail\n  ```\n  code\n> payload\n  ```\nafter\n'))
  assert.doesNotMatch(html, /<pre><code>/)
  assert.match(html, /<\/dl>\n<blockquote>/)
})

test('a document definition ends a description before a later fence closer', () => {
  const html = renderDoc(parse(':: term\n: detail\n  ```\n  code\n[r]: /url\n  ```\nafter\n'))
  assert.doesNotMatch(html, /<pre><code>/)
  assert.match(html, /<\/dl>/)
})
