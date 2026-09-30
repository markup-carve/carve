import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const TARGETS = ['Carve', 'HTML', 'Markdown', 'Plain', 'ANSI']
const columns = ['Shape', 'Rule', ...TARGETS, 'Diagnostic']
const sourcePath = 'resources/spec/23-ast-foundations.ebnf'

export function parseFallbackMatrix(source) {
  if (source.split('(* BEGIN AST FALLBACK MATRIX').length !== 2) throw new Error('expected one AST fallback matrix')
  const block = source.match(/\(\* BEGIN AST FALLBACK MATRIX\n([\s\S]*?)\n\s*END AST FALLBACK MATRIX \*\)/)?.[1]
  if (!block) throw new Error('AST fallback matrix is absent')
  const lines = block.split('\n').filter((line) => line.startsWith('|'))
  const cells = (line) => line.trim().slice(1, -1).split('|').map((cell) => cell.trim())
  if (JSON.stringify(cells(lines[0])) !== JSON.stringify(columns)) throw new Error('invalid fallback matrix columns')
  const rows = lines.slice(1).map((line) => {
    const values = cells(line)
    if (values.length !== columns.length || values.some((value) => value === '')) throw new Error('incomplete fallback row')
    return Object.fromEntries(columns.map((column, index) => [column, values[index]]))
  })
  if (rows.length === 0) throw new Error('AST fallback matrix is empty')
  if (!block.includes('   ACTIONS')) throw new Error('fallback action legend is absent')
  const keys = [...block.matchAll(/^   ([a-z_]+): /gm)].map((match) => match[1])
  const actions = new Set(keys)
  if (actions.size !== keys.length) throw new Error('duplicate fallback action definition')
  return { block, lines, rows, actions }
}

export function validateMatrix(matrix, { registry, schema, conversion, renderLoss, grammar }) {
  const seen = new Set()
  const clauses = [...grammar.matchAll(/--\s+NORMATIVE\s+\[(CARVE-P12-\d{3})\]/g)]
  const references = new Map()
  const bodies = new Map()
  for (let index = 0; index < clauses.length; index++) {
    const body = grammar.slice(clauses[index].index, clauses[index + 1]?.index ?? grammar.length)
    bodies.set(clauses[index][1], body)
    for (const match of body.matchAll(/fallback matrix row\s+`([^`]+)`/gi)) {
      if (references.has(match[1])) throw new Error(`duplicate fallback clause reference: ${match[1]}`)
      references.set(match[1], clauses[index][1])
    }
  }
  const codes = new Set([
    ...conversion.properties.diagnostics.items.properties.code.enum,
    ...renderLoss.properties.losses.items.properties.code.enum,
  ])
  for (const row of matrix.rows) {
    if (seen.has(row.Shape)) throw new Error(`duplicate fallback row: ${row.Shape}`)
    seen.add(row.Shape)
    const rule = registry.rules.find(({ id }) => id === row.Rule)
    if (rule?.part !== '12' || !clauses.some((clause) => clause[1] === row.Rule)) throw new Error(`fallback row has no active PART 12 clause: ${row.Rule}`)
    if (references.get(row.Shape) !== row.Rule) throw new Error(`fallback row disagrees with its clause: ${row.Shape}`)
    for (const target of TARGETS) {
      if (!matrix.actions.has(row[target])) throw new Error(`unknown fallback action: ${row[target]}`)
    }
    const nodes = row.Shape.split(',').map((shape) => {
      const match = shape.match(/^([a-z_]+)(?:\.([A-Za-z]+))?(?:\[[^\]]+\])?$/)
      if (!match || !Object.hasOwn(schema.$defs, match[1])) throw new Error(`unknown fallback node: ${shape}`)
      if (match[2] && !Object.hasOwn(schema.$defs[match[1]].properties, match[2])) throw new Error(`unknown fallback field: ${shape}`)
      return { node: match[1], field: match[2] }
    })
    const diagnostic = row.Diagnostic === 'clause' ? null : row.Diagnostic.match(/^([a-z-]+) \(([^)]+)\)$/)
    if (row.Diagnostic !== 'clause' && (!diagnostic || !codes.has(diagnostic[1]))) throw new Error(`unknown diagnostic code: ${row.Diagnostic}`)
    if (diagnostic) {
      if (!bodies.get(row.Rule).includes('`' + diagnostic[1] + '`')) throw new Error(`diagnostic code is absent from its clause: ${row.Diagnostic}`)
      const targets = diagnostic[2].split(',')
      if (new Set(targets).size !== targets.length || targets.some((target) => !TARGETS.includes(target))) throw new Error(`invalid diagnostic targets: ${row.Diagnostic}`)
    }
    if (diagnostic?.[1] === 'field-unspellable' && nodes.some(({ field }) => !field)) throw new Error(`field diagnostic has no field: ${row.Shape}`)
    if (diagnostic?.[1] === 'structure-unspellable' && nodes.some(({ field }) => field)) throw new Error(`structure diagnostic names a field: ${row.Shape}`)
  }
  for (const shape of references.keys()) if (!seen.has(shape)) throw new Error(`missing fallback row: ${shape}`)
}

export function updateFallbackViews(repo, write = false) {
  const readJson = (path) => JSON.parse(readFileSync(resolve(repo, path), 'utf8'))
  const modules = readdirSync(resolve(repo, 'resources/spec')).filter((file) => file.endsWith('.ebnf')).sort()
    .map((file) => ({ path: `resources/spec/${file}`, text: readFileSync(resolve(repo, 'resources/spec', file), 'utf8') }))
  const matrix = parseFallbackMatrix(modules.map((module) => module.text).join(''))
  validateMatrix(matrix, {
    registry: readJson('resources/spec/rules.json'), schema: readJson('resources/ast-schema.json'),
    conversion: readJson('resources/conversion-diagnostics.schema.json'), renderLoss: readJson('resources/render-loss-report.schema.json'),
    grammar: modules.map((module) => module.text).join(''),
  })
  const links = new Map()
  for (const module of modules) for (const match of module.text.matchAll(/--\s+NORMATIVE\s+\[(CARVE-P12-\d{3})\]/g)) {
    const line = module.text.slice(0, match.index).split('\n').length
    links.set(match[1], `https://github.com/markup-carve/carve/blob/main/${module.path}#L${line}`)
  }
  const rows = matrix.rows.map((row) => `| ${columns.map((column) => column === 'Rule'
    ? `[\`${row.Rule}\`](${links.get(row.Rule)})` : `\`${row[column]}\``).join(' | ')} |`)
  const legend = matrix.block.slice(matrix.block.indexOf('   ACTIONS')).trimEnd()
    .replace(/^   ACTIONS.*\n/, '').replace(/^   ([a-z_]+): /gm, '- `$1`: ').replace(/\n     /g, ' ')
  const block = `<!-- BEGIN GENERATED AST FALLBACK MATRIX -->\n## Interchange fallback matrix\n\nGenerated from [the checked summary table](https://github.com/markup-carve/carve/blob/main/${sourcePath}). The cited clauses prevail if the summary disagrees. These wrapper/field forms have no Carve 0.1 core source spelling. Brackets restrict a row's scope. Detailed algorithms, attribute exceptions, diagnostic targets, API conditions and reporting strength remain in the cited PART 12 clauses. The diagnostic column names known codes with the targets named by the clauses; \`clause\` leaves the code/channel to the cited clauses, including cross-clause channel assignments. Unlisted diagnostic targets and \`unspecified\` action cells add no ruling.\n\n${matrix.lines[0]}\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\n${legend}\n<!-- END GENERATED AST FALLBACK MATRIX -->`
  const path = resolve(repo, 'docs/ast-json-contract.md')
  const current = readFileSync(path, 'utf8')
  const marker = /<!-- BEGIN GENERATED AST FALLBACK MATRIX -->[\s\S]*?<!-- END GENERATED AST FALLBACK MATRIX -->/
  const expected = marker.test(current) ? current.replace(marker, () => block) : `${current}\n${block}\n`
  if (current !== expected) {
    if (!write) throw new Error('AST fallback docs are stale; run npm run spec:write')
    writeFileSync(path, expected)
  }
}
