import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a paragraph in a hardbreaks div keeps its block attributes', () => {
  assert.equal(html('::: \\\n{e}\nl\nm\n'), '<div class="hardbreaks">\n  <p e="">l<br>\nm</p>\n</div>')
})

test('a block image in a hardbreaks div is promoted and keeps its attributes', () => {
  assert.equal(html('::: \\\n{e}\n![a](u)\n'), '<div class="hardbreaks">\n  <img src="u" alt="a" e="">\n</div>')
})
