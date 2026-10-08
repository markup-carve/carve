import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const cases = JSON.parse(readFileSync(new URL('./fixtures/image-alt-escapes.json', import.meta.url), 'utf8'))
for (const c of cases) {
  test(c.name, () => {
    assert.equal(renderDoc(parse(c.source)).trim().replaceAll('&apos;', '&#039;').replaceAll('&#39;', '&#039;'), c.html)
    const image = c.html.replace(/^<p>x | y<\/p>$/g, '')
    assert.ok(renderDoc(parse(c.table)).replaceAll('&apos;', '&#039;').replaceAll('&#39;', '&#039;').includes(image))
  })
}
test('a table image decodes its pipe escape', () => {
  assert.match(renderDoc(parse('| ![a\\|b](/i) |\n|---|\n| c |\n')), /<img src="\/i" alt="a\|b">/)
})
test('unresolved references keep their source', () => {
  assert.match(renderDoc(parse('x ![a\\|b][missing] y')), /!\[a\\\|b\]\[missing\]/)
})
