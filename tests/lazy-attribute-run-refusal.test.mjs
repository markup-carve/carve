import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

test('an attribute run closed on a lazy item line stays literal', () => {
  assert.equal(html('- pre\n  {.a\n#b}\n'), '<ul>\n  <li>pre\n{.a\n#b}</li>\n</ul>')
  assert.equal(html('- {.a\n#b}\n'), '<ul>\n  <li>{.a\n#b}</li>\n</ul>')
  assert.equal(html('> - {.a\n#b}\n'), '<blockquote>\n  <ul>\n    <li>{.a\n#b}</li>\n  </ul>\n</blockquote>')
})

test('an indented attribute continuation still attaches', () => {
  assert.equal(html('- pre\n  {.a\n   #b}\n'), '<ul>\n  <li>pre</li>\n</ul>')
})

test('comment runs retain source-column comparison across lazy ownership', () => {
  assert.equal(html('- a\n{% c\n  %}\n'), '<ul>\n  <li>a\n</li>\n</ul>')
  assert.equal(html('- a\n  {% c\n %}\n'), '<ul>\n  <li>a\n{% c\n%}</li>\n</ul>')
})
