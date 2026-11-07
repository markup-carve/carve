import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source)).trim()

test('an outer colon closer ends its frame after an attached inner div', () => {
  const source = '::::: outer\n- +\n::: x\n\n  a\n  :::\n:::::\n'
  assert.equal(render(source), `<div class="outer">
  <ul>
    <li>
      <div class="x">
        <p>a</p>
      </div>
    </li>
  </ul>
</div>`)
})

test('nested attached closers are read at the host column for different frame widths', () => {
  for (const outerWidth of [4, 5, 6, 7]) {
    for (const innerWidth of [3, 4, 5]) {
      if (outerWidth === innerWidth) continue
      const outer = ':'.repeat(outerWidth)
      const inner = ':'.repeat(innerWidth)
      const source = `${outer} outer\n- +\n${inner} x\n\n  a\n  ${inner}\n${outer}\n`
      const html = render(source)
      assert.equal((html.match(/<div/g) ?? []).length, 2, source)
      assert.equal((html.match(/<\/div>/g) ?? []).length, 2, source)
      assert.match(html, /<div class="x">\s*<p>a<\/p>\s*<\/div>/, source)
      assert.ok(html.endsWith('</ul>\n</div>'), source)
    }
  }
})

test('an indented run in an ordinary list item opens its own child frame', () => {
  const source = ':::: outer\n::: inner\n- item\n  :::\n  text\n  :::\n:::\n::::\n'
  const html = render(source)
  assert.match(html, /<li>item\s*<div>\s*<p>text<\/p>\s*<\/div>\s*<\/li>/)
  assert.equal((html.match(/<div/g) ?? []).length, 3)
  assert.equal((html.match(/<\/div>/g) ?? []).length, 3)
})

test('a description host also releases an attached inner frame before the outer closer', () => {
  const source = '::::: outer\n:: t\n: +\n::: x\n\n  a\n  ::: \n:::::\n'
  const html = render(source)
  assert.match(html, /<dd>\s*<div class="x">\s*<p>a<\/p>\s*<\/div>\s*<\/dd>/)
  assert.equal((html.match(/<div/g) ?? []).length, 2)
  assert.ok(html.endsWith('</dl>\n</div>'))
})

test('an attached frame does not take the closer of a deeper child list', () => {
  const source = '::::: outer\n- +\n::: x\n\n  - item\n    ::: child\n    body\n    :::\n  :::\n:::::\nafter\n'
  const html = render(source)
  assert.match(html, /<div class="child">\s*<p>body<\/p>\s*<\/div>/)
  assert.ok(html.endsWith('</div>\n<p>after</p>'))
  assert.equal((html.match(/<div/g) ?? []).length, 3)
})

test('a description-shaped paragraph grants no attachment column without a term', () => {
  const source = ':::: outer\n: +\n::: inner\n- item\n  :::\n:::\n::::\nafter\n'
  const html = render(source)
  assert.match(html, /<p>: \+<\/p>/)
  assert.ok(html.endsWith('</div>\n<p>after</p>'))
})

test('a marker folded into a paragraph grants no attachment column', () => {
  for (const prefix of ['p\n', 'p\n- x\n', 'p\n- x\n- y\n', 'p\n  q\n']) {
    const source = `:::: outer\n${prefix}- +\n::: inner\n- item\n  :::\n:::\n::::\nafter\n`
    const html = render(source)
    assert.match(html, /- \+<\/p>/, source)
    assert.ok(html.endsWith('</div>\n<p>after</p>'), source)
  }
})

test('an accepted marker after another host keeps its own attached frame open', () => {
  for (const prefix of ['- a\np\n', ':: t\n: a\n']) {
    const source = `:::: outer\n${prefix}- +\n::: inner\n- item\n  :::\n:::\n::::\nafter\n`
    assert.ok(render(source).endsWith('</div>\n<p>after</p>'), source)
  }
})
