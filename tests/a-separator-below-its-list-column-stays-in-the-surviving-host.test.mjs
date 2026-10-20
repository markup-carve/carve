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

test('one column inside the item keeps the separator as paragraph text', () => {
  const html = renderDoc(parse('- a\n  :: m\n : l\n'))
  assert.match(html, /<\/dl>\s*: l/)
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
