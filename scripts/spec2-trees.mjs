// The tree fixtures of spec/0.2/trees: the gate of the tree document (ast.md, "The tree gate").
//   node scripts/spec2-trees.mjs --check
//   node scripts/spec2-trees.mjs --write PATH_TO_CARVE_JS   adds a tree for each example that has none
// --check validates every positive tree against data/ast-schema.json and the position
// invariants of the Positions section, checks that the example trees match the examples of the
// documents, that every node type and field occurs, and that each refused tree is refused as stated.
// It also runs the reader checks that the script can state beyond the schema (C2-A-188, scripts/lib/spec2-reader.mjs)
// on every positive and imported tree, which must pass them, and on every tree refused by the reader, which
// must break one that cites a clause of its entry.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { examplesOf as extractExamples } from './lib/spec2-examples.mjs'
import { readerChecks, refusedNodePath } from './lib/spec2-reader.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const spec = join(root, 'spec/0.2')
const dir = join(spec, 'trees')
const CHAPTERS = ['syntax-blocks', 'syntax-inline', 'html', 'writer']
// C2-A-027: the common fields, required once each anywhere rather than on every type.
const COMMON = new Set(['type', 'attrs', 'data', 'pos', 'segments', 'metadata', 'dir', 'lang'])
const failures = []
const fail = (message) => failures.push(message)

// The examples come from the one extractor that the conformance corpus also reads.
const examples = (document) => extractExamples(spec, document)

/** The examples of a chapter that have a Carve input, with the parse options their flags set and the tree they state. */
function examplesOf(chapter) {
  return examples(chapter).filter(example => example.fences[0]?.lang === 'carve').map(example => {
    const options = {}
    const ids = example.flags.map(flag => /^--heading-ids (\w+)$/.exec(flag)).find(Boolean)
    if (ids) options.headingIds = ids[1]
    const json = example.fences.find(fence => fence.lang === 'json')
    return { id: `${chapter}-${example.number}`, source: example.fences[0].body, options, stated: json ? JSON.parse(json.body) : undefined }
  })
}

// The flags of an include example that change its tree; `null` for those that change only the render.
const INCLUDE_FLAGS = new Map([
  ['with the depth limit lowered to 1', { depth: 1 }],
  ['sourceLines on', null],
  ['profile set to comment', null],
])

/** The examples of includes.md: the files, the entry source, the include settings and the stated tree. */
function includeExamples() {
  const out = []
  for (const example of examples('includes')) {
    const id = `includes-${example.number}`
    const includes = {}
    for (const flag of example.flags) {
      if (!INCLUDE_FLAGS.has(flag)) fail(`includes.md Example ${example.number}: unknown flag "${flag}"`)
      else Object.assign(includes, INCLUDE_FLAGS.get(flag))
    }
    // includes.md, conventions: the resolver serves the files of the example under their names; a file is the
    // body of its fence and a final line feed, or the bytes its line names.
    const files = {}
    for (const [name, file] of Object.entries(example.files)) {
      if (file.text !== undefined) { files[name] = file.text; continue }
      const buffer = Buffer.from(file.bytes.replaceAll(' ', ''), 'hex')
      const text = buffer.toString('utf8')
      if (!Buffer.from(text, 'utf8').equals(buffer)) fail(`includes.md Example ${example.number}: the bytes of ${name} are not UTF-8`)
      files[name] = text
    }
    const source = example.fences.find(fence => fence.lang === 'carve')?.body
    const json = example.fences.find(fence => fence.lang === 'json')
    if (source === undefined) { fail(`includes.md Example ${example.number}: no Carve input`); continue }
    out.push({ id, files, source, options: Object.keys(includes).length ? { includes } : undefined, stated: json ? JSON.parse(json.body) : undefined })
  }
  return out
}

/** The examples of import-html.md: the HTML input, the import flags and the stated children of the document. */
function importExamples() {
  const out = []
  for (const example of examples('import-html')) {
    const label = `import-html.md Example ${example.number}`
    const options = {}
    for (const flag of example.flags) {
      if (flag === 'import option rawHtml on') options.rawHtml = true
      else if (/^import option adapter set to [\w-]+$/.test(flag)) options.adapter = flag.split(' ').at(-1)
      else fail(`${label}: unknown flag "${flag}"`)
    }
    const [html, json, carve] = example.fences
    if (example.fences.length !== 3 || html.lang !== 'html' || json.lang !== 'json' || carve.lang !== 'carve') {
      fail(`${label}: needs an html, a json and a carve fence, in that order`)
      continue
    }
    out.push({ id: `import-html-${example.number}`, html: html.body, options, children: JSON.parse(json.body) })
  }
  return out
}

/** Whether `actual` holds every field that `expected` names, with lists of the same length. */
function holds(actual, expected) {
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length && expected.every((item, at) => holds(actual[at], item))
  if (expected === null || typeof expected !== 'object') return actual === expected
  return actual !== null && typeof actual === 'object' && !Array.isArray(actual)
    && Object.entries(expected).every(([key, item]) => holds(actual[key], item))
}

/** includes.md, conventions: a stated tree leaves out the nodes it is not about, so it is the tree or a node of it in part. */
function statesPart(tree, stated) {
  const queue = [tree]
  while (queue.length) {
    const node = queue.pop()
    if (holds(node, stated)) return true
    if (Array.isArray(node.children)) queue.push(...node.children.filter(child => child && typeof child === 'object'))
  }
  return false
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

/**
 * The first violation of C2-A-139 to C2-A-159 in a tree a parser built from `source`, or from the entry
 * source and the included `files`: positions are local to the file that `pos.file` names (C2-N-019).
 */
function positionFailures(tree, source, files = {}) {
  const tables = new Map([[undefined, sourceTable(source)]])
  for (const [id, text] of Object.entries(files)) tables.set(id, sourceTable(text))
  const found = []
  // C2-A-142: a node under the children of an include is in the include's file; its other slots are not.
  const fileOf = new Map()
  const assign = (value, file) => {
    if (Array.isArray(value)) return value.forEach(item => assign(item, file))
    if (value === null || typeof value !== 'object') return
    if (isNode(value)) fileOf.set(value, file)
    for (const [key, child] of Object.entries(value)) {
      if (key === 'data' || key === 'pos' || key === 'segments' || key === 'attrs') continue
      assign(child, isNode(value) && value.type === 'include' && key === 'children' ? value.file : file)
    }
  }
  assign(tree, undefined)
  walk(tree, (node, _outer, path, ancestors) => {
    const where = `${path || '/'} (${node.type})`
    if (NEVER_PARSED.has(node.type)) found.push(`${where}: a parser never builds this type (C2-A-159)`)
    if (!('pos' in node)) {
      const inCell = ancestors.some(a => a.type === 'table_cell')
      const emptyLine = node.type === 'line' && node.children.length === 0
      // C2-N-073: the caption that an expanded code include copies into its child.
      const chain = [...ancestors, node]
      const copied = chain.some((a, at) => a.type === 'caption' && at >= 2 && chain[at - 2].type === 'include' && chain[at - 2].caption && chain[at - 1].caption === a)
      if (node.type !== 'document' && !UNPOSITIONED.has(node.type) && !inCell && !emptyLine && !copied) found.push(`${where}: no pos (C2-A-158)`)
      return
    }
    const pos = node.pos
    if (pos === null || typeof pos !== 'object') return found.push(`${where}: pos is not an object (C2-A-139)`)
    if (pos.file !== fileOf.get(node)) return found.push(`${where}: pos.file is not the file of the include that holds it (C2-A-142)`)
    if (!tables.has(pos.file)) return found.push(`${where}: pos.file names no file of the example (C2-A-142)`)
    const { table, bytes } = tables.get(pos.file)
    const outer = ancestors.findLast(a => a.pos && a.pos.file === pos.file)?.pos
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
const readerProblems = readerChecks(spec)
const read = (name) => JSON.parse(readFileSync(join(dir, name), 'utf8'))
const exampleFile = (chapter) => `examples-${chapter}.json`
const INCLUDE_FILE = exampleFile('includes')
// includes.md, conventions: the resolver serves exactly the files of the example and returns each name as its id.
const fixtureResolver = (files) => (request) => Object.hasOwn(files, request.path) ? { text: files[request.path], id: request.path } : { error: 'not_found' }

if (process.argv[2] === '--write') {
  const engineRoot = resolve(process.argv[3] ?? '')
  if (!process.argv[3]) throw new Error('pass the path of a carve-js next2 checkout')
  const { parse, encodeTree } = await import(pathToFileURL(join(engineRoot, existsSync(join(engineRoot, 'v2/src/index.ts')) ? 'v2/src/index.ts' : 'src/index.ts')).href)
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
  const path = join(dir, INCLUDE_FILE)
  const kept = existsSync(path) ? new Map(read(INCLUDE_FILE).trees.map(entry => [entry.id, entry])) : new Map()
  const trees = includeExamples().map(({ id, files, source, options }) => {
    const old = kept.get(id)
    if (old && old.source === source && sameJson(old.files, files) && sameJson(old.options, options)) return old
    const entry = { id, files, source }
    if (options) entry.options = options
    entry.tree = JSON.parse(encodeTree(parse(source, { includes: { resolver: fixtureResolver(files), ...options?.includes } })))
    return entry
  })
  const body = trees.map(entry => `  ${JSON.stringify(entry)}`).join(',\n')
  writeFileSync(path, `{\n "description": "The expanded tree of each example of includes.md, with positions local to each file, from a resolver that serves the files of the example. See README.md.",\n "trees": [\n${body}\n ]\n}\n`)
  console.log(`${INCLUDE_FILE}: ${trees.length} trees`)
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
  for (const problem of readerProblems(entry.tree)) fail(`${label}: a reader refuses it at ${problem.path}: ${problem.what} (${problem.clause})`)
  if (typeof entry.source === 'string') for (const failure of positionFailures(entry.tree, entry.source, entry.files)) fail(`${label}: ${failure}`)
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
// includes.md: one expanded tree per example, from the files the example names.
if (!existsSync(join(dir, INCLUDE_FILE))) fail(`${INCLUDE_FILE}: missing`)
else {
  const trees = read(INCLUDE_FILE).trees
  const byId = new Map(trees.map(entry => [entry.id, entry]))
  const examples = includeExamples()
  for (const example of examples) {
    const entry = byId.get(example.id)
    if (!entry) fail(`${INCLUDE_FILE}: no tree for ${example.id}`)
    else if (entry.source !== example.source || !sameJson(entry.files, example.files) || !sameJson(entry.options, example.options)) {
      fail(`${INCLUDE_FILE} ${example.id}: the source, the files or the options differ from the example in includes.md`)
    } else if (example.stated !== undefined && !statesPart(entry.tree, example.stated)) fail(`${INCLUDE_FILE} ${example.id}: the tree differs from the one the example states`)
  }
  const ids = new Set(examples.map(example => example.id))
  for (const entry of trees) {
    if (!ids.has(entry.id)) fail(`${INCLUDE_FILE} ${entry.id}: no such example in includes.md`)
    if (!entry.tree.stages?.includes('includeExpansion')) fail(`${INCLUDE_FILE} ${entry.id}: the stages do not name includeExpansion (C2-N-006)`)
    checkPositive(entry, INCLUDE_FILE)
    positive++
  }
}

// import-html.md: the children an example states are those of a valid tree with no positions (C2-M-001).
let imported = 0
for (const example of importExamples()) {
  const label = `import-html.md ${example.id}`
  const tree = { type: 'document', astVersion: '2.0', children: example.children }
  if (!Array.isArray(example.children)) { fail(`${label}: the json fence is not a list of blocks`); continue }
  if (JSON.stringify(example.children).includes('"pos"')) fail(`${label}: an imported tree states no positions`)
  checkPositive({ id: example.id, tree }, 'import-html.md')
  imported++
}

// C2-L-023: example pairs whose trees are equal under C2-A-162 (positions and srcByteLength skipped).
const EQUAL_TREES = [['syntax-blocks-267', 'syntax-blocks-268']]
const exampleTrees = new Map(CHAPTERS.flatMap(chapter => existsSync(join(dir, exampleFile(chapter))) ? read(exampleFile(chapter)).trees : []).map(entry => [entry.id, entry.tree]))
const forEquality = (tree) => { const plain = withoutPositions(tree); delete plain.srcByteLength; return plain }
for (const [a, b] of EQUAL_TREES) {
  if (!exampleTrees.has(a) || !exampleTrees.has(b)) fail(`equal trees: ${a} or ${b} has no tree`)
  else if (!sameJson(forEquality(exampleTrees.get(a)), forEquality(exampleTrees.get(b)))) fail(`equal trees: ${a} and ${b} differ (C2-L-023)`)
}

// layouts.json: sidecars the layout schema accepts or refuses, and the range invariants of C2-L-012 and C2-L-056.
const layoutSchema = JSON.parse(readFileSync(join(spec, 'data/layout-schema.json'), 'utf8'))
const validateLayout = new Ajv2020({ strict: true, allErrors: false }).compile(layoutSchema)
const layouts = existsSync(join(dir, 'layouts.json')) ? read('layouts.json') : (fail('layouts.json: missing'), { layouts: [] })
// The reader checks of C2-L-058 that the schema cannot express.
function layoutProblems (layout) {
  const problems = []
  const bytes = layout.encoding === 'base64' ? Buffer.from(layout.source, 'base64') : Buffer.from(layout.source, 'utf8')
  if (layout.encoding === 'base64' && Buffer.from(bytes.toString('utf8'), 'utf8').equals(bytes)) problems.push('base64 holds well-formed UTF-8, which C2-L-056 writes as utf-8')
  const paths = new Set()
  for (const node of layout.nodes) {
    if (paths.has(node.path)) problems.push(`${node.path} has two entries (C2-L-011)`)
    paths.add(node.path)
    if (node.startByte > node.endByte || node.endByte > bytes.length) problems.push(`${node.path} has a range outside the input (C2-L-012)`)
    if (('openerRaw' in node) !== ('closerRaw' in node) || node.openerRaw === '') problems.push(`${node.path} breaks the delimiter pair (C2-L-027)`)
    const lines = (node.wraps ?? []).map(wrap => wrap.line)
    if (lines.some((line, i) => i > 0 && line < lines[i - 1])) problems.push(`${node.path} has unsorted wraps (C2-L-020)`)
  }
  return { problems, bytes }
}
for (const entry of layouts.layouts) {
  const label = `layouts.json ${entry.id}`
  if (!entry.clauses?.length) fail(`${label}: needs clauses`)
  const accepted = validateLayout(entry.layout)
  if (entry.refused === 'reader') {
    if (!accepted) fail(`${label}: the layout schema refuses it, so refused is true`)
    else if (!layoutProblems(entry.layout).problems.length) fail(`${label}: no reader check of C2-L-058 refuses it`)
    continue
  }
  if (entry.refused) { if (accepted) fail(`${label}: the layout schema accepts it, but the fixture says it is refused`); continue }
  if (!accepted) { fail(`${label}: the layout schema refuses it at ${validateLayout.errors[0].instancePath || '/'}: ${validateLayout.errors[0].message}`); continue }
  const { problems, bytes } = layoutProblems(entry.layout)
  for (const problem of problems) fail(`${label}: ${problem}`)
  if (entry.input !== undefined && !Buffer.from(entry.input.replaceAll(' ', ''), 'hex').equals(bytes)) fail(`${label}: source is not the input bytes`)
}

const metadataBlocks = existsSync(join(dir, 'metadata-blocks.json')) ? read('metadata-blocks.json').trees : (fail('metadata-blocks.json: missing'), [])
for (const entry of metadataBlocks) { checkPositive(entry, 'metadata-blocks.json'); positive++ }

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
  if (entry.refusedBy === 'schema' && entry.path !== undefined) fail(`${label}: path is stated only for a tree the reader refuses`)
  if (entry.refusedBy === 'reader' && accepted) {
    const isEnvelope = entry.tree.type === undefined && entry.tree.document
    const found = isEnvelope ? readerProblems(entry.tree.document, { envelope: entry.tree }) : readerProblems(entry.tree)
    if (entry.path !== undefined && refusedNodePath(entry, readerProblems) !== entry.path) fail(`${label}: path is ${entry.path}, but the reader check that cites its clause refuses it at ${refusedNodePath(entry, readerProblems)}`)
    if (!found.some(problem => entry.clauses.includes(problem.clause))) {
      fail(`${label}: no reader check of the gate that cites ${entry.clauses.join(' or ')} refuses it${found.length ? ` (found: ${found.map(p => p.clause).join(', ')})` : ''}`)
    }
  }
}

if (failures.length) {
  console.error(`spec 0.2 trees: ${failures.length} failures\n  ${failures.slice(0, 400).join('\n  ')}`)
  process.exit(1)
}
console.log(`spec 0.2 trees: ${positive} positive trees and ${imported} imported trees (${NODE_TYPES.size} node types, ${seenFields.size} fields), ${refused.length} refused trees, ${layouts.layouts.length} layouts, ${EQUAL_TREES.length} equal pair`)
