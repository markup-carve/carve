// carve#5016: a first-line opener claims frontmatter through its closer or EOF.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parse, sourceOpensFrontmatter } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const corpus = resolve(here, 'corpus')

test('a lone dash run opens frontmatter', () => {
  // The real corpus document, not a fixture written to match the reader.
  const name = '550-a-dash-run-opens-frontmatter-only-at-the-start-and-only-a-dash-run.crv'
  const source = readFileSync(join(corpus, name), 'utf8')
  assert.match(source, /^---\s*$/, 'the document is no longer a lone dash run; re-read the case')
  assert.equal(sourceOpensFrontmatter(source), true)
})

test('an opener may end at a closer or EOF, in either line ending', () => {
  assert.equal(sourceOpensFrontmatter('---\ntitle: x\n---\n'), true)
  assert.equal(sourceOpensFrontmatter('---\r\ntitle: x\r\n---\r\n'), true)
  assert.equal(sourceOpensFrontmatter('---\ntitle: x\n'), true)
  assert.equal(sourceOpensFrontmatter('---\ntitle: x'), true)
  assert.equal(renderDoc(parse('---\ntitle: x')), '')
  assert.equal(sourceOpensFrontmatter('---\rtitle: x\r'), true)
  assert.equal(sourceOpensFrontmatter('\ufeff---\rtitle: x\r'), true)
  assert.equal(renderDoc(parse('---\rtitle: x\r')), '')
  assert.equal(renderDoc(parse('\ufeff---\rtitle: x\r')), '')
})

test('the typed opener keeps the slot rules the layout already settled', () => {
  assert.equal(sourceOpensFrontmatter('---yaml\na: 1\n---\n'), true)
  assert.equal(sourceOpensFrontmatter('--- yaml\na: 1\n---\n'), true)
  // carve#901, carve#907, carve#912: a tab, a non-space whitespace character,
  // and a two-space run are each NOT the padding slot before a format token.
  assert.equal(sourceOpensFrontmatter('---\tyaml\na: 1\n---\n'), false)
  assert.equal(sourceOpensFrontmatter('--- yaml\na: 1\n---\n'), false)
  assert.equal(sourceOpensFrontmatter('---  yaml\na: 1\n---\n'), false)
  // carve#1295: a whitespace run with NOTHING after it is trailing whitespace,
  // so the bare opener survives it.
  assert.equal(sourceOpensFrontmatter('---\t\na: 1\n---\n'), true)
})

test('frontmatter opens only at the start', () => {
  assert.equal(sourceOpensFrontmatter('text\n---\na: 1\n---\n'), false)
})

test('every valid first-line corpus opener is claimed without a closer', () => {
  const missed = []
  for (const name of readdirSync(corpus).filter((file) => file.endsWith('.crv'))) {
    const source = readFileSync(join(corpus, name), 'utf8')
    if (!/^---(?:[ \t]*$| ?[A-Za-z0-9]+[ \t]*$)/.test(source.split('\n', 1)[0])) continue
    const closed = source.split('\n').slice(1).some((line) => /^---[ \t]*$/.test(line.replace(/\r$/, '')))
    if (!closed && !sourceOpensFrontmatter(source)) missed.push(name)
  }
  assert.deepEqual(missed, [], `missed unclosed frontmatter:\n  ${missed.join('\n  ')}`)
})
