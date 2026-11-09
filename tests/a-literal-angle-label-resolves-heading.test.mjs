import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('literal angle brackets remain in a heading reference key', () => {
  assert.equal(html('# [<>][]\n'),
    '<section id="s">\n  <h1><a href="#s">&lt;&gt;</a></h1>\n</section>')
})

test('tag-shaped literal text remains in the heading reference key', () => {
  assert.match(html('# <x>\n\n[<x>][]\n'), /<a href="#x">&lt;x&gt;<\/a>/)
})
