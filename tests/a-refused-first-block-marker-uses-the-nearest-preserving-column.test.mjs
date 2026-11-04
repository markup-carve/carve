import test from 'node:test'
import assert from 'node:assert/strict'
import { carveToCarve } from '@markup-carve/carve'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

for (const [name, block] of [
  ['quote', ['> b']],
  ['fence', ['```', 'x', '```']],
]) {
  test(`${name} below a refused nested plus uses the nearest preserving column`, () => {
    const source = `- foo\n  1. +\n${block.map(line => `    ${line}`).join('\n')}\n`
    // carve#5013: the refused `+` is consumed, so the block stays in the enclosing item.
    // The empty item's spelling is carve#5108; only the re-read is pinned here.
    const written = carveToCarve(source)
    const attached = `- foo\n  1. +\n${block.map(line => `  ${line}`).join('\n')}\n`

    assert.equal(html(written), html(source))
    assert.doesNotMatch(html(source), /\+/)
    assert.notEqual(html(attached), html(source))
    assert.doesNotMatch(html(attached), /\+/)
  })
}
