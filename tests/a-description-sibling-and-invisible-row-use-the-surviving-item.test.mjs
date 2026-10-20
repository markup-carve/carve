import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (lines, quoted = false) => renderDoc(parse(
  lines.map(line => quoted ? `> ${line}` : line).join('\n') + '\n',
))
const markers = ['- ', '1. ', '* [ ] ']

const itemAtDepth = (marker, depth, tail) => {
  const lines = []
  let column = 0
  for (let level = 0; level < depth; level++) {
    lines.push(' '.repeat(column) + marker + 'level')
    column += marker.length
  }
  return [...lines, ...tail.map(([offset, text]) => ' '.repeat(column + offset) + text)]
}

for (const marker of markers) for (const depth of [1, 2, 3]) for (const quoted of [false, true]) {
  const name = `${JSON.stringify(marker)} at item depth ${depth}, quote ${quoted}`

  test(`a marker in the band below a description opens in the item: ${name}`, () => {
    const source = itemAtDepth(marker, depth, [
      [0, ':: term'], [0, ':  detail'], [2, marker + 'child'],
    ])
    const html = render(source, quoted)
    assert.match(html, /<dd>detail<\/dd>[\s\S]*<\/(?:dl)>[\s\S]*<(?:ul|ol)/)
    assert.doesNotMatch(html, /<dd>[^<]*child/)
  })

  test(`an authored nested description ends before the next item block: ${name}`, () => {
    const source = itemAtDepth(marker, depth, [
      [0, ':: term'], [0, ':  detail'], [2, ':: nested'], [2, ':  body'],
      [4, marker + 'child'],
    ])
    const html = render(source, quoted)
    assert.match(html, /<dd>body<\/dd>[\s\S]*<\/dl>[\s\S]*<(?:ul|ol)/)
    assert.doesNotMatch(html, /<dd>[^<]*child/)
  })

  for (const definition of ['[n]:', '[^n]: note']) {
    test(`a row after ${definition} takes its own base: ${name}`, () => {
      const source = itemAtDepth(marker, depth, [
        [0, definition], [0, ''], [1, '||'],
      ])
      const html = render(source, quoted)
      assert.match(html, /<table>[\s\S]*<td><\/td>[\s\S]*<\/table>/)
    })
  }

  test(`a row in a footnote body stays with the footnote: ${name}`, () => {
    const source = itemAtDepth(marker, depth, [
      [0, '[^n]: note'], [0, ''], [2, '||'],
    ])
    assert.doesNotMatch(render(source, quoted), /<table>/)
  })

  test(`a row one column short of a description footnote opens there: ${name}`, () => {
    const source = itemAtDepth(marker, depth, [
      [0, ':: term'], [0, ': detail'], [4, '[^n]: note'], [0, ''], [5, '||'],
    ])
    assert.match(render(source, quoted), /<dd>[\s\S]*<table>[\s\S]*<\/table>[\s\S]*<\/dd>/)
  })
}

for (const depth of [1, 2, 3]) for (const marker of markers) {
  test(`an unmarked ${JSON.stringify(marker)} folds through ${depth} quote levels`, () => {
    const prefix = '> '.repeat(depth)
    const html = renderDoc(parse(`${prefix}:: term\n${prefix}:  detail\n${marker}tail\n`))
    assert.match(html, /<dd>detail\n[^<]*tail<\/dd>/)
    assert.doesNotMatch(html, /<\/blockquote>\n<(?:ul|ol)/)
  })
}

test('a row at a footnote body column inside a description stays invisible', () => {
  const html = renderDoc(parse(':: term\n: detail\n  [^n]: note\n\n    ||\n'))
  assert.doesNotMatch(html, /<table>/)
})
