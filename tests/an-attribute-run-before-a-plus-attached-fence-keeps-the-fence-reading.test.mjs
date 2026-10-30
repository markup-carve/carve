import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const fenced = (attrs) => `<ul>\n  <li>a\n    <pre${attrs}><code>  \`\`\`\n</code></pre>\n  </li>\n</ul>`

test('an attribute run before a + attached fence in an item does not end the fence at an indented line', () => {
  assert.equal(renderDoc(parse('- a\n+\n```\n  ```\n')), fenced(''))
  assert.equal(renderDoc(parse('- a\n+\n{x}\n```\n  ```\n')), fenced(' x=""'))
  assert.equal(renderDoc(parse('- a\n+\n{x}\n{y}\n```\n  ```\n')), fenced(' x="" y=""'))
  assert.equal(renderDoc(parse('- a\n+\n{x}\npara\n  more\n')), '<ul>\n  <li>a\n    <p x="">para\nmore</p>\n  </li>\n</ul>')
})

test('an attribute run that is the whole + attachment attaches to nothing', () => {
  assert.equal(renderDoc(parse('- a\n+\n{x\ny}\n')), '<ul>\n  <li>a</li>\n</ul>')
  assert.equal(renderDoc(parse('- a\n+\n{x\ny}\n- b\n')), '<ul>\n  <li>a</li>\n  <li>b</li>\n</ul>')
})
