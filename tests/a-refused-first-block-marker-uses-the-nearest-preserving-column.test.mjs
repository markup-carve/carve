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
    const expected = `- foo\n  1. +\n${block.map(line => `   ${line}`).join('\n')}\n`
    const attached = `- foo\n  1. +\n${block.map(line => `  ${line}`).join('\n')}\n`

    assert.equal(carveToCarve(source), expected)
    assert.equal(html(expected), html(source))
    assert.notEqual(html(attached), html(source))
  })
}
