import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseFragment, serialize } from 'parse5'
import { parse, carveToHtml, carveToHtmlWithReport, htmlToAst, htmlToCarve, carveToMarkdown, migrateMarkdown } from '@markup-carve/carve'

const fixtures = JSON.parse(readFileSync(new URL('../resources/roundtrip-export-acceptance-fixtures.json', import.meta.url), 'utf8'))
const inventory = ['explicit-id', 'ref', 'autolink', 'footnote-label', 'inline-footnote', 'raw', 'escaped', 'abbreviations', 'col-widths']
const reservedNames = new Set(['data-marker', 'data-char', ...inventory.flatMap((name) => [`data-carve-${name}`, `data-djot-${name}`])])
const isReserved = (name) => reservedNames.has(name)
const field = (node, path) => path.split('.').reduce((value, key) => value?.[key], node)
function nodes(value) {
  if (!value || typeof value !== 'object') return []
  return [...(typeof value.type === 'string' ? [value] : []), ...Object.values(value).flatMap(nodes)]
}
function assertProjection(tree, expected) {
  const remaining = nodes(tree)
  for (const projection of expected) {
    const index = remaining.findIndex((node) => Object.entries(projection).every(([key, value]) => {
      try { assert.deepEqual(field(node, key), value === null ? undefined : value); return true } catch { return false }
    }))
    assert.notEqual(index, -1, JSON.stringify(projection))
    remaining.splice(index, 1)
  }
}
function assertImportProjection(tree, fixture) {
  try { assertProjection(tree, fixture.expectedNodes); return false } catch (error) {
    if (!fixture.fallbackNodes) throw error
    assertProjection(tree, fixture.fallbackNodes)
    return true
  }
}
function htmlAttributes(html) {
  const out = []
  function visit(node) { out.push(...(node.attrs ?? []).map((attr) => ({ ...attr, element: node.tagName }))); for (const child of node.childNodes ?? []) visit(child); if (node.content) visit(node.content) }
  visit(parseFragment(html))
  return out
}
function deprecatedHtml(html) {
  const fragment = parseFragment(html)
  function visit(node) {
    for (const attr of node.attrs ?? []) {
      if (inventory.some((name) => attr.name === `data-carve-${name}`)) attr.name = attr.name.replace('data-carve-', 'data-djot-')
    }
    for (const child of node.childNodes ?? []) visit(child)
    if (node.content) visit(node.content)
  }
  visit(fragment)
  return serialize(fragment)
}
function assertNoReservedAttrs(tree) {
  for (const node of nodes(tree)) {
    for (const key of Object.keys(node.attrs?.keyValues ?? {})) assert.ok(!isReserved(key), key)
  }
}
const normalizedHtml = (html) => html.trim()

for (const fixture of fixtures.exportImport) {
  test(`shared roundtrip export: ${fixture.id}`, () => {
    assertProjection(parse(fixture.source), fixture.expectedNodes)
    const ordinary = carveToHtml(fixture.source)
    assert.equal(carveToHtml(fixture.source, { roundtrip: false }), ordinary)
    assert.ok(!htmlAttributes(ordinary).some((attr) => isReserved(attr.name)))
    const exported = carveToHtml(fixture.source, { roundtrip: true })
    const attrs = htmlAttributes(exported)
    for (const [name, value] of Object.entries(fixture.carriers)) assert.ok(attrs.some((attr) => attr.name === name && (value === null || attr.value === value)), `${name}=${value}`)
    for (const host of fixture.carrierHosts) assert.ok(attrs.some((attr) => attr.name === host.attribute && attr.element === host.element), JSON.stringify(host))
    for (const [name, value] of Object.entries(fixture.ordinaryAttributes ?? {})) {
      for (const html of [ordinary, exported]) assert.ok(htmlAttributes(html).some((attr) => attr.name === name && attr.value === value))
    }
    for (const name of fixture.forbiddenExportAttributes) assert.ok(!attrs.some((attr) => attr.name === name), name)
    for (const mode of fixture.importModes) {
      const imported = htmlToAst(exported, { mode })
      const legacy = htmlToAst(deprecatedHtml(exported), { mode })
      assertImportProjection(legacy.value, fixture)
      assertNoReservedAttrs(legacy.value)
      const declined = assertImportProjection(imported.value, fixture)
      assertNoReservedAttrs(imported.value)
      for (const absent of fixture.expectedAbsentFields ?? []) assert.ok(nodes(imported.value).filter((node) => node.type === absent.type).every((node) => field(node, absent.field) === undefined))
      const source = htmlToCarve(exported, { mode }).value
      assert.equal(normalizedHtml(carveToHtml(source)), normalizedHtml(declined ? fixture.fallbackHtml : ordinary), mode)
    }
  })
}
for (const fixture of fixtures.importNegative) {
  for (const mode of fixture.importModes) test(`shared carrier rejection: ${fixture.id}/${mode}`, () => {
    const result = htmlToAst(fixture.html, { mode })
    assertProjection(result.value, fixture.expectedNodes)
    if (fixture.requiresDiagnostic) assert.ok(result.report.diagnostics.length > 0, fixture.id)
    assertNoReservedAttrs(result.value)
    for (const fragment of fixture.forbiddenRenderedSubstrings ?? []) assert.ok(!carveToHtml(htmlToCarve(fixture.html, { mode }).value).includes(fragment), fragment)
    for (const type of fixture.forbiddenTypes) assert.ok(!nodes(result.value).some((node) => node.type === type), type)
    for (const absent of fixture.expectedAbsentFields ?? []) assert.ok(nodes(result.value).filter((node) => node.type === absent.type).every((node) => field(node, absent.field) === undefined))
    for (const forbidden of fixture.forbiddenFieldValues ?? []) assert.ok(nodes(result.value).filter((node) => node.type === forbidden.type).every((node) => field(node, forbidden.field) !== forbidden.value))
  })
}
test('export cannot enable a denied destination', () => {
  const result = carveToHtmlWithReport('[x](javascript:one)\n', { roundtrip: true })
  assert.ok(!result.value.includes('javascript:'))
  assert.ok(result.losses.some((row) => row.code === 'destination-denied'))
})
test('shared paired-footnote controls remain a separate complete resource', () => {
  const paired = JSON.parse(readFileSync(new URL(`../resources/${fixtures.footnoteRecoveryResource}`, import.meta.url), 'utf8'))
  for (const fixture of paired) {
    const result = htmlToCarve(fixture.html, { mode: fixture.mode })
    assert.equal(result.value, fixture.expectedSource, fixture.name)
    assertNoReservedAttrs(htmlToAst(fixture.html, { mode: fixture.mode }).value)
  }
})

for (const fixture of fixtures.collisionExport) test(`shared export collision: ${fixture.id}`, () => {
  const result = carveToHtmlWithReport(fixture.source, { roundtrip: true })
  const attrs = htmlAttributes(result.value).filter((attr) => attr.name === fixture.attribute)
  assert.deepEqual(attrs.map((attr) => attr.value), [fixture.value])
  assert.ok(result.losses.some((row) => row.code === 'carrier-attribute-dropped' && row.attribute === fixture.attribute))
})
test('task hooks remain ordinary output without preservation export', () => {
  const fixture = fixtures.exportImport.find((row) => row.id === 'task-states')
  const html = carveToHtml(fixture.source)
  assert.ok(html.includes('task-list'))
  for (const state of ['x', '-', '_', '>', '?']) assert.ok(htmlAttributes(html).some((attr) => attr.name === 'data-task-state' && attr.value === state), state)
})

for (const fixture of fixtures.markdownExportImport) test(`shared Markdown export: ${fixture.id}`, () => {
  assertProjection(parse(fixture.source), fixture.expectedNodes)
  const ordinary = carveToMarkdown(fixture.source)
  assert.equal(carveToMarkdown(fixture.source, { roundtrip: false }), ordinary)
  assert.ok(!ordinary.includes('<!-- carve:'))
  const exported = carveToMarkdown(fixture.source, { roundtrip: true })
  for (const fragment of fixture.carrierFragments) assert.ok(exported.includes(fragment), fragment)
  const imported = migrateMarkdown(exported)
  assertProjection(parse(imported.value), fixture.expectedNodes)
  assert.equal(carveToHtml(imported.value).trim(), carveToHtml(fixture.source).trim())
})

test('shared acceptance cases have distinct identities and explicit assertions', () => {
  const ids = new Set()
  for (const row of [...fixtures.exportImport, ...fixtures.importNegative, ...fixtures.collisionExport, ...fixtures.markdownExportImport]) {
    assert.ok(!ids.has(row.id), row.id)
    ids.add(row.id)
    assert.ok(typeof row.source === 'string' || typeof row.html === 'string', row.id)
    assert.ok(row.expectedNodes?.length || row.attribute, row.id)
  }
})
