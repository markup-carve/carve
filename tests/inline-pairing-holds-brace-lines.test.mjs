import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

test('paired inline comments hold a later brace line (#5740)', () => {
  assert.equal(html('p {% a\n{lang=de}\nz %} y'), '<p>p  y</p>')
  assert.equal(html('p {% a\n{lang=de}\nz %} y\n{.x}\ntail'),
    '<p>p  y</p>\n<p class="x">tail</p>')
})

test('literal attribute-shaped text leaves its backtick active (#5740)', () => {
  assert.equal(html('a{title="`"}\n{k=v}\nb'), '<p>a{title=“<code>"}\n{k=v}\nb</code></p>')
})

test('paired inline attributes hide backticks in their values (#5740)', () => {
  assert.equal(html('[a]{title="`"}\n{k=v}\nb'),
    '<p><span title="`">a</span></p>\n<p k="v">b</p>')
  assert.equal(html('![a](/i){title="`"}\n{k=v}\nb'),
    '<img src="/i" alt="a" title="`">\n<p k="v">b</p>')
  assert.equal(html('*a*{title="`"}\n{k=v}\nb'),
    '<p><strong title="`">a</strong></p>\n<p k="v">b</p>')
  assert.equal(html('{*a*}{title="`"}\n{k=v}\nb'),
    '<p><strong title="`">a</strong></p>\n<p k="v">b</p>')
})

test('a bare delimiter is not an inline attribute host (#5740)', () => {
  for (const prefix of ['a*', 'a/', 'a_', 'a~', 'a=', 'a)', 'a>', 'a}', 'a]']) {
    const output = html(`${prefix}{title="\x60"}\n{k=v}\nb`)
    assert.match(output, /\{k=v\}/, prefix)
    assert.doesNotMatch(output, /<p k="v">/, prefix)
  }
  assert.equal(html('\\[a]{title="`"}\n{k=v}\nb'),
    '<p>[a]{title=“<code>"}\n{k=v}\nb</code></p>')
})

test('an unmatched inline comment opener is literal and holds no brace line (#5740)', () => {
  assert.equal(html('{%%%:fr}\ny\n{.x}\nz'),
    '<p>{%%%:fr}\ny</p>\n<p class="x">z</p>')
})

test('many attached spans on one line leave the next brace at block position (#5740)', () => {
  for (const host of ['[a]', '*a*']) {
    const source = `${(host + '{title="`"} ').repeat(20)}\n{k=v}\nb`
    const output = html(source)
    assert.match(output, /<p k="v">b<\/p>$/, host)
    assert.doesNotMatch(output, /\{k=v\}/, host)
  }
})
