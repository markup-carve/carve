import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n\s*/g, '')
for (const depth of [1, 2]) for (const row of ['+ u |', '| u |']) for (const marked of [false, true]) {
  test(`a table ends a quoted item's paragraph: depth ${depth}, ${row}, marked tail ${marked}`, () => {
    const prefix = '> '.repeat(depth)
    const source = `${prefix}- a\n${prefix}  | t |\n${prefix}  ${row}\n${marked ? prefix : ''}tail\n`
    const table = row.startsWith('+') ? '<tr><td>t u</td></tr>' : '<tr><td>t</td></tr><tr><td>u</td></tr>'
    const body = `<ul><li>a<table><tbody>${table}</tbody></table></li></ul>`
    assert.equal(html(source), '<blockquote>'.repeat(depth) + body + (marked ? '<p>tail</p>' : '') + '</blockquote>'.repeat(depth) + (marked ? '' : '<p>tail</p>'))
  })
}
