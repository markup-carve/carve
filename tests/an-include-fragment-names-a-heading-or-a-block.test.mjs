/*
 * PART 9 §19 I1a: `{{ path #name }}` selects a heading's section first, then a
 * block carrying the explicit id. No engine implements the block step yet, so
 * the include-conformance goldens cannot pin it (see that suite's README). The
 * arbiter is scripts/spec/include-fragment.mjs; the pinned engine only parses.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, resolve as resolveDoc } from '@markup-carve/carve'
import { selectFragment } from '../scripts/spec/include-fragment.mjs'
import { scanDirective } from '../scripts/spec/include-directive.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const types = (blocks) => blocks?.map((b) => b.type) ?? null
// resolve() stamps the auto slugs the heading step matches against.
const pick = (source, name) => selectFragment(resolveDoc(parse(source)), name)

test('the page example selects the code block alone, with its id', () => {
  const page = readFileSync(resolve(repo, 'docs/includes.md'), 'utf8')
  const section = page.slice(page.indexOf('### Selecting by id'), page.indexOf('### Heading-level shift'))
  const child = section.match(/^````carve\n([\s\S]*?)\n````$/m)?.[1]
  assert.ok(child, 'the worked child sample moved; read the section before editing this test')
  const selected = pick(child, 'dough')
  assert.deepEqual(types(selected), ['code_block'])
  assert.equal(selected[0].attrs.id, 'dough')
})

test('a heading keeps selecting its section (the named control)', () => {
  const child = '# A\n\nskip\n\n{#pick}\n# B\n\nyes\n\n## C\n\nmore\n\n# D'
  assert.deepEqual(types(pick(child, 'pick')), ['heading', 'paragraph', 'heading', 'paragraph'])
})

test('a heading wins over an earlier block with the same id', () => {
  const child = '{#x}\nfirst\n\n{#x}\n# H\n\nbody'
  assert.deepEqual(types(pick(child, 'x')), ['heading', 'paragraph'])
})

test('an auto slug is a heading id, and the name matches case exactly (PART 9R R4)', () => {
  const child = '{#hello}\npara\n\n# Hello\n\nbody'
  assert.deepEqual(types(pick(child, 'Hello')), ['heading', 'paragraph'])
  assert.deepEqual(types(pick(child, 'hello')), ['paragraph'])
  assert.equal(pick('# Hello\n\nbody', 'hello'), null)
})

test('the first block in document order wins, and a container precedes its contents', () => {
  const child = '{#x}\n> {#x}\n> inner\n\n{#x}\nlater'
  assert.deepEqual(types(pick(child, 'x')), ['block_quote'])
  assert.equal(pick('{#x}\nonce\n\n{#x}\ntwice', 'x')[0].children[0].value, 'once')
})

test('a block at depth is selectable', () => {
  const child = '- a\n\n  {#z}\n  ```\n  code\n  ```'
  assert.deepEqual(types(pick(child, 'z')), ['code_block'])
})

test('a block inside a captioned quote is reachable', () => {
  assert.deepEqual(types(pick('> {#x}\n> inner\n\n^ Figure: caption', 'x')), ['paragraph'])
})

test('a block image in a block cell is selectable, an inline one is not', () => {
  const cell = (field) => ({
    type: 'document',
    children: [{ type: 'table', rows: [{ type: 'table_row', cells: [{ type: 'table_cell', header: false, children: [], [field]: [{ type: 'image', src: 'a', alt: 'a', attrs: { id: 'im' } }] }] }] }],
  })
  assert.deepEqual(types(selectFragment(cell('blocks'), 'im')), ['image'])
  assert.equal(selectFragment(cell('children'), 'im'), null)
})

test('a heading inside a container stops at the end of that container', () => {
  const child = '> {#q}\n> ## Q\n>\n> in\n\nafter'
  assert.deepEqual(types(pick(child, 'q')), ['heading', 'paragraph'])
})

test('a list item, a table row, an inline span and a footnote select nothing', () => {
  assert.equal(pick('-{#li} item\n- two', 'li'), null)
  assert.equal(pick('| a |{#row}', 'row'), null)
  assert.equal(pick('x [span]{#sp} y', 'sp'), null)
  assert.equal(pick('![a](a){#im}![b](b)', 'im'), null)
  assert.equal(pick('| ![a](a){#im} |', 'im'), null)
  assert.equal(pick('See[^n].\n\n[^n]: {#w}\n    note', 'w'), null)
  assert.equal(pick('{#p}\npara', 'nope'), null)
})

test('a digit-leading explicit id is nameable (include_section takes explicit_identifier)', () => {
  const name = scanDirective('{{ plans.crv #2024-plan }}', 0)?.section
  assert.equal(name, '2024-plan')
  const selected = pick('{#2024-plan}\n```text\nship it\n```\n\nafter', name)
  assert.deepEqual(types(selected), ['code_block'])
  assert.equal(selected[0].attrs.id, '2024-plan')
  // The control: a letter-led name still reads, and a name the id class cannot
  // spell (it opens on `-`) leaves the whole directive literal.
  assert.equal(scanDirective('{{ plans.crv #plan-2024 }}', 0)?.section, 'plan-2024')
  assert.equal(scanDirective('{{ plans.crv #-x }}', 0), null)
})
