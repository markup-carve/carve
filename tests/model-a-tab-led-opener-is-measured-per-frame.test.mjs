import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a tab-led opener reaches its owner at the column its space spelling does (carve#4085)', () => {
  const host = ':: t\n: a\n  :: t\n  : a\n'
  const spaced = renderDoc(parse(`${host}    > b\n`))
  for (const indent of ['  \t', ' \t', '\t', '      ']) {
    assert.equal(renderDoc(parse(`${host}${indent}> b\n`)), spaced, JSON.stringify(indent))
  }
  for (const [opener, tag] of [['# h', '<h1'], ['---', '<hr'], ['|= a |', '<table']]) {
    assert.ok(renderDoc(parse(`${host}  \t${opener}\n`)).includes(tag), opener)
  }
})
