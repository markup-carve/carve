import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

for (const [marker, pad] of [['-', '  '], ['*', '  '], ['1.', '   '], ['10.', '    ']]) {
  test(`a quote-prefixed plus attaches inside a ${marker} item`, () => {
    const source = `${marker} > > q\n${pad}> r\n${pad}> +\n${pad}> > b\n`
    const list = marker.endsWith('.') ? 'ol' : 'ul'
    const start = marker === '10.' ? ' start="10"' : ''
    assert.equal(html(source), `<${list}${start}><li><blockquote><blockquote><p>q\nr</p><blockquote><p>b</p></blockquote></blockquote></blockquote></li></${list}>`)
  })
}

for (const depth of [2, 3, 4]) {
  test(`the hosted and unhosted quote runs agree at depth ${depth}`, () => {
    const open = `${'> '.repeat(depth)}q`
    const plus = `${'> '.repeat(depth - 1)}+`
    const follower = `${'> '.repeat(depth)}b`
    const unhosted = html(`${open}\n${'> '.repeat(depth - 1)}r\n${plus}\n${follower}\n`)
    const hosted = html(`- ${open}\n  ${'> '.repeat(depth - 1)}r\n  ${plus}\n  ${follower}\n`)
    assert.equal(hosted, `<ul><li>${unhosted}</li></ul>`)
  })
}

for (const [markers, pad] of [['- -', '    '], ['1. -', '     '], ['- - -', '      ']]) {
  test(`a quote after nested ${markers} markers keeps its depth`, () => {
    const source = `${markers} > > q\n${pad}> r\n${pad}> +\n${pad}> > b\n`
    const sink = {}
    const rendered = renderDoc(parse(source, { stateSink: sink }))
    assert.deepEqual(sink.refusedPlusLines, [])
    assert.match(rendered, /<p>q\nr<\/p>\s*<blockquote><p>b<\/p><\/blockquote>/)
  })
}
