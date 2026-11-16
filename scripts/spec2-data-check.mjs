// Checks the data files of the 0.2 spec (spec/0.2/data).
//   node scripts/spec2-data-check.mjs
// Fails when a file breaks its schema, cites a clause id that no document
// defines, names a row of another file that does not exist, or is out of order.
// Prints the clauses of the two syntax chapters that no row cites, as a report.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'spec/0.2/data')

// Until the documents land, each is read from the branch that drafts it.
const DOCUMENTS = {
  'syntax-blocks': 'origin/spec/0.2-syntax-blocks',
  'syntax-inline': 'origin/spec/0.2-syntax-inline',
  ast: 'origin/spec/0.2-ast',
  extensions: 'origin/spec/0.2-ast',
  'source-layout': 'origin/spec/0.2-ast',
  html: 'origin/spec/0.2-html-writer',
  writer: 'origin/spec/0.2-html-writer',
  includes: 'origin/next2',
  'import-html': 'origin/next2',
}

// file -> the lists it holds, with the key that identifies a row and how the list is ordered.
const FILES = {
  'attribute-block': { parts: ['name', 'name'], shapes: ['name', 'name'], order: ['name', 'rank'], folds: ['key', 'key'], merges: ['name', 'name'], contexts: ['name', 'name'] },
  'caption-number': { not_a_mark: ['name', 'name'] },
  'close-facts': { facts: ['name', 'name'] },
  containers: { containers: ['name', 'name'] },
  'div-names': { names: ['name', 'name'], sigils: ['name', 'sigil'] },
  'escape-contexts': { contexts: ['name', 'name'], no_escape: ['name', 'name'], no_spelling: ['name', 'name'] },
  extensions: { extensions: ['name', 'name'] },
  'heading-slug': { removed: ['code_point', 'code_point'], reversed: ['glyph', 'glyph'] },
  'include-options': { options: ['name', 'rank'] },
  includes: { causes: ['name', 'rank'], conflicts: ['name', 'name'] },
  'inline-atoms': { atoms: ['name', 'name'] },
  'import-html': { elements: ['name', 'name'], attributes: ['name', 'name'], conventions: ['name', 'name'], codes: ['id', 'id'], losses: ['name', 'name'] },
  'inline-braces': { order: ['name', 'rank'] },
  'inline-brackets': { brackets: ['name', 'name'] },
  'inline-scan': { steps: ['name', 'rank'], fallbacks: ['name', 'name'] },
  'inline-delimiters': { delimiters: ['name', 'name'] },
  'inline-sigils': { sigils: ['name', 'name'] },
  interrupters: { interrupters: ['name', 'name'], lazy_shapes: ['name', 'name'] },
  limits: { limits: ['name', 'name'] },
  'ordered-styles': { styles: ['name', 'name'], delimiters: ['name', 'char'] },
  'line-shapes': { shapes: ['name', 'first'], refs: ['name', 'name'] },
  'lint-rules': { rules: ['id', 'id'] },
  options: { options: ['name', 'name'] },
  'smart-punctuation': { runs: ['source', 'source'], quotes: ['kind', 'kind'], dashes: ['kind', 'kind'] },
  'table-marks': { span_marks: ['mark', 'mark'], alignment_marks: ['mark', 'mark'], attributes: ['name', 'name'] },
  'url-policy': { probe_removes: ['name', 'name'], dropped_attributes: ['name', 'name'], url_list_attributes: ['name', 'name'], style_patterns: ['text', 'text'], profiles: ['name', 'name'] },
  'task-states': { states: ['char', 'char'] },
  'upgrade-map': { source: ['id', 'id'], tree: ['id', 'id'] },
  'unicode-categories': { categories: ['name', 'name'] },
}

const errors = []
const fail = message => errors.push(message)

function readDocument(name, ref) {
  const path = join(root, 'spec/0.2', `${name}.md`)
  if (existsSync(path)) return { text: readFileSync(path, 'utf8'), from: 'working tree' }
  try {
    const text = execFileSync('git', ['show', `${ref}:spec/0.2/${name}.md`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] })
    return { text, from: ref }
  } catch {
    fail(`${name}.md: not in the working tree and not at ${ref} (fetch that branch)`)
    return { text: '', from: 'missing' }
  }
}

// A clause is a paragraph that starts with its id in bold.
const defined = new Set()
const sources = []
for (const [name, ref] of Object.entries(DOCUMENTS)) {
  const { text, from } = readDocument(name, ref)
  sources.push(`${name}.md from ${from}`)
  for (const match of text.matchAll(/^\*\*(?:Exception )?(C2-[ABHILMNWX]-\d{3})\*\*/gm)) defined.add(match[1])
}

const data = {}
const cited = new Set()
const counts = []
const ajv = new Ajv2020({ allErrors: true, strict: true })

function collectClauses(value, where) {
  if (Array.isArray(value)) return value.forEach((entry, index) => collectClauses(entry, `${where}[${index}]`))
  if (value === null || typeof value !== 'object') return
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'clauses') {
      for (const id of entry) {
        cited.add(id)
        if (!defined.has(id)) fail(`${where}: cites ${id}, which no document defines`)
      }
    } else collectClauses(entry, `${where}.${key}`)
  }
}

const codePoints = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const lowestFirst = row => (row.first.length ? Math.min(...row.first.map(entry => entry.codePointAt(0))) : -1)

for (const [file, lists] of Object.entries(FILES)) {
  const path = join(dataDir, `${file}.json`)
  const schemaPath = join(dataDir, 'schemas', `${file}.schema.json`)
  if (!existsSync(path) || !existsSync(schemaPath)) {
    fail(`${file}: data file or schema is missing`)
    continue
  }
  const text = readFileSync(path, 'utf8')
  if (/\\u[0-9a-fA-F]{4}/.test(text)) fail(`${file}.json: holds an escaped character; write it as UTF-8`)
  const value = (data[file] = JSON.parse(text))
  const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf8')))
  if (!validate(value)) for (const error of validate.errors) fail(`${file}.json${error.instancePath}: ${error.message}`)
  collectClauses(value, file)
  for (const [list, [idKey, orderKey]] of Object.entries(lists)) {
    const rows = value[list] ?? []
    counts.push(`${file}.json ${list}: ${rows.length}`)
    const seen = new Set()
    for (const row of rows) {
      const id = row[idKey]
      if (seen.has(id)) fail(`${file}.json ${list}: "${id}" stands twice`)
      seen.add(id)
    }
    const compare = orderKey === 'first'
      ? (a, b) => lowestFirst(a) - lowestFirst(b) || codePoints(a.name, b.name)
      : orderKey === 'rank' ? (a, b) => a.rank - b.rank : (a, b) => codePoints(a[orderKey], b[orderKey])
    for (let index = 1; index < rows.length; index++) {
      if (compare(rows[index - 1], rows[index]) > 0) fail(`${file}.json ${list}: "${rows[index][idKey]}" is out of order`)
    }
  }
}

// The AST schema is the 0.2 tree contract. Its definitions are exactly the
// node rows in ast.md; the envelope is a second top-level shape.
const astSchemaPath = join(dataDir, 'ast-schema.json')
if (!existsSync(astSchemaPath)) fail('ast-schema.json: data file is missing')
else {
  const schemaText = readFileSync(astSchemaPath, 'utf8')
  const schema = JSON.parse(schemaText)
  try { ajv.compile(schema) } catch (error) { fail(`ast-schema.json: invalid JSON Schema: ${error.message}`) }
  collectClauses(schema, 'ast-schema.json')
  for (const match of schemaText.matchAll(/C2-[ABHILMNWX]-\d{3}/g)) {
    cited.add(match[0])
    if (!defined.has(match[0])) fail(`ast-schema.json: cites ${match[0]}, which no document defines`)
  }
  const astText = readDocument('ast', DOCUMENTS.ast).text
  const table = astText.match(/\| Type \| Occurs in \| `children` \| Fields \|[\s\S]*?(?=\n\*\*C2-A-051\*\*)/)?.[0] ?? ''
  const rows = new Set([...table.matchAll(/^\| `([^`]+)` \|/gm)].map(match => match[1]))
  const definitions = new Set(Object.keys(schema.$defs ?? {}))
  for (const type of rows) if (!definitions.has(type)) fail(`ast-schema.json: missing node definition ${type}`)
  for (const type of definitions) if (!rows.has(type)) fail(`ast-schema.json: definition ${type} has no node-table row`)
  for (const [type, definition] of Object.entries(schema.$defs ?? {})) {
    if (definition.properties?.type?.const !== type) fail(`ast-schema.json: ${type} must define type const ${type}`)
  }
  counts.push(`ast-schema.json node definitions: ${definitions.size}`)

  const resultsPath = join(dataDir, 'ast-results.json')
  if (!existsSync(resultsPath)) fail('ast-results.json: data file is missing')
  else {
    const results = JSON.parse(readFileSync(resultsPath, 'utf8'))
    const listed = new Set()
    for (const type of definitions) if (!(type in (results.nodes ?? {}))) fail(`ast-results.json: missing node ${type}`)
    for (const [type, entries] of Object.entries(results.nodes ?? {})) {
      if (!definitions.has(type)) fail(`ast-results.json: unknown node ${type}`)
      for (const entry of entries) {
        const key = `${type}.${entry.field}`
        if (listed.has(key)) fail(`ast-results.json: duplicate ${key}`)
        listed.add(key)
        const field = schema.$defs[type]?.properties?.[entry.field]
        if (!field) fail(`ast-results.json: unknown field ${key}`)
        else if (field.$comment !== `resolution result${entry.when ? ` when ${entry.when}` : ''}`) fail(`ast-results.json: schema marker differs for ${key}`)
      }
    }
    for (const [type, definition] of Object.entries(schema.$defs)) {
      for (const [field, shape] of Object.entries(definition.properties ?? {})) {
        if (shape.$comment?.startsWith('resolution result') && !listed.has(`${type}.${field}`)) fail(`ast-results.json: missing ${type}.${field}`)
      }
    }
    counts.push(`ast-results.json result fields: ${listed.size}`)
  }

  const layoutPath = join(dataDir, 'layout-schema.json')
  if (!existsSync(layoutPath)) fail('layout-schema.json: data file is missing')
  else try { ajv.compile(JSON.parse(readFileSync(layoutPath, 'utf8'))) } catch (error) { fail(`layout-schema.json: invalid JSON Schema: ${error.message}`) }
  const slotsPath = join(dataDir, 'node-slots.json')
  if (!existsSync(slotsPath)) fail('node-slots.json: data file is missing')
  else try { execFileSync('node', [join(root, 'scripts/spec2-node-slots.mjs'), '--check'], { cwd: root, stdio: 'pipe' }) }
  catch { fail('node-slots.json: does not match slots generated from ast-schema.json') }
  // The tree gate of ast.md: the fixtures of spec/0.2/trees.
  try { counts.push(execFileSync('node', [join(root, 'scripts/spec2-trees.mjs'), '--check'], { cwd: root, stdio: 'pipe' }).toString().trim()) }
  catch (error) { fail(`trees: ${(error.stderr ?? '').toString().trim() || error.message}`) }
}

// Names that one file takes from another.
for (const name of ['carve-source', 'carve-style', 'carve-annotation']) {
  const path = join(dataDir, 'schemas', `${name}.schema.json`)
  if (!existsSync(path)) fail(`${name}.schema.json: missing`)
  else try { ajv.compile(JSON.parse(readFileSync(path, 'utf8'))) }
  catch (error) { fail(`${name}.schema.json: invalid JSON Schema: ${error.message}`) }
}

const names = (file, list, key = 'name') => new Set((data[file]?.[list] ?? []).map(row => row[key]))
const shapes = names('line-shapes', 'shapes')
const refs = names('line-shapes', 'refs')
const atoms = names('inline-atoms', 'atoms')
const containers = names('containers', 'containers')
const codes = names('lint-rules', 'rules', 'id')
const need = (set, name, where, what) => {
  if (name !== undefined && !set.has(name)) fail(`${where}: "${name}" is no ${what}`)
}
const walkParts = (sequence, where) => {
  for (const part of sequence ?? []) {
    if (part.part === 'ref') need(refs, part.ref, where, 'entry of refs in line-shapes.json')
    if (part.part === 'optional') walkParts(part.sequence, where)
    if (part.part === 'choice') part.options.forEach(option => walkParts(option, where))
  }
}
for (const row of data['line-shapes']?.shapes ?? []) {
  walkParts(row.sequence, `line-shapes.json ${row.name}`)
  // The dispatch generator of the reference engine reads `name` and `first`: one bit per shape, ASCII only.
  for (const entry of row.first) {
    if (![1, 3].includes(entry.length) || [...entry].some(ch => ch.codePointAt(0) > 127)) fail(`line-shapes.json ${row.name}: first entry "${entry}" is not one ASCII character or a range`)
  }
}
if ((data['line-shapes']?.shapes ?? []).length > 31) fail('line-shapes.json: more than 31 shapes do not fit one bit each in a 32-bit table')
for (const row of [...(data.interrupters?.interrupters ?? []), ...(data['escape-contexts']?.contexts ?? [])]) {
  for (const shape of row.shapes ?? []) need(shapes, shape, `${row.name}`, 'row of line-shapes.json')
  for (const atom of row.atoms ?? []) need(atoms, atom, `${row.name}`, 'row of inline-atoms.json')
}
for (const row of data.interrupters?.lazy_shapes ?? []) need(shapes, row.name, 'interrupters.json lazy_shapes', 'row of line-shapes.json')
for (const row of data.containers?.containers ?? []) {
  for (const shape of [...row.opened_by, row.closed_by]) need(shapes, shape, `containers.json ${row.name}`, 'row of line-shapes.json')
  need(codes, row.unclosed_report, `containers.json ${row.name}`, 'id of lint-rules.json')
}
for (const row of data['close-facts']?.facts ?? []) need(shapes, row.shape, `close-facts.json ${row.name}`, 'row of line-shapes.json')
for (const row of data['div-names']?.sigils ?? []) need(containers, row.name, `div-names.json ${row.name}`, 'row of containers.json')
for (const row of data['escape-contexts']?.no_spelling ?? []) need(codes, row.report, `escape-contexts.json ${row.name}`, 'id of lint-rules.json')
for (const row of data['inline-braces']?.order ?? []) {
  if (row.name !== 'braced_opener') need(atoms, row.name, 'inline-braces.json', 'row of inline-atoms.json')
}
for (const atom of data['inline-scan']?.never_fail ?? []) need(atoms, atom, 'inline-scan.json never_fail', 'row of inline-atoms.json')
for (const row of data['table-marks']?.attributes ?? []) need(codes, row.report, `table-marks.json ${row.name}`, 'id of lint-rules.json')
for (const row of data['lint-rules']?.rules ?? []) need(codes, row.replaced_by, `lint-rules.json ${row.id}`, 'id of lint-rules.json')
const includeOptions = names('include-options', 'options')
for (const row of [...(data.includes?.causes ?? []), ...(data.includes?.conflicts ?? [])]) {
  need(codes, row.code, `includes.json ${row.name}`, 'id of lint-rules.json')
  const kept = data['lint-rules']?.rules.find(rule => rule.id === row.code)
  if (kept && kept.channel !== 'parse') fail(`includes.json ${row.name}: ${row.code} is not a code of the parse channel`)
  for (const option of row.options ?? []) if (option !== 'section') need(includeOptions, option, `includes.json ${row.name}`, 'row of include-options.json')
}

// The Unicode ranges are generated (scripts/spec2-unicode.mjs --check compares them with the
// source); here only their order is checked, so the check runs without the network.
for (const row of data['unicode-categories']?.categories ?? []) {
  let last = -2
  for (const range of row.ranges) {
    const [from, to = from] = range.split('-').map(part => Number.parseInt(part, 16))
    if (from > to || from <= last + 1) fail(`unicode-categories.json ${row.name}: "${range}" is out of order, overlaps or touches the range before`)
    last = to
  }
}

// The non-normative guide and the machine-readable map must enumerate the same changes.
const guidePath = join(root, 'spec/0.2/UPGRADING.md')
if (!existsSync(guidePath)) fail('UPGRADING.md: guide is missing')
else {
  const guide = readFileSync(guidePath, 'utf8')
  const tableRows = [...guide.matchAll(/^\| (U-\d{3}|T-\d{3}) \|[^\n]*$/gm)]
  const listed = tableRows.map(match => match[1])
  const expected = [...(data['upgrade-map']?.source ?? []), ...(data['upgrade-map']?.tree ?? [])].map(row => row.id)
  const seen = new Set()
  for (const id of listed) {
    if (seen.has(id)) fail(`UPGRADING.md: ${id} appears in more than one table row`)
    seen.add(id)
    if (!expected.includes(id)) fail(`UPGRADING.md: ${id} is absent from upgrade-map.json`)
  }
  for (const id of expected) if (!seen.has(id)) fail(`UPGRADING.md: missing table row ${id}`)
  const shown = new Map(tableRows.map(match => [match[1], match[0]]))
  for (const row of data['upgrade-map']?.source ?? []) {
    const line = shown.get(row.id) ?? ''
    if (row.toolEntry !== row.id) fail(`upgrade-map.json: ${row.id} has a different toolEntry`)
    if (!line.endsWith(`; ${row.kind} |`)) fail(`UPGRADING.md: ${row.id} has a different tool class`)
    if (line.includes('**SILENT**') !== row.silent) fail(`UPGRADING.md: ${row.id} has a different silent flag`)
  }
  for (const row of data['upgrade-map']?.tree ?? []) {
    if (!(shown.get(row.id) ?? '').startsWith(`| ${row.id} | ${row.kind} |`)) fail(`UPGRADING.md: ${row.id} has a different change kind`)
  }
}

console.log(`Documents: ${sources.join('; ')}`)
console.log(`Clauses defined: ${defined.size}. Clauses cited by a data row: ${cited.size}.`)
console.log(`Rows:\n  ${counts.join('\n  ')}`)

// The phase 1 gate asks for a row where a rule is table-shaped. This list is for review, not a failure.
for (const [prefix, chapter] of [['C2-B-', 'syntax-blocks.md'], ['C2-I-', 'syntax-inline.md'], ['C2-N-', 'includes.md']]) {
  const all = [...defined].filter(id => id.startsWith(prefix)).sort()
  const missing = all.filter(id => !cited.has(id))
  console.log(`${chapter}: ${missing.length} of ${all.length} clauses are cited by no data row${missing.length ? ':\n  ' + missing.join(' ') : '.'}`)
}

if (errors.length) {
  console.error(`\n${errors.length} error(s):\n  ${errors.join('\n  ')}`)
  process.exit(1)
}
console.log('\nspec 0.2 data: ok')
