import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source)).trim()

test('a marker-glued attribute keeps a later brace at its written source column (#5788)', () => {
  for (const [marker, bodyColumn] of [['-{.x} ', 2], ['1.{.x} ', 3], ['.{.x} ', 2]]) {
    const opener = marker.length
    for (const column of [opener - 1, opener]) {
      const source = `${marker}{.x\n${' '.repeat(column)}.y}\n${' '.repeat(bodyColumn)}# h\n`
      assert.equal(render(source), render(source.replace('{.x\n', '\\{.x\n')), source)
    }
    const source = `${marker}{.x\n${' '.repeat(opener + 1)}.y}\n${' '.repeat(bodyColumn)}# h\n`
    assert.doesNotMatch(render(source), /\{\.x\n\.y\}/, source)
  }
})

test('a tab inside marker metadata advances the later brace source column', () => {
  const head = '-{title="a\tb"} {.x'
  let column = 0
  let opener = 0
  for (let i = 0; i < head.length; i++) {
    if (i === head.lastIndexOf('{')) opener = column
    column = head[i] === '\t' ? (Math.floor(column / 4) + 1) * 4 : column + 1
  }
  for (const shift of [-1, 0, 1]) {
    const source = `${head}\n${' '.repeat(opener + shift)}.y}\n  # h\n`
    const result = render(source)
    assert.equal(result.includes('{.x\n.y}'), shift <= 0, source)
  }
})
