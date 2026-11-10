import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source)).trim()

const literalList = '<ul>\n  <li>pre\n{% b\nb %}</li>\n</ul>'
const erasedList = '<ul>\n  <li>pre\n</li>\n</ul>'
const literalQuote = '<blockquote><p>pre\n{% b\nb %}</p></blockquote>'
const erasedQuote = '<blockquote><p>pre\n</p></blockquote>'

for (const [name, source, html] of [
  ['list: same source column', '- pre\n {% b\n b %}\n', literalList],
  ['list: one deeper source column', '- pre\n {% b\n  b %}\n', literalList],
  ['quote: same column after its marker', '> pre\n{% b\n> b %}\n', literalQuote],
  ['quote: one deeper column after its marker', '> pre\n{% b\n>  b %}\n', erasedQuote],
]) {
  test(name, () => assert.equal(render(source), html))
}
