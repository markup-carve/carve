import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { findCloser, scanDirective } from '../scripts/spec/include-directive.mjs'

const html = (source, includeFiles) => renderDoc(parse(source, { includeFiles }))

test('a quote opens a closer run only in a quoted slot', () => {
  assert.equal(findCloser("{{ it's }} it's }}", 2), 8)
  assert.equal(findCloser('{{ "a }} b" }} c', 2), 12)
  assert.equal(findCloser('{{ a @k:"b }} c" }} d', 2), 17)
  assert.equal(findCloser("{{ a @k:'b }} c' }} d", 2), 17)
})

test('an empty quoted path is no directive', () => {
  assert.equal(scanDirective('{{ "" @code }}', 0), null)
  assert.equal(html('{{ "" @code }}\n', { '': 'E\n' }), html('{{ "" @code }}\n'))
})

test('an include option value keeps a backslash before a non-punctuation character', () => {
  assert.deepEqual(scanDirective('{{ f @region:"r\\zb" }}', 0).options, [['region', 'r\\zb']])
  assert.deepEqual(scanDirective('{{ f @region:"r\\-b" }}', 0).options, [['region', 'r-b']])
  const files = { f: '%% #region rzb\nb\n%% #endregion\n' }
  assert.equal(html('{{ f @code @region:"r\\zb" }}\n', files), '<p>{{ f @code @region:"r\\zb" }}</p>')
  assert.equal(html('{{ f @code @region:"rzb" }}\n', files), '<pre><code>b\n</code></pre>')
})

test('a malformed code language is literal with a resolver', () => {
  const files = { 'a.txt': 'x\n' }
  assert.equal(html('{{ a.txt @code:a,b }}\n', files), '<p>{{ a.txt @code:a,b }}</p>')
  assert.equal(html('> {{ a.txt @code:a,b }}\n', files), '<blockquote><p>{{ a.txt @code:a,b }}</p></blockquote>')
  assert.equal(html('{{ a.txt @code:"" }}\n', files), '<p>{{ a.txt @code:"" }}</p>')
  assert.equal(html('{{ a.txt @code:c++ }}\n', files), '<pre><code class="language-c++">x\n</code></pre>')
})

test('a table region include does not repeat a header record it covers', () => {
  const files = { 'u.csv': '%% #region r\nh\ni\n%% #endregion r\nz\n', 'v.csv': 'h\n%% #region r\ni\n%% #endregion r\n' }
  assert.equal(html('{table header-rows=2}\n{{ u.csv @code:csv @region:r }}\n', files),
    '<table>\n  <thead>\n    <tr><th scope="col">h</th></tr>\n    <tr><th scope="col">i</th></tr>\n  </thead>\n</table>')
  assert.equal(html('{table}\n{{ v.csv @code:csv @region:r }}\n', files),
    '<table>\n  <thead>\n    <tr><th scope="col">h</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>i</td></tr>\n  </tbody>\n</table>')
})

test('an author span key stays where nothing computes that span', () => {
  assert.match(html('|={rowspan=3 colspan=3} a | < |\n'), /<th scope="col" colspan="2" rowspan="3">a<\/th>/)
})

test('a region marker line in a table include is no record (carve#4515)', () => {
  const file = '%% #region r\na,b\n1,2\n%% #endregion r\n3,4\n'
  const table = (attrs, options, files = { 'd.csv': file }) => html(`{table${attrs}}\n{{ d.csv @code:csv ${options}}}\n`, files)
  assert.equal(table('', ''),
    '<table>\n  <thead>\n    <tr><th scope="col">a</th><th scope="col">b</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>1</td><td>2</td></tr>\n    <tr><td>3</td><td>4</td></tr>\n  </tbody>\n</table>')
  assert.doesNotMatch(table(' header-rows=0', ''), /region/)
  assert.doesNotMatch(table('', '@region:r '), /region/)
  assert.match(table('', '@rows:2-2 '), /<td>1<\/td><td>2<\/td>/)
  assert.doesNotMatch(table('', '@region:o ', { 'd.csv': 'a\n%% #region o\n1\n%% #region i\n2\n%% #endregion i\n%% #endregion o\n' }), /region/)
  assert.match(table('', '', { 'd.csv': '#region-x\n1\n' }), /<th scope="col">#region-x<\/th>/)
  assert.match(table('', '', { 'd.csv': '#region\n1\n' }), /<th scope="col">#region<\/th>/)
  assert.match(table('', '', { 'd.csv': '"x\n%% #region r\ny"\n1\n' }), /%% #region r/)
  assert.match(table('', '', { 'd.csv': '%%% #region r\n1\n' }), /<th scope="col">%%% #region r<\/th>/)
})
