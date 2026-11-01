import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\n\s*/g, '')

test('a structural value wins and the authored copy is omitted (carve#4457)', () => {
  assert.equal(html('{type=x}\na.  alpha\n'), '<ol type="a"><li>alpha</li></ol>')
  assert.equal(html('{START=9}\n3. x\n'), '<ol start="3"><li>x</li></ol>')
  assert.equal(html('{data-delim=x}\n3) x\n'), '<ol start="3" data-delim=")"><li>x</li></ol>')
  assert.equal(html('![a](/u.png){ALT=z SRC=/v}\n'), '<img src="/u.png" alt="a">')
  assert.equal(html('[a](/u "T"){title=t}\n'), '<p><a href="/u" title="T">a</a></p>')
  assert.equal(html('[a][r]{title=t}\n\n[r]: /u "T"\n'), '<p><a href="/u" title="T">a</a></p>')
  assert.match(html('[^1]{HREF=v role=w}\n\n[^1]: n\n'), /<a id="fnref1" href="#fn1" role="doc-noteref"><sup>/)
})

test('an attribute the element does not derive stays authored', () => {
  assert.equal(html('[a](/u){title=t}\n'), '<p><a href="/u" title="t">a</a></p>')
  assert.equal(html('{start=9}\n1. x\n'), '<ol start="9"><li>x</li></ol>')
})

test('names merge ASCII case-insensitively at the first spelling with the last value', () => {
  assert.equal(html('{K=1 k=2}\npara\n'), '<p K="2">para</p>')
  assert.equal(html('{k=1}\n{K=2}\npara\n'), '<p k="2">para</p>')
  assert.equal(html('[x]{abbr="a" TITLE="d"}\n'), '<p><abbr title="d">x</abbr></p>')
  assert.equal(html('{CLASS=z}\n::: |\nv\n:::\n'), '<div CLASS="z line-block"><p>v</p></div>')
  assert.equal(html('[x]{.a CLASS=b ID=c #d}\n'), '<p><span class="a b" ID="d">x</span></p>')
  assert.equal(html('{ID=q}\n# h\n'), '<section id="q"><h1>h</h1></section>')
  assert.match(html('[^1]{ID=x}\n\n[^1]: n\n'), /<a id="x" href="#fn1" role="doc-noteref"><sup>/)
})

test('a cell merges its alignment into an authored style', () => {
  assert.match(html('|>{style="color:red"} a |\n'), /<td style="color:red; text-align: right;">a<\/td>/)
  assert.match(html('|>{STYLE="color:red;"} a |\n'), /<td STYLE="color:red; text-align: right;">a<\/td>/)
  assert.match(html('|>{style=""} a |\n'), /<td style="text-align: right;">a<\/td>/)
})

test('a caption reference reaches an authored ID in any spelling', () => {
  assert.match(html('{ID=q}\n| a |\n^ # cap\n\nsee </#q>\n'), /<a href="#q">1<\/a>/)
})
