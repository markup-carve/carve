import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source, files) => renderDoc(parse(source, { includeFiles: files })).trim()

// PART 10 I1d: a header record inside the selected range is not repeated, even
// when header-rows passes the last record (carve#4569).
test('a region under a header-rows past the last record repeats no header record', () => {
  const html = render('{table header-rows=5}\n{{ q.csv @code:csv @region:r }}', { 'q.csv': '#region r\na\nb\n#endregion r\n' })
  assert.equal(html.split('>a<').length - 1, 1, html)
  assert.equal(html.split('>b<').length - 1, 1, html)
  assert.ok(!html.includes('<td>'), html)
})

// The whole file decides malformed quoting, whatever a selection cuts (carve#4570).
for (const option of ['@lines:2-2', '@lines:1-2']) {
  test(`malformed quoting outside ${option} falls back to code`, () => {
    const html = render(`{table}\n{{ m.csv @code:csv ${option} }}`, { 'm.csv': 'h\nb\n"x\n' })
    assert.ok(html.startsWith('<pre'), html)
    assert.ok(!html.includes('<table>'), html)
  })
}

// `quoted_value`: a backslash escapes ASCII punctuation only (carve#4571).
test('a backslash before a letter in a cols name stays a backslash', () => {
  const miss = render('{table}\n{{ z.csv @code:csv @cols:"a\\zb" }}', { 'z.csv': 'azb,c\n1,2\n' })
  assert.ok(!miss.includes('<table>'), miss)
  const hit = render('{table}\n{{ z.csv @code:csv @cols:"a\\zb" }}', { 'z.csv': 'a\\zb,c\n1,2\n' })
  assert.ok(hit.includes('<th scope="col">a\\zb</th>'), hit)
})

test('a backslash before a comma still quotes it', () => {
  const html = render('{table}\n{{ z.csv @code:csv @cols:"a\\,b,c" }}', { 'z.csv': '"a,b",c\n1,2\n' })
  assert.ok(html.includes('<th scope="col">a,b</th><th scope="col">c</th>'), html)
})
