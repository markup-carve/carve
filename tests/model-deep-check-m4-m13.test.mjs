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
    '<table>\n  <thead>\n    <tr><th scope="col">%% #region r</th></tr>\n    <tr><th scope="col">h</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>i</td></tr>\n  </tbody>\n</table>')
  assert.equal(html('{table}\n{{ v.csv @code:csv @region:r }}\n', files),
    '<table>\n  <thead>\n    <tr><th scope="col">h</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>i</td></tr>\n  </tbody>\n</table>')
})

test('an author span key stays where nothing computes that span', () => {
  assert.match(html('|={rowspan=3 colspan=3} a | < |\n'), /<th scope="col" colspan="2" rowspan="3">a<\/th>/)
})
