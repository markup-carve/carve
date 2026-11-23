// Checks the data files of the 0.2 spec (spec/0.2/data).
//   node scripts/spec2-data-check.mjs
// Fails when a file breaks its schema, cites a clause id that no document
// defines, names a row of another file that does not exist, or is out of order, and when the documents
// disagree with each other: a cited clause id that no document defines, an example number used twice,
// a count table or a count sentence that the document does not match, a reported code that is not in
// lint-rules.json or a catalog code that no document names, and an option table that differs from options.json.
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
  tooling: 'origin/next2',
}

// file -> the lists it holds, with the key that identifies a row and how the list is ordered.
const FILES = {
  'attribute-block': { parts: ['name', 'name'], shapes: ['name', 'name'], order: ['name', 'rank'], folds: ['key', 'key'], merges: ['name', 'name'], contexts: ['name', 'name'] },
  'caption-number': { not_a_mark: ['name', 'name'] },
  cli: { commands: ['name', 'name'], flags: ['name', 'name'], categories: ['name', 'name'], library: ['name', 'name'], entry_fields: ['name', 'name'] },
  'close-facts': { facts: ['name', 'name'] },
  containers: { containers: ['name', 'name'] },
  'div-names': { names: ['name', 'name'], sigils: ['name', 'sigil'] },
  'escape-contexts': { contexts: ['name', 'name'], no_escape: ['name', 'name'], no_spelling: ['name', 'name'] },
  extensions: { extensions: ['name', 'name'] },
  'heading-slug': { removed: ['code_point', 'code_point'], reversed: ['glyph', 'glyph'] },
  'include-options': { options: ['name', 'rank'] },
  includes: { causes: ['name', 'rank'], conflicts: ['name', 'name'] },
  'inline-atoms': { atoms: ['name', 'name'] },
  'import-html': { adapters: ['name', 'name'], elements: ['name', 'name'], attributes: ['name', 'name'], conventions: ['name', 'name'], codes: ['id', 'id'], losses: ['name', 'name'] },
  'inline-braces': { order: ['name', 'rank'] },
  'inline-brackets': { brackets: ['name', 'name'] },
  'inline-scan': { steps: ['name', 'rank'], fallbacks: ['name', 'name'] },
  'inline-delimiters': { delimiters: ['name', 'name'] },
  'inline-sigils': { sigils: ['name', 'name'] },
  interrupters: { interrupters: ['name', 'name'], lazy_shapes: ['name', 'name'] },
  limits: { limits: ['name', 'name'] },
  'ordered-styles': { styles: ['name', 'name'], delimiters: ['name', 'char'] },
  'line-shapes': { shapes: ['name', 'first'], refs: ['name', 'name'] },
  'lint-model': { line_fields: ['name', 'name'], block_fields: ['name', 'name'], inline_fields: ['name', 'name'], table_fields: ['name', 'name'], rules: ['id', 'id'] },
  'lint-rules': { rules: ['id', 'id'] },
  options: { options: ['name', 'name'] },
  'smart-punctuation': { runs: ['source', 'source'], quotes: ['kind', 'kind'], dashes: ['kind', 'kind'] },
  'table-marks': { span_marks: ['mark', 'mark'], alignment_marks: ['mark', 'mark'], vertical_marks: ['mark', 'mark'], attributes: ['name', 'name'] },
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
  for (const match of text.matchAll(/^\*\*(?:Exception )?(C2-[ABHILMNTWX]-\d{3})\*\*/gm)) defined.add(match[1])
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
      // C2-W-150: a lint row may be stated by one rule per record kind.
      const id = file === 'lint-model' && list === 'rules' ? `${row.id} ${row.over}` : row[idKey]
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
  for (const match of schemaText.matchAll(/C2-[ABHILMNTWX]-\d{3}/g)) {
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
  // The shared conformance corpus of spec/0.2/conformance: stale or invalid fails.
  try { counts.push(execFileSync('node', [join(root, 'scripts/spec2-conformance.mjs'), '--check'], { cwd: root, stdio: 'pipe' }).toString().trim()) }
  catch (error) { fail(`conformance: ${(error.stderr ?? '').toString().trim() || error.message}`) }
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
for (const row of data['table-marks']?.attributes ?? []) need(codes, row.report, `table-marks.json ${row.name}`, 'id of lint-rules.json')
for (const row of data['lint-rules']?.rules ?? []) need(codes, row.replaced_by, `lint-rules.json ${row.id}`, 'id of lint-rules.json')
// lint-model.json: every rule states a catalog row, reads only fields of the line model, names known sets and
// writes its patterns in the subset of C2-W-142.
{
  const model = data['lint-model'] ?? { line_fields: [], block_fields: [], inline_fields: [], rules: [] }
  // C2-W-149: the table fields are fields of the line and block records they apply to.
  const tableFields = (model.table_fields ?? []).map(field => field.name)
  const lineFields = new Set(model.line_fields.map(field => field.name).concat(['prev2', 'next2'], tableFields))
  const blockFields = new Set(model.block_fields.map(field => field.name).concat(tableFields))
  const inlineFields = new Set((model.inline_fields ?? []).map(field => field.name))
  const attributeFields = new Set((model.attribute_fields ?? []).map(field => field.name))
  const attributeOwnerFields = new Set((model.attribute_owner_fields ?? []).map(field => field.name))
  const idFields = new Set((model.id_fields ?? []).map(field => field.name))
  const containerFields = new Set(['type', 'content_column', 'marker_column'])
  const colonFields = new Set(['width', 'line', 'column', 'kind'])
  const sets = new Set(['text_leaves', 'verbatim_leaves', 'row_leaves'])
  const lineRecord = new Set(['prev', 'prev2', 'next', 'next2', 'leaf_next', 'leaf_head', 'line', 'last_line', 'table_above', 'table_below'])
  const checkPath = (path, over, lets, where) => {
    const [head, ...rest] = path.split('.')
    if (head === 'item') return
    const own = over === 'block' ? blockFields : over === 'inline' ? inlineFields : over === 'attribute' ? attributeFields : lineFields
    if (!own.has(head)) return fail(`${where}: reads ${path}, which no field of a ${over} record names`)
    if (rest.length === 0) return
    // An attribute record's owner is the only record field it has; the owner's node is read by name (C2-W-148).
    if (over === 'attribute') {
      if (head !== 'owner' || !attributeOwnerFields.has(rest[0])) fail(`${where}: reads ${path}, which no attribute owner field names`)
      else if (rest.length > 1 && rest[0] !== 'node') fail(`${where}: reads ${path}, which no attribute owner field names`)
      return
    }
    if (lineRecord.has(head) && !lineFields.has(rest[0])) fail(`${where}: reads ${path}, which no line field names`)
    if ((head === 'owner' || head === 'parent' || head === 'item_owner') && !containerFields.has(rest[0])) fail(`${where}: reads ${path}, which no owner field names`)
    if (head === 'open_colon' && rest.length > 1 && !colonFields.has(rest[1])) fail(`${where}: reads ${path}, which no colon container field names`)
  }
  const walkExpr = (expr, over, lets, where) => {
    if (Array.isArray(expr)) return expr.forEach(item => walkExpr(item, over, lets, where))
    if (expr === null || typeof expr !== 'object') return
    for (const [key, value] of Object.entries(expr)) {
      if (key === 'f' || key === 'has') checkPath(String(value), over, lets, where)
      else if (key === 'v' && !lets.has(value)) fail(`${where}: reads ${value}, which no let names`)
      else if (key === 'in' && typeof value[1] === 'string' && !sets.has(value[1])) fail(`${where}: names the set ${value[1]}, which this file does not define`)
      else if (key === 'matches' && /\(\?<?[=!]|\\[1-9]|\\k</.test(String(value[1]))) fail(`${where}: the pattern ${value[1]} uses lookaround or a backreference (C2-W-142)`)
      else if (key === 'pairs' && value[2] !== undefined && value[2] !== 'strict') fail(`${where}: the pair scan option ${value[2]} is not strict (C2-W-147)`)
      else if (key === 'lookup' && value?.over === 'id' && !idFields.has(String(value.field).split('.')[0])) fail(`${where}: reads the id field ${value.field}, which id_fields does not name (C2-W-150)`)
      // A message value may be named `count`, as in table-column-arity: only a list read with `in` is the operator.
      else if ((key === 'some' || key === 'count') && typeof value?.in === 'string') { checkPath(value.in, over, lets, where); walkExpr(value.where, over, lets, where); continue }
      if (key !== 'f' && key !== 'has' && key !== 'v') walkExpr(value, over, lets, where)
    }
  }
  // C2-W-139: a catalog row is stated as data or marked hand-written, never both, and only an active lint rule is either.
  const stated = new Set(model.rules.map(rule => rule.id))
  for (const row of data['lint-rules']?.rules ?? []) {
    const active = row.channel === 'lint' && (row.status === 'kept' || row.status === 'new')
    if (row.hand_written !== undefined && stated.has(row.id)) fail(`lint-rules.json ${row.id}: hand_written, but lint-model.json states the rule as data`)
    if ((row.hand_written !== undefined || stated.has(row.id)) && !active) fail(`lint-rules.json ${row.id}: data or hand_written, but no active lint rule`)
  }
  for (const rule of model.rules) {
    need(codes, rule.id, `lint-model.json ${rule.id}`, 'id of lint-rules.json')
    const lets = new Set(Object.keys(rule.let ?? {}))
    walkExpr([rule.let, rule.when, rule.each, rule.report, rule.range, rule.values], rule.over, lets, `lint-model.json ${rule.id}`)
  }
}
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

// The documents against each other: clause ids, example numbers, the count tables, the codes and the options.
const FENCE_LINE = /^\s*(`{3,}|~{3,})/
/** The lines of a document with every fenced line blanked, so examples do not count as prose. */
function prose(text) {
  let open = null
  return text.split('\n').map((line) => {
    const fence = FENCE_LINE.exec(line)
    if (open) {
      if (fence && fence[1][0] === open[0] && fence[1].length >= open.length && line.trim() === fence[1]) open = null
      return ''
    }
    if (fence) { open = fence[1]; return '' }
    return line
  })
}
const texts = Object.fromEntries(Object.keys(DOCUMENTS).map(name => [name, readDocument(name, DOCUMENTS[name]).text]))

// Every clause id cited anywhere exists, except one that a counts section names as deleted.
const cites = { ...Object.fromEntries(Object.entries(texts).map(([name, text]) => [`${name}.md`, text])) }
for (const name of ['UPGRADING.md', 'README.md', 'STATUS.md', 'data/README.md', 'trees/README.md', 'conformance/README.md']) cites[name] = readFileSync(join(root, 'spec/0.2', name), 'utf8')
for (const dir of ['data', 'data/schemas', 'trees', 'conformance']) {
  for (const name of execFileSync('git', ['ls-files', `spec/0.2/${dir}/*.json`], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean)) {
    if (dirname(name) === `spec/0.2/${dir}`) cites[name.slice('spec/0.2/'.length)] = readFileSync(join(root, name), 'utf8')
  }
}
const deleted = new Set()
for (const text of Object.values(texts)) {
  const counts = text.split(/^## Counts$/m)[1] ?? ''
  for (const line of counts.split('\n')) if (/\bdeleted\b/.test(line)) for (const match of line.replace(/Ids run to C2-[A-Z]-\d{3}/, '').matchAll(/C2-[A-Z]-\d{3}/g)) deleted.add(match[0])
}
for (const id of deleted) if (defined.has(id)) fail(`${id} is named as deleted and is still defined`)
for (const [name, text] of Object.entries(cites)) {
  const lines = text.split('\n')
  lines.forEach((line, at) => {
    for (const match of line.matchAll(/C2-[A-Z]-\d{3}/g)) {
      if (!defined.has(match[0]) && !deleted.has(match[0])) fail(`${name}:${at + 1}: cites ${match[0]}, which no document defines`)
    }
  })
}

// Example numbers are unique within a document.
for (const [name, text] of Object.entries(texts)) {
  const seen = new Set()
  for (const match of text.matchAll(/^Example (\d+) \(/gm)) {
    if (seen.has(match[1])) fail(`${name}.md: Example ${match[1]} stands twice`)
    seen.add(match[1])
  }
}

/** Clauses, exceptions and examples by status in each `##` section of a document. */
function sectionCounts(text) {
  const sections = new Map()
  let current = null
  for (const line of prose(text)) {
    const heading = /^## (.+)$/.exec(line)
    if (heading) { current = { clauses: 0, exceptions: 0, generated: 0, unverified: 0, verified: 0 }; sections.set(heading[1].trim(), current); continue }
    if (!current) continue
    const clause = /^\*\*(Exception )?C2-[A-Z]-\d{3}\*\*/.exec(line)
    if (clause) { current.clauses++; if (clause[1]) current.exceptions++ }
    const example = /^Example \d+ \((generated|unverified|verified)\b/.exec(line)
    if (example) current[example[1]]++
  }
  return sections
}
const sum = (rows) => rows.reduce((total, row) => {
  for (const key of Object.keys(row)) total[key] = (total[key] ?? 0) + row[key]
  return total
}, {})
// The rows of a counts table that stand for more than one section.
const GROUPS = {
  ast: { 'Further clauses and standard data namespaces': ['Further clauses', 'Standard data namespaces'] },
}
const COLUMNS = { Clauses: 'clauses', Exceptions: 'exceptions', 'Examples generated': 'generated', 'Examples unverified': 'unverified' }
for (const [name, text] of Object.entries(texts)) {
  const sections = sectionCounts(text)
  const total = sum([...sections.values()])
  const counts = text.split(/^## Counts$/m)[1]?.split(/^## /m)[0]
  if (counts === undefined) continue
  // The first table of the section; a later one, as the comparison of the inline chapter, is no count table.
  const lines = counts.split('\n')
  const first = lines.findIndex(line => line.startsWith('|'))
  const table = first < 0 ? [] : lines.slice(first, lines.findIndex((line, at) => at > first && !line.startsWith('|')))
  if (table.length) {
    const header = table[0].split('|').slice(1, -1).map(cell => cell.trim())
    const covered = new Set()
    for (const line of table.slice(2)) {
      const cells = line.split('|').slice(1, -1).map(cell => cell.trim().replaceAll('**', ''))
      const label = cells[0]
      let rows
      if (label === 'Total') rows = [...sections.values()]
      else if (GROUPS[name]?.[label]) rows = GROUPS[name][label].map(section => sections.get(section) ?? {})
      else if (sections.has(label)) rows = [sections.get(label)]
      else if (name === 'ast' && label === 'Existing AST contract') {
        const later = new Set(Object.values(GROUPS.ast).flat())
        rows = [...sections].filter(([section]) => !later.has(section)).map(([, row]) => row)
      } else { fail(`${name}.md counts: the row "${label}" names no section`); continue }
      if (label !== 'Total') rows.forEach(row => covered.add(row))
      const got = sum(rows)
      header.forEach((column, at) => {
        const key = COLUMNS[column] ?? (column === 'Examples' ? 'examples' : null)
        if (at === 0 || key === null) return
        const want = key === 'examples' ? (got.generated ?? 0) + (got.unverified ?? 0) + (got.verified ?? 0) : (got[key] ?? 0)
        if (Number(cells[at]) !== want) fail(`${name}.md counts: "${label}" ${column} says ${cells[at]}, the document holds ${want}`)
      })
    }
    for (const [section, row] of sections) if ((row.clauses || row.generated || row.unverified) && section !== 'Counts' && !covered.has(row)) fail(`${name}.md counts: no row for the section "${section}"`)
  }
  // The sentences that restate the totals.
  const examples = total.generated + total.unverified + total.verified
  const said = [
    [/has (\d+) clauses/, total.clauses], [/holds (\d+) clauses/, total.clauses], [/(\d+) of them (?:marked|exceptions)/, total.exceptions],
    [/and (\d+) exceptions? against/, total.exceptions], [/: \d+ rules and (\d+) exceptions?\./, total.exceptions], [/(\d+) rules and \d+ exceptions?\./, total.clauses - total.exceptions],
    [/and (\d+) examples/, examples], [/holds (\d+) examples/, examples], [/(\d+) generated and/, total.generated],
    [/(\d+) unverified\b/, total.unverified], [/(\d+) verified and/, total.verified],
  ]
  for (const line of counts.split('\n').filter(line => !line.startsWith('|'))) {
    for (const [pattern, want] of said) {
      const match = pattern.exec(line)
      if (match && Number(match[1]) !== want) fail(`${name}.md counts: "${match[0]}" says ${match[1]}, the document holds ${want}`)
    }
    if (/examples, all unverified/.test(line) && total.unverified !== examples) fail(`${name}.md counts: not every example is unverified`)
    const ids = /Ids run to (C2-[A-Z]-(\d{3}))/.exec(line)
    if (ids) {
      const prefix = ids[1].slice(0, 5)
      const last = Math.max(...[...defined].filter(id => id.startsWith(prefix)).map(id => Number(id.slice(5))))
      if (Number(ids[2]) !== last) fail(`${name}.md counts: ids run to ${prefix}${last}, not ${ids[1]}`)
      for (let n = 1; n <= last; n++) {
        const id = `${prefix}${String(n).padStart(3, '0')}`
        if (!defined.has(id) && !deleted.has(id)) fail(`${name}.md counts: ${id} is neither defined nor named as deleted`)
      }
    }
  }
}
const importCounts = /holds (\d+) element rows, (\d+) attribute rows, (\d+) conventions, (\d+) codes, (\d+) loss rows and (\d+) adapter rows/.exec(texts['import-html'])
if (!importCounts) fail('import-html.md counts: the sentence on the rows of data/import-html.json is missing')
else ['elements', 'attributes', 'conventions', 'codes', 'losses', 'adapters'].forEach((list, at) => {
  if (Number(importCounts[at + 1]) !== (data['import-html']?.[list] ?? []).length) fail(`import-html.md counts: ${list} says ${importCounts[at + 1]}, the data file holds ${(data['import-html']?.[list] ?? []).length}`)
})

// Codes: a code a clause reports with is in lint-rules.json, and every code there is named in a document.
const rules = new Map((data['lint-rules']?.rules ?? []).map(rule => [rule.id, rule]))
const CODE = '([a-z0-9]+(?:/[a-z0-9-]+|-[a-z0-9]+)+)'
const REPORTS = [
  new RegExp(`(?<!\` )(?:reported with|reported as|reports|report|reporting|the codes?|render-loss code|render loss) \`${CODE}\``, 'g'),
  new RegExp(`\`${CODE}\` (?:reports|is reported|in the (?:parse|render-loss|lint) channel)`, 'g'),
]
const named = new Set()
for (const [name, text] of Object.entries(texts)) {
  prose(text).forEach((line, at) => {
    for (const match of line.matchAll(new RegExp(`\`${CODE}\``, 'g'))) if (rules.has(match[1])) named.add(match[1])
    for (const pattern of REPORTS) for (const match of line.matchAll(pattern)) {
      if (!rules.has(match[1])) fail(`${name}.md:${at + 1}: reports \`${match[1]}\`, which lint-rules.json does not hold`)
    }
  })
}
for (const id of rules.keys()) if (!named.has(id)) fail(`lint-rules.json: ${id} is named by no document`)
// The writer's table of the parse and render-loss channels and the importer's codes in import-html.json agree with the catalog.
const channelTable = texts.writer.split('### The codes of the parse channel and of the render-loss channel')[1]?.split(/^### /m)[0] ?? ''
if (!channelTable) fail('writer.md: the table of the parse and render-loss channels is missing')
for (const line of channelTable.split('\n').filter(line => /^\| `/.test(line))) {
  const [codes, channel, severity] = line.split('|').slice(1, 4).map(cell => cell.trim())
  for (const match of codes.matchAll(/`([^`]+)`/g)) {
    const rule = rules.get(match[1])
    if (!rule) fail(`writer.md channel table: ${match[1]} is not in lint-rules.json`)
    else if (rule.channel !== channel || rule.severity !== severity) fail(`writer.md channel table: ${match[1]} is ${channel} ${severity}, lint-rules.json says ${rule.channel} ${rule.severity}`)
  }
}
for (const code of data['import-html']?.codes ?? []) {
  const rule = rules.get(code.id)
  if (!rule || rule.channel !== code.channel || rule.severity !== code.severity) fail(`import-html.json codes: ${code.id} differs from its row in lint-rules.json`)
}

// The option table of C2-H-137 lists the rows of options.json, with their kinds.
const optionTable = texts.html.split('**C2-H-137**')[1]?.split('\n\n')[1] ?? ''
const optionRows = optionTable.split('\n').slice(2).map(line => line.split('|').slice(1, 3).map(cell => cell.trim().replaceAll('`', '')))
const options = data.options?.options ?? []
if (optionRows.length !== options.length) fail(`html.md C2-H-137: ${optionRows.length} options in the table, ${options.length} in options.json`)
for (const [option, kind] of optionRows) {
  const row = options.find(entry => entry.name === option)
  const readers = row && (Array.isArray(row.read_by) ? row.read_by : [row.read_by])
  const kinds = row && [...new Set([row.kind, ...readers.filter(reader => reader === 'import')])]
  if (!row) fail(`html.md C2-H-137: ${option} is not in options.json`)
  else if (kind !== kinds.join(', ')) fail(`html.md C2-H-137: ${option} is of the kind ${kind}, options.json says ${kinds.join(', ')}`)
}

// tooling.md against cli.json: the commands, the flag table of each command, the categories, the calls and the entry fields.
const cli = data.cli ?? {}
const toolingTable = (text, header) => {
  const lines = text.split('\n')
  const start = lines.findIndex(line => line.startsWith(header))
  if (start < 0) return []
  const rows = []
  for (let at = start + 2; at < lines.length && lines[at].startsWith('|'); at++) rows.push(lines[at].split('|').slice(1, -1).map(cell => cell.trim()))
  return rows
}
const unquote = cell => cell.replace(/^`|`$/g, '')
const sameSet = (left, right, where) => {
  for (const name of left) if (!right.has(name)) fail(`${where}: ${name} is in tooling.md, not in cli.json`)
  for (const name of right) if (!left.has(name)) fail(`${where}: ${name} is in cli.json, not in tooling.md`)
}
const tooling = texts.tooling ?? ''
const commandNames = new Set((cli.commands ?? []).map(row => row.name))
sameSet(new Set(toolingTable(tooling, '| Command |').map(row => unquote(row[0]))), commandNames, 'tooling.md commands')
const specified = (cli.commands ?? []).filter(row => row.specified).map(row => row.name)
const listed = new Map()
const flagCells = []
const flagSection = (command, body) => {
  for (const row of toolingTable(body, '| Flag |')) {
    const flag = unquote(row[0]).replace(/^--/, '')
    if (!listed.has(flag)) listed.set(flag, new Set())
    listed.get(flag).add(command)
    flagCells.push({ command, flag, value: row[1], meaning: row[2] })
  }
}
for (const part of tooling.split(/^### /m).slice(1)) {
  const heading = part.split('\n')[0].trim()
  const body = part.split(/^## /m)[0]
  if (heading === 'Every command') for (const command of specified) flagSection(command, body)
  else {
    const command = /^`carve ([a-z-]+)`$/.exec(heading)?.[1]
    if (!command || !commandNames.has(command)) { fail(`tooling.md: the section "${heading}" names no command of cli.json`); continue }
    flagSection(command, body)
  }
}
const optionRowsByName = new Map((data.options?.options ?? []).map(row => [row.name, row]))
const FLAG_KINDS = { boolean: 'switch', count: 'count', enum: 'enum', list: 'json', map: 'json', structure: 'json' }
for (const row of cli.flags ?? []) {
  const where = `cli.json flags ${row.name}`
  const shown = [...(listed.get(row.name) ?? [])].sort()
  if (shown.join(',') !== row.commands.join(',')) fail(`${where}: the commands are ${row.commands.join(', ')}, the tables of tooling.md list it for ${shown.join(', ') || 'none'}`)
  for (const command of row.commands) if (!specified.includes(command)) fail(`${where}: ${command} is no specified command`)
  if (row.option !== undefined) {
    const option = optionRowsByName.get(row.option)
    if (!option) fail(`${where}: ${row.option} is not in options.json`)
    else {
      if (FLAG_KINDS[option.type] !== row.kind) fail(`${where}: the option ${row.option} is a ${option.type}, so the flag is a ${FLAG_KINDS[option.type]}`)
      if (row.kind === 'enum' && (option.values ?? []).join(',') !== (row.values ?? []).join(',')) fail(`${where}: the values differ from options.json`)
      const kebab = row.option.replaceAll(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
      if (kebab !== row.name) fail(`${where}: the option ${row.option} is spelled --${kebab} (C2-T-010)`)
      if (row.default !== undefined) fail(`${where}: a flag that sets an option takes the default of the option`)
    }
  }
  if ((row.kind === 'enum') !== (row.values !== undefined)) fail(`${where}: values belong to an enum flag and only to one`)
}
for (const flag of listed.keys()) if (!(cli.flags ?? []).some(row => row.name === flag)) fail(`tooling.md: --${flag} is not in cli.json flags`)
// The Value and Meaning cells of each flag table against its row: kind, values, default, repeatable, short form and option.
const tick = String.fromCharCode(96)
const valueCell = row => {
  if (row.kind === 'switch') return row.default === true ? 'switch, on' : 'switch'
  if (row.kind === 'enum') return row.values.map(value => tick + value + tick).join(', ')
  if (row.kind === 'json') return 'JSON'
  if (row.kind === 'count') return `count, ${row.default ?? optionRowsByName.get(row.option)?.default}`
  if (row.kind === 'code' || row.kind === 'file') return row.repeatable ? `${row.kind}, repeatable` : row.kind
  return row.kind
}
for (const cell of flagCells) {
  const row = (cli.flags ?? []).find(entry => entry.name === cell.flag)
  if (!row) continue
  const where = `tooling.md carve ${cell.command} --${cell.flag}`
  if (cell.value !== valueCell(row)) fail(`${where}: the value is "${cell.value}", cli.json gives "${valueCell(row)}"`)
  const option = new RegExp('the option ' + tick + '([A-Za-z]+)' + tick).exec(cell.meaning)?.[1]
  if (option !== row.option) fail(`${where}: the meaning names the option ${option ?? 'none'}, cli.json ${row.option ?? 'none'}`)
  if (row.short !== undefined && !cell.meaning.includes(tick + row.short + tick)) fail(`${where}: the meaning does not name the short form ${row.short}`)
}
const categoryRows = toolingTable(tooling, '| Status | Category |')
sameSet(new Set(categoryRows.map(row => unquote(row[1]))), new Set((cli.categories ?? []).map(row => row.name)), 'tooling.md categories')
for (const row of categoryRows) {
  const kept = (cli.categories ?? []).find(entry => entry.name === unquote(row[1]))
  if (!kept) continue
  if (String(kept.status) !== row[0]) fail(`tooling.md categories: ${kept.name} has status ${row[0]}, cli.json says ${kept.status}`)
  const errors = [...row[2].matchAll(/`([A-Za-z]+)`/g)].map(match => match[1]).sort()
  if (errors.join(',') !== [...kept.errors].sort().join(',')) fail(`tooling.md categories: ${kept.name} names other errors than cli.json`)
}
sameSet(new Set(toolingTable(tooling, '| Call |').map(row => unquote(row[0]))), new Set((cli.library ?? []).map(row => row.name)), 'tooling.md library')
const fieldRows = toolingTable(tooling, '| Field |')
sameSet(new Set(fieldRows.map(row => unquote(row[0]))), new Set((cli.entry_fields ?? []).map(row => row.name)), 'tooling.md entry fields')
for (const row of fieldRows) {
  const kept = (cli.entry_fields ?? []).find(entry => entry.name === unquote(row[0]))
  if (!kept) continue
  if ((row[2] === 'always') !== kept.always) fail(`tooling.md entry fields: ${kept.name} is present "${row[2]}", cli.json says always ${kept.always}`)
  if (row[2].startsWith('on the command line') === kept.library) fail(`tooling.md entry fields: ${kept.name} is present "${row[2]}", cli.json says library ${kept.library}`)
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
