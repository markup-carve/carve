import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('each accepted attribute in a glued inline run hides its backticks', () => {
  assert.equal(html('[a]{title="`"}{k="`"}\n{k=v}\nz\n'),
    '<p><span title="`" k="`">a</span></p>\n<p k="v">z</p>')
})

test('a stray closing bracket leaves a literal attribute run and its paired backticks visible', () => {
  assert.equal(html('[x] and foo]{title="`"}{k="`"}\n{k=v}\nz\n'),
    '<p>[x] and foo]{title=“<code>"}{k="</code>”}</p>\n<p k="v">z</p>')
})

test('unrelated closing punctuation cannot hide a literal attribute payload', () => {
  for (const prefix of ['[x](u) y)', 'a :foo: x:', '<https://a> x>', '[x] {+y+}z}', 'a *b* c*']) {
    const rendered = html(`${prefix}{title="\`"}{k="\`"}\n{k=v}\nz\n`)
    assert.ok(rendered.endsWith('<p k="v">z</p>'), prefix)
  }
})
