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
