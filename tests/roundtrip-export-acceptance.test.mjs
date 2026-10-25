import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseFragment, serialize } from 'parse5'
import { parse, carveToHtml, carveToHtmlWithReport, htmlToAst, htmlToCarve, carveToMarkdown, carveToMarkdownWithReport, migrateMarkdown, toAstJson } from '@markup-carve/carve'

const fixtures = JSON.parse(readFileSync(new URL('../resources/roundtrip-export-acceptance-fixtures.json', import.meta.url), 'utf8'))
const inventory = ['explicit-id', 'generated-id', 'ref', 'autolink', 'footnote-label', 'inline-footnote', 'raw', 'escaped', 'abbreviations', 'col-widths', 'label', 'id-slot', 'tight', 'xref', 'caption-number', 'div', 'line-block', 'substitution']
// Reserved without an inventory row: no core writer emits it, every importer consumes it.
const retiredNames = ['data-carve-src', 'data-djot-src']
const reservedNames = new Set(['data-marker', 'data-char', ...retiredNames, ...inventory.flatMap((name) => [`data-carve-${name}`, `data-djot-${name}`])])
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
function projectionMatches(tree, expected) {
  try { assertProjection(tree, expected); return true } catch { return false }
}
function expectedNodes(_tree, fixture) {
  return fixture.expectedNodes
}
function fieldRules(_tree, fixture, name) {
  return fixture[name] ?? []
}
function assertImportProjection(tree, fixture) {
  try { assertProjection(tree, expectedNodes(tree, fixture)); return false } catch (error) {
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
function carrierElements(html, name) {
  const found = []
  function visit(node) {
    if ((node.attrs ?? []).some((attr) => attr.name === name)) found.push(node)
    for (const child of node.childNodes ?? []) visit(child)
    if (node.content) visit(node.content)
  }
  visit(parseFragment(html))
  return found
}
function carrierText(node) {
  return (node.content?.childNodes ?? node.childNodes ?? []).map((child) => {
    assert.equal(child.nodeName, '#text', 'carrier payload must contain only escaped text')
    return child.value
  }).join('')
}
const normalizedHtml = (html) => html.trim()
let collecting = null
const check = new Proxy(assert, {
  get(target, key) {
    const method = target[key]
    if (typeof method !== 'function') return method
    return (...args) => {
      try { return method(...args) } catch (error) {
        if (!collecting || !(error instanceof assert.AssertionError)) throw error
        collecting.push(args.at(-1))
      }
    }
  },
})
const aheadOfPin = (fixture, body) => () => {
  if (!Object.hasOwn(fixture, 'aheadOfPin')) return body()
  assert.ok(fixture.aheadOfPin && typeof fixture.aheadOfPin === 'object' && !Array.isArray(fixture.aheadOfPin) &&
    Array.isArray(fixture.aheadOfPin.fails) && fixture.aheadOfPin.fails.length > 0 &&
    fixture.aheadOfPin.fails.every((label) => typeof label === 'string' && label.length > 0),
  `${fixture.id}: aheadOfPin must name failed assertions`)
  const failures = []
  collecting = failures
  try { body() } catch (error) { failures.push(`error: ${error.message}`) } finally { collecting = null }
  assert.ok(failures.length, `${fixture.id} is declared aheadOfPin but the pinned engine passes it: drop the flag`)
  for (const label of failures) assert.ok(fixture.aheadOfPin.fails.includes(label), `${fixture.id}: undeclared failure under aheadOfPin: ${label}`)
  for (const label of fixture.aheadOfPin.fails) assert.ok(failures.includes(label), `${fixture.id}: '${label}' passes on the pinned engine now; drop it from aheadOfPin.fails`)
}

for (const fixture of fixtures.exportImport) {
  test(`shared roundtrip export: ${fixture.id}`, aheadOfPin(fixture, () => {
    const parsed = toAstJson(parse(fixture.source))
    assertProjection(parsed, expectedNodes(parsed, fixture))
    const ordinary = carveToHtml(fixture.source)
    check.equal(carveToHtml(fixture.source, { roundtrip: false }), ordinary, 'ordinary html ignores roundtrip: false')
    check.ok(!htmlAttributes(ordinary).some((attr) => isReserved(attr.name)), 'ordinary html has no reserved attributes')
    const exported = carveToHtml(fixture.source, { roundtrip: true })
    // A document-final line break is engine convention, as in the corpus comparisons.
    if (fixture.exportedHtml !== undefined) check.equal(exported.replace(/\n+$/, ''), fixture.exportedHtml.replace(/\n+$/, ''), 'exported html matches fixture')
    const attrs = htmlAttributes(exported)
    for (const [name, expected] of Object.entries(fixture.carrierText ?? {})) {
      const hosts = carrierElements(exported, name)
      check.equal(hosts.length, 1, name)
      const allowed = Array.isArray(expected) ? expected : [expected]
      check.ok(allowed.includes(carrierText(hosts[0])), name)
    }
    check.ok(!attrs.some((attr) => isReserved(attr.name) && attr.name.startsWith('data-djot-')), 'export has no deprecated carriers')
    check.ok(attrs.filter((attr) => isReserved(attr.name)).every((attr) => Object.hasOwn(fixture.carriers, attr.name)), 'export has only declared carriers')
    for (const [name, value] of Object.entries(fixture.carriers)) check.ok(attrs.some((attr) => attr.name === name && (value === null || attr.value === value)), `${name}=${value}`)
    for (const host of fixture.carrierHosts) check.ok(attrs.some((attr) => attr.name === host.attribute && attr.element === host.element), JSON.stringify(host))
    for (const [name, value] of Object.entries(fixture.ordinaryAttributes ?? {})) {
      for (const html of [ordinary, exported]) check.ok(htmlAttributes(html).some((attr) => attr.name === name && attr.value === value), `${name}=${value} in ${html === ordinary ? 'ordinary' : 'exported'} html`)
    }
    for (const name of fixture.forbiddenExportAttributes) check.ok(!attrs.some((attr) => attr.name === name), name)
    for (const roundtrip of [false, true]) {
      const codes = carveToHtmlWithReport(fixture.source, { roundtrip }).losses.map((row) => row.code)
      for (const code of fixture.lossCodes ?? []) check.ok(codes.includes(code), `${code} with roundtrip ${roundtrip}`)
    }
    for (const mode of fixture.importModes) {
      const imported = htmlToAst(exported, { mode })
      const legacy = htmlToAst(deprecatedHtml(exported), { mode })
      const importedTree = toAstJson(imported.value)
      const legacyTree = toAstJson(legacy.value)
      assertImportProjection(legacyTree, fixture)
      assertNoReservedAttrs(legacyTree)
      const declined = assertImportProjection(importedTree, fixture)
      assertNoReservedAttrs(importedTree)
      for (const absent of fieldRules(importedTree, fixture, 'expectedAbsentFields')) check.ok(nodes(importedTree).filter((node) => node.type === absent.type).every((node) => field(node, absent.field) === undefined), `${absent.type}.${absent.field} absent in ${mode}`)
      const source = htmlToCarve(exported, { mode }).value
      for (const fragment of fixture.returnedSourceFragments ?? []) check.ok(source.includes(fragment), fragment)
      check.equal(normalizedHtml(carveToHtml(source)), normalizedHtml(declined ? fixture.fallbackHtml : ordinary), mode)
    }
  }))
}
for (const fixture of fixtures.importNegative) {
  for (const mode of fixture.importModes) test(`shared carrier rejection: ${fixture.id}/${mode}`, aheadOfPin(fixture, () => {
    const result = htmlToAst(fixture.html, { mode })
    const tree = toAstJson(result.value)
    assertProjection(tree, expectedNodes(tree, fixture))
    if (fixture.requiresDiagnostic) {
      const controlCount = fixture.diagnosticControlHtml ? htmlToAst(fixture.diagnosticControlHtml, { mode }).report.diagnostics.length : 0
      check.ok(result.report.diagnostics.length > controlCount, fixture.id)
    }
    if (fixture.expectedDiagnostic) check.ok(result.report.diagnostics.some((row) => Object.entries(fixture.expectedDiagnostic).every(([key, value]) => row[key] === value)), JSON.stringify(fixture.expectedDiagnostic))
    assertNoReservedAttrs(tree)
    for (const fragment of fixture.forbiddenSourceSubstrings ?? []) check.ok(!htmlToCarve(fixture.html, { mode }).value.includes(fragment), fragment)
    for (const fragment of fixture.forbiddenAstSubstrings ?? []) check.ok(!JSON.stringify(tree).includes(fragment), fragment)
    for (const fragment of fixture.forbiddenRenderedSubstrings ?? []) check.ok(!carveToHtml(htmlToCarve(fixture.html, { mode }).value).includes(fragment), fragment)
    for (const type of fixture.forbiddenTypes) check.ok(!nodes(tree).some((node) => node.type === type), type)
    for (const absent of fieldRules(tree, fixture, 'expectedAbsentFields')) check.ok(nodes(tree).filter((node) => node.type === absent.type).every((node) => field(node, absent.field) === undefined), `${absent.type}.${absent.field} absent in ${mode}`)
    for (const forbidden of fieldRules(tree, fixture, 'forbiddenFieldValues')) check.ok(nodes(tree).filter((node) => node.type === forbidden.type).every((node) => field(node, forbidden.field) !== forbidden.value), `${forbidden.type}.${forbidden.field} excludes ${JSON.stringify(forbidden.value)} in ${mode}`)
  }))
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

for (const fixture of fixtures.collisionExport) test(`shared export collision: ${fixture.id}`, aheadOfPin(fixture, () => {
  const named = (html) => htmlAttributes(html).filter((attr) => attr.name === fixture.attribute).map((attr) => attr.value)
  const result = carveToHtmlWithReport(fixture.source, { roundtrip: true })
  check.deepEqual(named(result.value), fixture.value === null ? [] : [fixture.value], 'exported collision attribute matches fixture')
  if (fixture.kept) return check.ok(!result.losses.some((row) => row.code === 'carrier-attribute-dropped'), 'kept attribute has no drop loss')
  check.ok(result.losses.some((row) => row.code === 'carrier-attribute-dropped' && row.attribute === fixture.attribute), 'dropped attribute has loss')
  if (fixture.defaultValue === undefined) return
  const ordinary = carveToHtmlWithReport(fixture.source)
  check.deepEqual(named(ordinary.value), [fixture.defaultValue], 'ordinary collision attribute keeps default')
  check.ok(!ordinary.losses.some((row) => row.code === 'carrier-attribute-dropped'), 'ordinary collision has no drop loss')
}))
test('task hooks remain ordinary output without preservation export', () => {
  const fixture = fixtures.exportImport.find((row) => row.id === 'task-states')
  const html = carveToHtml(fixture.source)
  assert.ok(html.includes('task-list'))
  for (const state of ['x', '-', '_', '>', '?']) assert.ok(htmlAttributes(html).some((attr) => attr.name === 'data-task-state' && attr.value === state), state)
})

// A row that declares a loss says its return is degraded, so its HTML cannot
// equal the source's; every other row must come back rendering the same.
function assertMarkdownReturn(fixture, returned, checkDebt = true) {
  const parsed = toAstJson(parse(returned))
  assertProjection(parsed, expectedNodes(parsed, fixture, checkDebt))
  if ((fixture.lossCodes ?? []).length) return
  assert.equal(carveToHtml(returned).trim(), carveToHtml(fixture.source).trim())
}
for (const fixture of fixtures.markdownExportImport) test(`shared Markdown export: ${fixture.id}`, aheadOfPin(fixture, () => {
  const parsed = toAstJson(parse(fixture.source))
  assertProjection(parsed, expectedNodes(parsed, fixture))
  const ordinary = carveToMarkdown(fixture.source)
  check.equal(carveToMarkdown(fixture.source, { roundtrip: false }), ordinary, 'ordinary markdown ignores roundtrip: false')
  check.ok(!ordinary.includes('<!-- carve:'), 'ordinary markdown has no carrier markers')
  for (const fragment of fixture.ordinaryFragments ?? []) check.ok(ordinary.includes(fragment), fragment)
  for (const fragment of fixture.forbiddenOrdinaryFragments ?? []) check.ok(!ordinary.includes(fragment), fragment)
  if (fixture.defaultExportOnly) return
  const exported = carveToMarkdown(fixture.source, { roundtrip: true })
  for (const fragment of fixture.carrierFragments) check.ok(exported.includes(fragment), fragment)
  // CARVE-P11-068: inline markers only add; stripping them gives the ordinary bytes.
  if (fixture.inlineMarkers) check.equal(exported.replace(/<!-- carve: [\s\S]*? -->/g, ''), ordinary, 'stripping inline markers restores ordinary markdown')
  const codes = carveToMarkdownWithReport(fixture.source, { roundtrip: true }).losses.map((row) => row.code)
  for (const code of fixture.lossCodes ?? []) check.ok(codes.includes(code), code)
  for (const code of fixture.forbiddenLossCodes ?? []) check.ok(!codes.includes(code), code)
  assertMarkdownReturn(fixture, migrateMarkdown(exported).value)
}))

for (const fixture of fixtures.markdownImportNegative) test(`shared Markdown import rejection: ${fixture.id}`, aheadOfPin(fixture, () => {
  const imported = migrateMarkdown(fixture.markdown)
  const tree = toAstJson(parse(imported.value))
  if (fixture.expectedDiagnostic) check.ok(imported.report.diagnostics.some((row) => row.code === fixture.expectedDiagnostic.code), fixture.expectedDiagnostic.code)
  const actualTypes = new Set(nodes(tree).map((node) => node.type))
  for (const type of fixture.forbiddenTypes ?? []) check.ok(!actualTypes.has(type), type)
  assertProjection(tree, expectedNodes(tree, fixture) ?? [])
  for (const forbidden of fixture.forbiddenNodes ?? []) check.throws(() => assertProjection(tree, [forbidden]), { code: 'ERR_ASSERTION' }, JSON.stringify(forbidden))
  for (const [code, count] of Object.entries(fixture.expectedDiagnostics ?? {})) {
    const rows = imported.report.diagnostics.filter((row) => row.code === code)
    check.equal(rows.length, count, code)
    for (const row of rows) check.deepEqual([row.fidelity, row.confidence], ['degraded', 'fallback'], code)
  }
}))

test('a Markdown row without a declared loss still fails when its HTML moves', () => {
  const lossless = fixtures.markdownExportImport.filter((row) => !(row.lossCodes ?? []).length && !row.defaultExportOnly)
  assert.ok(lossless.length > 0, 'no lossless Markdown row is left to compare')
  for (const fixture of lossless) {
    assertMarkdownReturn(fixture, fixture.source, false)
    assert.throws(() => assertMarkdownReturn(fixture, `${fixture.source}\nmoved\n`, false), { code: 'ERR_ASSERTION' }, fixture.id)
  }
})

test('shared acceptance cases have distinct identities and explicit assertions', () => {
  const ids = new Set()
  for (const row of [...fixtures.exportImport, ...fixtures.importNegative, ...fixtures.collisionExport, ...fixtures.markdownExportImport, ...fixtures.markdownImportNegative]) {
    assert.ok(!ids.has(row.id), row.id)
    ids.add(row.id)
    assert.ok(typeof row.source === 'string' || typeof row.html === 'string' || typeof row.markdown === 'string', row.id)
    assert.ok(row.expectedNodes?.length || row.expectedDiagnostic || row.expectedDiagnostics || row.attribute, row.id)
    if (Object.hasOwn(row, 'aheadOfPin')) assert.ok(row.aheadOfPin && typeof row.aheadOfPin === 'object' && !Array.isArray(row.aheadOfPin) &&
      Array.isArray(row.aheadOfPin.fails) && row.aheadOfPin.fails.length > 0 &&
      row.aheadOfPin.fails.every((label) => typeof label === 'string' && label.length > 0), `${row.id}: aheadOfPin must name failed assertions`)
  }
})

test('aheadOfPin collects only declared failing checks', () => {
  const body = () => {
    check.equal(1, 2, 'failing check')
    check.equal(1, 1, 'passing check')
  }
  assert.doesNotThrow(aheadOfPin({ id: 'synthetic', aheadOfPin: { fails: ['failing check'] } }, body))
  assert.throws(aheadOfPin({ id: 'synthetic', aheadOfPin: { fails: ['passing check'] } }, body), /undeclared failure under aheadOfPin: failing check/)
  assert.throws(aheadOfPin({ id: 'synthetic', aheadOfPin: { fails: ['failing check'] } }, () => check.equal(1, 1, 'passing check')), /drop the flag/)
})
