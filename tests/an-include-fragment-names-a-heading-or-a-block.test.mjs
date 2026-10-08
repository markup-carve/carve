/*
 * PART 9 §19 I1a: `{{ path #name }}` selects a heading's section first, then a
 * block carrying the explicit id. The include-conformance goldens pin it per
 * engine (i01-section-*); this is the engine-free arbiter,
 * scripts/spec/include-fragment.mjs, and the pinned engine only parses.
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

/*
 * PART 6: how the selector and the option slot are SPELLED. Every directive
 * above writes `{{ path #name }}` - one space, one name, a bare path - and that
 * single spelling is what let three published engines diverge on the other four
 * (carve#2774). The separating whitespace is optional in both slots
 * (carve#2773), so each of these is well formed and means what its spaced
 * spelling means. The arbiter is scripts/spec/include-directive.mjs; no engine
 * is consulted.
 */
const slots = (source) => {
  const d = scanDirective(source, 0)
  return d && { path: d.path, quoted: d.quoted, section: d.section, options: d.options, end: d.end }
}

test('a section name needs no space in front of it', () => {
  assert.deepEqual(slots('{{ plans.crv#section }}'), {
    path: 'plans.crv', quoted: false, section: 'section', options: [], end: 23,
  })
  // The named control: the spaced spelling reads the same slots.
  assert.deepEqual(slots('{{ plans.crv #section }}').section, 'section')
})

test('a quoted path takes an adjacent section name too', () => {
  assert.deepEqual(slots('{{ "plans.crv"#section }}'), {
    path: 'plans.crv', quoted: true, section: 'section', options: [], end: 25,
  })
  assert.equal(slots('{{ "my plans.crv"#section }}').path, 'my plans.crv')
})

test('a tab separates the path from the name, as whitespace does everywhere', () => {
  assert.deepEqual(slots('{{ plans.crv\t#section }}').section, 'section')
  assert.deepEqual(slots('{{\tplans.crv\t#section\t}}').section, 'section')
})

test('an option needs no space in front of it, after a path or after a name', () => {
  assert.deepEqual(slots('{{ plans.crv@shift:1 }}'), {
    path: 'plans.crv', quoted: false, section: null, options: [['shift', '1']], end: 23,
  })
  assert.deepEqual(slots('{{ plans.crv #Alpha@shift:1 }}'), {
    path: 'plans.crv', quoted: false, section: 'Alpha', options: [['shift', '1']], end: 30,
  })
  // Adjacent in both slots at once, and two adjacent options in a row.
  assert.deepEqual(slots('{{ plans.crv#Alpha@shift:2@lines:1-2 }}').options, [
    ['shift', '2'],
    ['lines', '1-2'],
  ])
})

test('an unquoted option value ends at the next marker and takes the rest of unquoted_value', () => {
  assert.deepEqual(slots('{{ plans.crv @shift:+1 }}').options, [['shift', '+1']])
  assert.deepEqual(slots('{{ plans.crv @k:w-1/2 }}').options, [['k', 'w-1/2']])
  assert.deepEqual(slots('{{ plans.crv @shift:1@lines:1-2 }}').options, [
    ['shift', '1'],
    ['lines', '1-2'],
  ])
  // A newline in any spelling is not value text.
  assert.equal(scanDirective('{{ plans.crv @shift:1\r@lines:1-2 }}', 0), null)
  // An `@` inside a value takes the quoted form.
  assert.deepEqual(slots('{{ plans.crv @k:"a@b" }}').options, [['k', 'a@b']])
})

test('a quoted path decodes the quote and the backslash, and keeps every other pair', () => {
  assert.equal(slots('{{ "a\\"b.crv" }}').path, 'a"b.crv')
  assert.equal(slots('{{ "a\\\\b.crv" }}').path, 'a\\b.crv')
  assert.equal(slots('{{ "a\\.crv" }}').path, 'a\\.crv')
  assert.equal(slots('{{ "notes\\new.crv" }}').path, 'notes\\new.crv')
})

test('the padding around the whole directive is still required on both sides', () => {
  assert.equal(scanDirective('{{plans.crv@shift:1 }}', 0), null)
  assert.equal(scanDirective('{{ plans.crv@shift:1}}', 0), null)
  assert.equal(scanDirective('{{plans.crv#section}}', 0), null)
})

test('an adjacent spelling selects the same fragment the spaced one does', () => {
  const child = '{#dough}\n```text\n500 g flour\n```\n\nafter'
  for (const source of [
    '{{ recipes.crv #dough }}',
    '{{ recipes.crv#dough }}',
    '{{ "recipes.crv"#dough }}',
    '{{ recipes.crv\t#dough }}',
    '{{ recipes.crv#dough@shift:1 }}',
  ]) {
    const name = scanDirective(source, 0)?.section
    assert.equal(name, 'dough', source)
    const selected = pick(child, name)
    assert.deepEqual(types(selected), ['code_block'], source)
    assert.equal(selected[0].attrs.id, 'dough', source)
  }
})
