import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('an interior code payload blank does not end the attached quote', () => {
  const attached = '> +\n```\na\n\nb\n```\n\n  > r\n'
  const prefixed = '> ```\n> a\n>\n> b\n> ```\n\n  > r\n'
  assert.equal(html(attached), html(prefixed))
  assert.match(html(attached), /<\/blockquote>\n<blockquote><p>r<\/p><\/blockquote>$/)
})

test('an interior colon payload blank does not end the attached quote', () => {
  const attached = '> +\n::: note\na\n\nb\n:::\n\n  > r\n'
  const prefixed = '> ::: note\n> a\n>\n> b\n> :::\n\n  > r\n'
  assert.equal(html(attached), html(prefixed))
  assert.match(html(attached), /<\/blockquote>\n<blockquote><p>r<\/p><\/blockquote>$/)
})
