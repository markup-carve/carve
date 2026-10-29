import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

// A heading id is derived from the heading's plain text (PART 2). Display
// math contributes its content, like inline math, and not its \[ \] markup.
test('display math in a heading adds its content to the id', () => {
  assert.match(html('# a$$`b`\n'), /^<section id="ab">/)
})

test('inline and display math derive the same id', () => {
  assert.match(html('# a$`b`\n\n# a$$`b`\n'), /<section id="ab">[\s\S]*<section id="ab-2">/)
})

test('an implicit reference to such a heading resolves', () => {
  assert.match(html('# a$$`b`\n\nsee [a$$`b`][]\n'), /<a href="#ab">/)
})
