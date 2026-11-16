// The tree fixtures of spec/0.2/trees: the gate of the tree document (ast.md, "The tree gate").
//   node scripts/spec2-trees.mjs --check
//   node scripts/spec2-trees.mjs --write PATH_TO_CARVE_JS   adds a tree for each example that has none
// --check validates every positive tree against data/ast-schema.json and the position
// invariants of the Positions section, checks that the example trees match the examples of the
// documents, that every node type and field occurs, and that each refused tree is refused as stated.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const spec = join(root, 'spec/0.2')
const dir = join(spec, 'trees')
const CHAPTERS = ['syntax-blocks', 'syntax-inline', 'html', 'writer']
// C2-A-027: the common fields, required once each anywhere rather than on every type.
const COMMON = new Set(['type', 'attrs', 'data', 'pos', 'segments', 'metadata', 'dir', 'lang'])
const failures = []
const fail = (message) => failures.push(message)

const HEADER = /^Example (\d+) \((?:generated|unverified)([^)]*)\)\s*$/
const FENCE = /^(`{3,}|~{3,})(\w*)\s*$/

/** The examples of a chapter that have a Carve input, with the parse options their flags set. */
function examplesOf(chapter) {
  const lines = readFileSync(join(spec, `${chapter}.md`), 'utf8').split('\n')
  const out = []
  for (let at = 0; at < lines.length; at++) {
    const header = HEADER.exec(lines[at])
    if (!header) continue
    let line = at + 1
    while (line < lines.length && !HEADER.test(lines[line]) && !FENCE.test(lines[line])) line++
    const open = FENCE.exec(lines[line] ?? '')
    if (!open || open[2] !== 'carve') continue
    let end = line + 1
    while (end < lines.length && lines[end] !== open[1]) end++
    const options = {}
    const ids = /--heading-ids (\w+)/.exec(header[2])
    if (ids) options.headingIds = ids[1]
    // The tree an example states, the first json fence before the next example, clause or heading.
    let json = end + 1
    while (json < lines.length && !HEADER.test(lines[json]) && !/^(\*\*|#)/.test(lines[json]) && lines[json] !== '```json') json++
    let stated
    if (lines[json] === '```json') {
      let close = json + 1
      while (close < lines.length && lines[close] !== '```') close++
      stated = JSON.parse(lines.slice(json + 1, close).join('\n'))
    }
    out.push({ id: `${chapter}-${header[1]}`, source: lines.slice(line + 1, end).join('\n'), options, stated })
  }
  return out
}

const withoutPositions = (value) => Array.isArray(value) ? value.map(withoutPositions)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'pos' && key !== 'segments').map(([key, item]) => [key, withoutPositions(item)]))
    : value
const sameJson = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b))
const sortKeys = (value) => Array.isArray(value) ? value.map(sortKeys)
  : value !== null && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys(value[key])])) : value

/** Whether the tree an example states, a node or a list of top-level nodes, is the fixture tree or a node of it. */
function statesTree(tree, stated) {
  const plain = withoutPositions(tree)
  if (Array.isArray(stated)) return sameJson(plain.children, stated)
  const queue = [plain]
  while (queue.length) {
    const node = queue.pop()
    if (sameJson(node, stated)) return true
    if (Array.isArray(node.children)) queue.push(...node.children.filter(child => child && typeof child === 'object'))
  }
  return false
}

const schema = JSON.parse(readFileSync(join(spec, 'data/ast-schema.json'), 'utf8'))
const NODE_TYPES = new Set(Object.keys(schema.$defs))
const isNode = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && NODE_TYPES.has(value.type)

/** Calls `visit(node, parentPos, path, ancestors)` for each node, and `list(nodes, path)` for each node list. */
function walk(value, visit, list, path = '', outer = null, ancestors = []) {
  if (Array.isArray(value)) {
    if (value.some(isNode)) list(value, path)
    value.forEach((item, at) => walk(item, visit, list, `${path}/${at}`, outer, ancestors))
    return
  }
  if (value === null || typeof value !== 'object') return
  let inner = outer
  let chain = ancestors
  if (isNode(value)) {
    visit(value, outer, path, ancestors)
    if (value.pos) inner = value.pos
    chain = [...ancestors, value]
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'data' || key === 'pos' || key === 'segments' || key === 'attrs') continue
    walk(child, visit, list, `${path}/${key}`, inner, chain)
  }
}

/** Line and column of every byte offset that starts a character, and the byte at each offset. */
function sourceTable(source) {
  const table = new Map([[0, [1, 1]]])
  const bytes = Buffer.from(source, 'utf8')
  let line = 1
  let column = 1
  let offset = 0
  for (const char of source) {
    offset += Buffer.byteLength(char, 'utf8')
    if (char === '\n') { line++; column = 1 } else column++
    table.set(offset, [line, column])
  }
  return { table, bytes }
}

const BREAKS = new Set(['soft_break', 'hard_break'])
// C2-A-158, C2-A-215: the types that may omit pos in a parsed tree; an empty `line` has no source character.
const UNPOSITIONED = new Set(['table_column', 'cell_paragraph', 'table_row', 'table_cell', 'text', 'table_head', 'table_body', 'table_foot'])
const NEVER_PARSED = new Set(['section', 'ruby', 'ruby_pair', 'small_caps'])
const inside = (a, b) => a.startOffset >= b.startOffset && a.endOffset <= b.endOffset

/** The first violation of C2-A-139 to C2-A-159 in a tree a parser built from `source`. */
function positionFailures(tree, source) {
  const { table, bytes } = sourceTable(source)
  const found = []
  walk(tree, (node, outer, path, ancestors) => {
    const where = `${path || '/'} (${node.type})`
    if (NEVER_PARSED.has(node.type)) found.push(`${where}: a parser never builds this type (C2-A-159)`)
    if (!('pos' in node)) {
      const inCell = ancestors.some(a => a.type === 'table_cell')
      const emptyLine = node.type === 'line' && node.children.length === 0
      if (node.type !== 'document' && !UNPOSITIONED.has(node.type) && !inCell && !emptyLine) found.push(`${where}: no pos (C2-A-158)`)
      return
    }
    const pos = node.pos
    if (pos === null || typeof pos !== 'object') return found.push(`${where}: pos is not an object (C2-A-139)`)
    if (pos.startOffset > pos.endOffset) return found.push(`${where}: start behind end (C2-A-143)`)
    if (pos.endOffset > bytes.length) return found.push(`${where}: end past the source (C2-A-143)`)
    const start = table.get(pos.startOffset)
    const end = table.get(pos.endOffset)
    if (!start || !end) return found.push(`${where}: an offset inside a character (C2-A-143)`)
    if (start[0] !== pos.startLine || start[1] !== pos.startColumn) found.push(`${where}: start line or column is not that of the offset (C2-A-143)`)
    if (end[0] !== pos.endLine || end[1] !== pos.endColumn) found.push(`${where}: end line or column is not that of the offset (C2-A-143)`)
    if (outer && !inside(pos, outer)) found.push(`${where}: outside its nearest positioned ancestor (C2-A-144)`)
    const first = bytes[pos.startOffset]
    if ((first === 0x0a || (first === 0x0d && bytes[pos.startOffset + 1] === 0x0a)) && !BREAKS.has(node.type) && pos.endOffset > pos.startOffset) {
      found.push(`${where}: starts at a line ending (C2-A-150)`)
    }
    if (Array.isArray(node.children) && pos.startOffset === pos.endOffset && !BREAKS.has(node.type)) {
      found.push(`${where}: a node with children is zero-width (C2-A-155)`)
    }
  }, (nodes, path) => {
    let last = null
    for (const node of nodes) {
      if (!isNode(node) || !node.pos) continue
      if (last && last.pos.endOffset > node.pos.startOffset) {
        const breaks = BREAKS.has(last.type) && BREAKS.has(node.type)
        const before = last.type === 'comment' && inside(last.pos, node.pos)
        const after = node.type === 'comment' && last.type === 'code_block' && inside(node.pos, last.pos)
        if (!breaks && !before && !after) found.push(`${path}: ${last.type} overlaps ${node.type} (C2-A-145)`)
      }
      last = node
    }
  })
  return found
}

const ajv = new Ajv2020({ strict: true, allErrors: false })
const validate = ajv.compile(schema)
const read = (name) => JSON.parse(readFileSync(join(dir, name), 'utf8'))
const exampleFile = (chapter) => `examples-${chapter}.json`

if (process.argv[2] === '--write') {
  const engineRoot = resolve(process.argv[3] ?? '')
  if (!process.argv[3]) throw new Error('pass the path of a carve-js next2 checkout')
  const { parse, encodeTree } = await import(pathToFileURL(join(engineRoot, 'v2/src/index.ts')).href)
  for (const chapter of CHAPTERS) {
    const path = join(dir, exampleFile(chapter))
    const kept = existsSync(path) ? new Map(read(exampleFile(chapter)).trees.map(entry => [entry.id, entry])) : new Map()
    const trees = examplesOf(chapter).map(({ id, source, options }) => {
      const old = kept.get(id)
      if (old && old.source === source) return old
      const entry = { id, source }
      if (Object.keys(options).length) entry.options = options
      entry.tree = JSON.parse(encodeTree(parse(source, options)))
      return entry
    })
    const body = trees.map(entry => `  ${JSON.stringify(entry)}`).join(',\n')
    writeFileSync(path, `{\n "description": "The tree of each example of ${chapter}.md that has a Carve input, with positions. See README.md.",\n "trees": [\n${body}\n ]\n}\n`)
    console.log(`${exampleFile(chapter)}: ${trees.length} trees`)
  }
  process.exit(0)
}

// --check
const seenTypes = new Set()
const seenFields = new Set()
function cover(tree) {
  walk(tree, (node) => {
    seenTypes.add(node.type)
    for (const key of Object.keys(node)) seenFields.add(COMMON.has(key) ? key : `${node.type}.${key}`)
  }, () => {})
}
function checkPositive(entry, file) {
  const label = `${file} ${entry.id}`
  if (!validate(entry.tree)) {
    const error = validate.errors[0]
    return fail(`${label}: the schema refuses the tree at ${error.instancePath || '/'}: ${error.message}`)
  }
  cover(entry.tree)
  if (typeof entry.source === 'string') for (const failure of positionFailures(entry.tree, entry.source)) fail(`${label}: ${failure}`)
}

let positive = 0
for (const chapter of CHAPTERS) {
  const file = exampleFile(chapter)
  if (!existsSync(join(dir, file))) { fail(`${file}: missing`); continue }
  const trees = read(file).trees
  const byId = new Map(trees.map(entry => [entry.id, entry]))
  const examples = examplesOf(chapter)
  for (const example of examples) {
    const entry = byId.get(example.id)
    if (!entry) fail(`${file}: no tree for ${example.id}`)
    else if (entry.source !== example.source) fail(`${file} ${example.id}: the source differs from the example in ${chapter}.md`)
    else if (example.stated !== undefined && !statesTree(entry.tree, example.stated)) fail(`${file} ${example.id}: the tree differs from the one the example states`)
  }
  const ids = new Set(examples.map(example => example.id))
  for (const entry of trees) {
    if (!ids.has(entry.id)) fail(`${file} ${entry.id}: no such example in ${chapter}.md`)
    checkPositive(entry, file)
    positive++
  }
}
const nodes = existsSync(join(dir, 'nodes.json')) ? read('nodes.json').trees : (fail('nodes.json: missing'), [])
for (const entry of nodes) { checkPositive(entry, 'nodes.json'); positive++ }

for (const type of NODE_TYPES) if (!seenTypes.has(type)) fail(`no positive tree holds a ${type}`)
for (const [type, definition] of Object.entries(schema.$defs)) {
  for (const field of Object.keys(definition.properties ?? {})) {
    if (!COMMON.has(field) && !seenFields.has(`${type}.${field}`)) fail(`no positive tree holds ${type}.${field}`)
  }
}
for (const field of COMMON) if (!seenFields.has(field)) fail(`no positive tree holds the common field ${field}`)

// A refused tree names its clause and who refuses it: the schema, or the reader beyond the schema.
const refused = existsSync(join(dir, 'refused.json')) ? read('refused.json').trees : (fail('refused.json: missing'), [])
const clauseText = ['ast', 'extensions', 'syntax-blocks', 'syntax-inline', 'includes'].map(name => readFileSync(join(spec, `${name}.md`), 'utf8')).join('\n')
for (const entry of refused) {
  const label = `refused.json ${entry.id}`
  for (const clause of entry.clauses ?? []) if (!clauseText.includes(`**${clause}**`) && !clauseText.includes(`**Exception ${clause}**`)) fail(`${label}: cites ${clause}, which no document defines`)
  if (!entry.clauses?.length || !entry.reason) fail(`${label}: needs clauses and a reason`)
  const accepted = validate(entry.tree)
  if (entry.refusedBy === 'schema' && accepted) fail(`${label}: the schema accepts it, but the fixture says the schema refuses it`)
  else if (entry.refusedBy === 'reader' && !accepted) fail(`${label}: the schema refuses it, so refusedBy is schema`)
  else if (entry.refusedBy !== 'schema' && entry.refusedBy !== 'reader') fail(`${label}: refusedBy is schema or reader`)
}

if (failures.length) {
  console.error(`spec 0.2 trees: ${failures.length} failures\n  ${failures.slice(0, 400).join('\n  ')}`)
  process.exit(1)
}
console.log(`spec 0.2 trees: ${positive} positive trees (${NODE_TYPES.size} node types, ${seenFields.size} fields), ${refused.length} refused trees`)
