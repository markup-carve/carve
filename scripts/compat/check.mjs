import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import { fromAstJson, toAstJson, parse, renderCarve, renderHtml, resolve, markdownToCarve, djotToCarve, htmlToCarve } from '@markup-carve/carve'
import { context, semantics, plain, parseHtml, fromHast, authoredAttributes } from './trees.mjs'
import { toolNames, readForeign, exportForeign } from './tools.mjs'

const schema = JSON.parse(readFileSync(new URL('../../resources/ast-schema.json', import.meta.url)))
const validate = new Ajv2020({ strict: false }).compile(schema)
export const corpus = JSON.parse(readFileSync(new URL('../../tests/external-compat/cases.json', import.meta.url)))
export const lossCorpus = JSON.parse(readFileSync(new URL('../../tests/external-compat/losses.json', import.meta.url)))
export const sourceFormats = { mdast: 'markdown', hast: 'html', commonmark: 'markdown', cmark: 'markdown', md4c: 'markdown', djot: 'djot', docutils: 'rst', asciidoctor: 'asciidoc' }

export function validateAst(ast) {
  assert.equal(validate(ast), true, JSON.stringify(validate.errors))
}

export function validateCorpus(data = corpus) {
  assert.equal(data.schemaVersion, 1)
  assert.ok(data.cases.length > 0, 'Compatibility corpus is empty')
  assert.equal(new Set(data.cases.map(c => c.id)).size, data.cases.length, 'Duplicate case identifier')
  for (const c of data.cases) {
    assert.match(c.id, /^[a-z0-9-]+$/)
    assert.equal(typeof c.carve, 'string', `${c.id}: missing Carve expectation`)
    assert.ok((c.tools ?? toolNames).length > 0, `${c.id}: no tools selected`)
    for (const tool of c.tools ?? toolNames) {
      assert.ok(toolNames.includes(tool), `${c.id}: unknown tool ${tool}`)
      assert.equal(typeof c[sourceFormats[tool]], 'string', `${c.id}: missing ${tool} source`)
    }
  }
  for (const tool of toolNames) assert.ok(data.cases.some(c => (c.tools ?? toolNames).includes(tool)), `${tool} has no cases`)
}

export function validateLossCorpus(data = lossCorpus) {
  assert.equal(data.schemaVersion, 1)
  assert.ok(data.cases.length > 0, 'Loss corpus is empty')
  assert.equal(new Set(data.cases.map(c => c.id)).size, data.cases.length, 'Duplicate loss case identifier')
  for (const c of data.cases) {
    assert.match(c.id, /^[a-z0-9-]+$/)
    assert.ok(['import', 'export'].includes(c.direction), `${c.id}: unknown loss direction`)
    assert.ok(c.tools.length > 0, `${c.id}: no loss tools selected`)
    for (const tool of c.tools) assert.ok(toolNames.includes(tool), `${c.id}: unknown loss tool ${tool}`)
    assert.equal(typeof c[c.direction === 'import' ? 'source' : 'carve'], 'string')
    assert.equal(typeof c.expected.code, 'string')
    assert.equal(typeof c.expected.path, 'string')
    assert.ok(['degraded', 'dropped'].includes(c.expected.fidelity))
    assert.ok(typeof c.retained === 'string' && c.retained.length > 0)
  }
  for (const tool of toolNames) assert.ok(data.cases.some(c => c.tools.includes(tool)), `${tool} has no loss cases`)
}

export async function checkCase(tool, fixture) {
  const expected = semantics(toAstJson(parse(fixture.carve)))
  const result = await readForeign(tool, fixture[sourceFormats[tool]])
  validateAst(result.ast)
  assert.deepEqual(semantics(result.ast), expected, `${tool}/${fixture.id}: foreign AST mapping`)
  assert.deepEqual(result.diagnostics.filter(d => ['degraded', 'dropped'].includes(d.fidelity)), [], `${tool}/${fixture.id}: unreported subset loss`)

  const renderedContext = context(tool)
  const authored = authoredAttributes(result.ast)
  const rendered = fromHast(parseHtml(result.html), renderedContext, { generated: tool !== 'hast', ...authored })
  const carveHtml = renderHtml(resolve(fromAstJson(result.ast)))
  const carveContext = context('carve')
  const carveRendered = fromHast(parseHtml(carveHtml), carveContext, { generated: true, ...authored })
  assert.deepEqual(semantics(rendered), semantics(carveRendered), `${tool}/${fixture.id}: independent HTML structure`)
  assert.deepEqual(renderedContext.diagnostics.filter(d => ['degraded', 'dropped'].includes(d.fidelity)), [], `${tool}/${fixture.id}: HTML comparison lost structure`)
  assert.deepEqual(carveContext.diagnostics.filter(d => ['degraded', 'dropped'].includes(d.fidelity)), [], `${tool}/${fixture.id}: Carve HTML comparison lost structure`)

  const importers = { markdown: markdownToCarve, djot: djotToCarve, html: s => htmlToCarve(s).value }
  const importer = importers[sourceFormats[tool]]
  if (importer) {
    const imported = importer(fixture[sourceFormats[tool]])
    const importedContext = context('carve-importer')
    const importedHtml = fromHast(parseHtml(renderHtml(resolve(parse(imported)))), importedContext, { generated: true, ...authored })
    assert.deepEqual(semantics(importedHtml), semantics(rendered), `${tool}/${fixture.id}: built-in importer rendering`)
    assert.deepEqual(importedContext.diagnostics.filter(d => ['degraded', 'dropped'].includes(d.fidelity)), [], `${tool}/${fixture.id}: importer HTML comparison lost structure`)
  }

  const canonical = renderCarve(fromAstJson(result.ast))
  const reparsed = toAstJson(parse(canonical))
  validateAst(reparsed)
  assert.deepEqual(semantics(reparsed), expected, `${tool}/${fixture.id}: Carve source round trip`)

  const encoded = JSON.parse(JSON.stringify(result.ast))
  const decoded = toAstJson(fromAstJson(encoded))
  validateAst(decoded)
  assert.deepEqual(semantics(decoded), expected, `${tool}/${fixture.id}: JSON interchange round trip`)

  const exported = exportForeign(tool, result.ast)
  assert.deepEqual(exported.diagnostics.filter(d => ['degraded', 'dropped'].includes(d.fidelity)), [], `${tool}/${fixture.id}: supported export reported a loss`)
  const reread = await readForeign(tool, exported.source)
  validateAst(reread.ast)
  assert.deepEqual(semantics(reread.ast), expected, `${tool}/${fixture.id}: foreign source round trip`)
  assert.deepEqual(reread.diagnostics.filter(d => ['degraded', 'dropped'].includes(d.fidelity)), [], `${tool}/${fixture.id}: foreign source round trip lost structure`)
  return { tool, case: fixture.id, status: 'passed', checks: ['ast-schema', 'ast-mapping', 'html-structure', 'carve-source-roundtrip', 'json-roundtrip', 'foreign-source-roundtrip', ...(importer ? ['built-in-importer-rendering'] : [])], diagnostics: [...result.diagnostics, ...renderedContext.diagnostics, ...exported.diagnostics, ...reread.diagnostics], version: result.version }
}

export async function checkLossCase(tool, fixture) {
  let result
  if (fixture.direction === 'import') result = await readForeign(tool, fixture.source)
  else {
    const exported = exportForeign(tool, toAstJson(parse(fixture.carve)))
    const reread = await readForeign(tool, exported.source)
    result = { ...reread, diagnostics: [...exported.diagnostics, ...reread.diagnostics] }
  }
  validateAst(result.ast)
  const expectedPath = fixture.expected.pathsByTool?.[tool] ?? fixture.expected.path
  assert.ok(result.diagnostics.some(d => d.code === fixture.expected.code && d.fidelity === fixture.expected.fidelity && d.path === expectedPath), `${tool}/${fixture.id}: expected loss at ${expectedPath} was not reported`)
  assert.ok(plain(result.ast).includes(fixture.retained), `${tool}/${fixture.id}: fallback lost readable content`)
  for (const diagnostic of result.diagnostics) {
    assert.equal(typeof diagnostic.path, 'string')
    assert.ok(['preserved', 'normalized', 'degraded', 'dropped'].includes(diagnostic.fidelity))
  }
  return { tool, case: fixture.id, status: 'passed', checks: ['loss-diagnostic', 'fallback-schema', 'fallback-content'], diagnostics: result.diagnostics, version: result.version }
}

export async function runCompatibility(selected = toolNames) {
  validateCorpus()
  validateLossCorpus()
  assert.ok(selected.length > 0, 'No compatibility tools selected')
  assert.equal(new Set(selected).size, selected.length, 'Duplicate selected tool')
  for (const tool of selected) assert.ok(toolNames.includes(tool), `Unknown tool: ${tool}`)
  const rows = []
  for (const tool of selected) {
    for (const fixture of corpus.cases.filter(c => (c.tools ?? toolNames).includes(tool))) {
      try { rows.push(await checkCase(tool, fixture)) }
      catch (error) { rows.push({ tool, case: fixture.id, status: 'failed', error: error.message }) }
    }
    for (const fixture of lossCorpus.cases.filter(c => c.tools.includes(tool))) {
      try { rows.push(await checkLossCase(tool, fixture)) }
      catch (error) { rows.push({ tool, case: fixture.id, status: 'failed', error: error.message }) }
    }
  }
  return { schemaVersion: 1, selected, notMeasured: toolNames.filter(t => !selected.includes(t)), passed: rows.filter(r => r.status === 'passed').length, failed: rows.filter(r => r.status === 'failed').length, rows }
}
