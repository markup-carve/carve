// carve#4640: an explicit header and footer that overlap on a delimited body make no
// header cells, as on a pipe table; a line range that cuts a quoted record falls back to code.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source, files) => renderDoc(parse(source, files ? { includeFiles: files } : undefined)).trim()
const compact = (html) => html.replace(/\s*\n\s*/g, '')
const fence = '```'

for (const keys of ['header-rows=2 footer-rows=1', 'header-rows=1 footer-rows=2', 'header-rows footer-rows=2', 'header-rows=0 footer-rows=3']) {
  test(`{table ${keys}} on a delimited body matches its pipe twin`, () => {
    const fenced = compact(render(`{table ${keys}}\n${fence}csv\na\nb\n${fence}\n`))
    const pipe = compact(render(`{${keys}}\n| a |\n| b |\n`))
    const included = compact(render(`{table ${keys}}\n{{ d.csv @code:csv }}\n`, { 'd.csv': 'a\nb\n' }))
    assert.equal(included, fenced)
    assert.equal(fenced, '<table><tbody><tr><td>a</td></tr><tr><td>b</td></tr></tbody></table>')
    assert.equal(pipe, fenced)
  })
}

// 13:212-217 keeps a delimited body's own rule for a lone count (CARVE-P12-034).
test('a lone invalid or oversized header count keeps the delimited rule', () => {
  assert.match(compact(render(`{table header-rows=x}\n${fence}csv\na\nb\n${fence}\n`)), /<thead><tr><th scope="col">a<\/th>/)
  assert.match(compact(render(`{table header-rows=5}\n${fence}csv\na\nb\n${fence}\n`)), /<tbody><tr><th scope="row">a<\/th><\/tr><tr><th scope="row">b<\/th>/)
})

test('a valid count still partitions a delimited body', () => {
  assert.equal(compact(render(`{table header-rows=1 footer-rows=1}\n${fence}csv\na\nb\n${fence}\n`)),
    '<table><thead><tr><th scope="col">a</th></tr></thead><tfoot><tr><td>b</td></tr></tfoot></table>')
})

test('a line range that cuts a quoted record falls back to a code block of the selection', () => {
  const html = render('{table}\n{{ r.csv @code:csv @lines:2-2 }}\n', { 'r.csv': 'a,b\n"x\ny",2\nc,d\n' })
  assert.equal(html, '<pre table=""><code class="language-csv">"x\n</code></pre>')
})
