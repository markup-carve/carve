/*
 * CARVE-P11-016's "THE PARSER KEEPS THAT CONTENT" (carve#2403, carve#2420),
 * asserted against the executable spec. The clause names a list item by
 * example and the oracle dropped the residue there, in a footnote body and in
 * a definition description, while keeping it at top level and in a block
 * quote. The clause is read out of the aggregate beside the behavior, so
 * removing it takes this file with it.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')

const codeOf = (source) => {
  const html = renderDoc(parse(source))
  const match = html.match(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/)
  assert.ok(match, `no code block came back from ${JSON.stringify(source)}`)
  return match[1]
}

/* Each container spells the same document: a fence holding `a`, a
 * whitespace-only line, then `b`. WIDE is two columns past the content column;
 * NARROW sits at it. */
const CONTAINERS = [
  ['top level', '```\na\n__\nb\n```\n', 0],
  ['block quote', '> ```\n> a\n> __\n> b\n> ```\n', 0],
  ['list item', '- item\n\n  ```\n  a\n  __\n  b\n  ```\n', 2],
  ['footnote body', 'x[^1]\n\n[^1]: note\n\n    ```\n    a\n    __\n    b\n    ```\n', 4],
  ['definition description', ':: t\n:  d\n\n   ```\n   a\n   __\n   b\n   ```\n', 3],
]

const spell = (template, width) => template.replace('__', ' '.repeat(width))

/* The clause wraps mid-sentence in the aggregate, so each phrase is matched
 * against the text with its line breaks collapsed. */
const flat = grammar.replace(/\s+/g, ' ')

test('the clause says the residue past the content column is content', () => {
  assert.match(flat, /THE PARSER KEEPS THAT CONTENT/)
  assert.match(flat, /a code-block line of four spaces is a code line of two spaces/)
  assert.match(flat, /A line no wider than the content column is an empty code line/)
})

test('every container keeps the two columns past its content column', () => {
  for (const [name, template] of CONTAINERS) {
    assert.equal(codeOf(spell(template, 2)), 'a\n  \nb\n', name)
  }
})

test('a line no wider than the content column is an empty code line', () => {
  for (const [name, template] of CONTAINERS) {
    assert.equal(codeOf(spell(template, 0)), 'a\n\nb\n', name)
  }
})

/* A tab reaches its stop before the strip measures it, so the residue is
 * counted in columns rather than in characters. */
test('a tab is measured as the columns it reaches', () => {
  assert.equal(codeOf('- item\n\n  ```\n  a\n\t\n  b\n  ```\n'), 'a\n  \nb\n')
})

/* The residue only exists inside a fence. Outside one a whitespace-only line
 * is still a blank, so it still counts toward §11 N1a's three-blank boundary
 * and still ends a paragraph. */
test('outside a fence a whitespace-only line is still a blank', () => {
  const html = renderDoc(parse('- a\n\n \n\n- b\n'))
  assert.equal((html.match(/<ul/g) ?? []).length, 2)
  assert.doesNotMatch(html, /<p> <\/p>/)
  assert.match(renderDoc(parse('a\n  \nb\n')), /<p>a<\/p>\s*<p>b<\/p>/)
})
