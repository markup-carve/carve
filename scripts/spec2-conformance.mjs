// The shared conformance corpus of spec/0.2/conformance.
//   node scripts/spec2-conformance.mjs --write   regenerates examples.json and refused-trees.json
//   node scripts/spec2-conformance.mjs --check   fails when either file is stale, and checks every file
//                                                 against schema.json and clause-cases.json against the documents
// examples.json and refused-trees.json are generated from the documents and the tree fixtures; clause-cases.json
// is curated by hand. See spec/0.2/conformance/README.md.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { allExamples } from './lib/spec2-examples.mjs'
import { readerChecks, refusedNodePath } from './lib/spec2-reader.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const spec = join(root, 'spec/0.2')
const dir = join(spec, 'conformance')
const failures = []
const fail = (message) => failures.push(message)
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

const rules = readJson(join(spec, 'data/lint-rules.json')).rules
const codes = new Set(rules.map(rule => rule.id))
const ruleChannel = new Map(rules.map(rule => [rule.id, rule.channel]))
const optionRows = new Map(readJson(join(spec, 'data/options.json')).options.map(row => [row.name, row]))
const extensionRows = readJson(join(spec, 'data/extensions.json')).extensions
const fixtureTrees = new Map()
for (const chapter of ['syntax-blocks', 'syntax-inline', 'html', 'writer', 'includes']) {
  for (const entry of readJson(join(spec, 'trees', `examples-${chapter}.json`)).trees) fixtureTrees.set(entry.id, entry.tree)
}

// The flags beside an example's status, as options. `null` marks a flag that names no option.
const FLAGS = [
  [/^--roundtrip$/, () => ({ roundtrip: true })],
  [/^--profile (\w+)$/, (m) => ({ profile: m[1] })],
  [/^--mode (\w+)$/, (m) => ({ mode: m[1] })],
  [/^profile set to (\w+)$/, (m) => ({ profile: m[1] })],
  [/^--no-raw-html$/, () => ({ rawHtml: false })],
  [/^--heading-ids (\S+)$/, (m) => ({ headingIds: m[1] })],
  [/^--align-tables$/, () => ({ alignTables: true })],
  [/^--social (\{.*\})$/, (m) => ({ social: JSON.parse(m[1]) })],
  [/^urlPolicy set to (\{.*\})$/, (m) => ({ urlPolicy: JSON.parse(m[1]) })],
  [/^sourceLines on$/, () => ({ sourceLines: true })],
  [/^with the depth limit lowered to (\d+)$/, (m) => ({ includes: { depth: Number(m[1]) } })],
  [/^import option rawHtml on$/, () => ({ rawHtml: true })],
  [/^import option adapter set to ([\w-]+)$/, (m) => ({ adapter: m[1] })],
]
function optionsOf(example) {
  const options = {}
  for (const flag of example.flags) {
    const rule = FLAGS.find(([pattern]) => pattern.test(flag))
    if (!rule) { fail(`${example.document}.md Example ${example.number}: unknown flag "${flag}"`); continue }
    Object.assign(options, rule[1](rule[0].exec(flag)))
  }
  return options
}

// What each document's conventions say a status means.
const GENERATED = {
  writer: 'the written source was produced by carve fmt of the 0.1 reference engine, because the 0.2 rule equals 0.1 behavior for that input (writer.md, conventions)',
  default: 'the HTML was produced by the 0.1 reference engine, because the 0.2 rule equals 0.1 behavior for that input (conventions of the document)',
}
const UNVERIFIED = {
  writer: 'the written source was written by hand from the clauses (writer.md, conventions)',
  includes: 'the fixture trees come from the reference engine, and the HTML is written by hand and not machine-checked (includes.md, conventions)',
  'import-html': 'the reference importer differs: the tree and the report were written by hand from the clauses, and the source was produced by the 0.2 writer from that tree (import-html.md, conventions)',
  default: 'the HTML was written by hand from the clauses and has not been run through any engine (conventions of the document)',
}
const VERIFIED = { 'import-html': 'the reference importer at carve-js next2 commit 0266e137 gives this tree and this source and reports the codes of the Reported line (import-html.md, conventions)' }

function statusOf(example) {
  if (example.status === 'generated') return { status: 'verified', reason: GENERATED[example.document] ?? GENERATED.default }
  if (example.status === 'verified') return { status: 'verified', reason: VERIFIED[example.document] }
  return { status: 'unverified', reason: UNVERIFIED[example.document] ?? UNVERIFIED.default }
}

// The codes of the example's `Reported:` line, in their order; no code is taken from other prose.
function diagnosticsOf(example) {
  const named = example.reported.flatMap(line => [...line.matchAll(/`([a-z0-9/-]+)`/g)].map(m => m[1]))
  for (const code of named) if (!codes.has(code)) fail(`${example.document}.md Example ${example.number}: the Reported line names ${code}, which data/lint-rules.json does not list`)
  return [...new Set(named)]
}

// A written source ends with one line ending (C2-W-022); a fence body holds no final line feed.
const sourceOf = (fence) => fence === undefined ? undefined : `${fence.body}\n`

// blocks Example 247 states its input in prose.
const DESCRIBED = { 'syntax-blocks-247': { input: `${'> '.repeat(201)}x`, htmlIncludes: '<p>&gt; x</p>', note: 'input and output stated in prose: 200 nested quotes, the innermost holds <p>&gt; x</p>' } }

function entryOf(example) {
  const id = `${example.document}-${example.number}`
  const entry = { id, document: `${example.document}.md`, number: example.number, section: example.section, clauses: example.clauses, clauseScope: example.clauseScope, kind: null }
  const options = optionsOf(example)
  const expected = {}
  const fences = example.fences
  const byLang = (lang) => fences.filter(fence => fence.lang === lang)
  if (example.document === 'import-html') {
    entry.kind = 'import'
    entry.html = byLang('html')[0]?.body
    expected.children = JSON.parse(byLang('json')[0]?.body ?? 'null')
    expected.carve = sourceOf(byLang('carve')[0])
  } else if (example.document === 'writer') {
    // An example with an input and no written source states only what lint reports (writer Example 8).
    entry.kind = fences[1] ? 'write' : 'lint'
    entry.input = fences[0]?.body
    if (fences[1]) expected.carve = sourceOf(fences[1])
  } else if (example.document === 'includes') {
    entry.kind = 'include'
    entry.files = Object.fromEntries(Object.entries(example.files).map(([name, file]) => [name, file.bytes ? { bytes: file.bytes } : { text: file.text }]))
    entry.input = byLang('carve')[0]?.body
    if (byLang('html')[0]) expected.html = byLang('html')[0].body
  } else {
    entry.kind = 'render'
    entry.input = byLang('carve')[0]?.body ?? DESCRIBED[id]?.input
    if (byLang('html')[0]) expected.html = byLang('html')[0].body
    if (DESCRIBED[id]?.htmlIncludes) expected.htmlIncludes = DESCRIBED[id].htmlIncludes
  }
  if (fixtureTrees.has(id)) expected.tree = fixtureTrees.get(id)
  const diagnostics = diagnosticsOf(example)
  if (diagnostics.length) expected.diagnostics = diagnostics
  entry.options = options
  entry.expected = expected
  Object.assign(entry, statusOf(example))
  if (DESCRIBED[id]) entry.note = DESCRIBED[id].note
  if (entry.input === undefined && entry.html === undefined) fail(`${id}: no input`)
  if (!Object.keys(expected).length) fail(`${id}: no expected result`)
  return entry
}

function build() {
  const examples = allExamples(spec).map(entryOf)
  const refused = readJson(join(spec, 'trees/refused.json')).trees.map(({ id, clauses, reason, refusedBy, path, tree }) => ({ id, clauses, reason, refusedBy, ...(path === undefined ? {} : { path }), tree }))
  return {
    'examples.json': { $schema: './schema.json', kind: 'examples', description: 'Every example of the ten 0.2 documents, generated by scripts/spec2-conformance.mjs. Do not edit. See README.md.', examples },
    'refused-trees.json': { $schema: './schema.json', kind: 'refused-trees', description: 'The trees a 2.0 reader refuses, from trees/refused.json, generated by scripts/spec2-conformance.mjs. Do not edit. See README.md.', trees: refused },
  }
}
const serialize = (value) => `${JSON.stringify(value, null, 1)}\n`

const built = build()
if (process.argv[2] === '--write') {
  if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
  for (const [name, value] of Object.entries(built)) writeFileSync(join(dir, name), serialize(value))
  console.log(`conformance: ${built['examples.json'].examples.length} examples, ${built['refused-trees.json'].trees.length} refused trees written`)
  process.exit(0)
}

for (const [name, value] of Object.entries(built)) {
  const path = join(dir, name)
  if (!existsSync(path) || readFileSync(path, 'utf8') !== serialize(value)) fail(`${name}: stale; run node scripts/spec2-conformance.mjs --write`)
}

// Every file against the one schema.
const ajv = new Ajv2020({ strict: true, allErrors: false })
const validate = ajv.compile(readJson(join(dir, 'schema.json')))
const cases = existsSync(join(dir, 'clause-cases.json')) ? readJson(join(dir, 'clause-cases.json')) : (fail('clause-cases.json: missing'), { cases: [] })
for (const [name, value] of [...Object.entries(built), ['clause-cases.json', cases]]) {
  if (!validate(value)) fail(`${name}: the schema refuses it at ${validate.errors[0].instancePath || '/'}: ${validate.errors[0].message}`)
}

// The schema names every option of data/options.json, and each value is one the option takes.
const schemaOptions = Object.keys(readJson(join(dir, 'schema.json')).$defs.options.properties)
for (const name of optionRows.keys()) if (!schemaOptions.includes(name)) fail(`schema.json: options does not name ${name} of data/options.json`)
for (const name of schemaOptions) if (!optionRows.has(name)) fail(`schema.json: options names ${name}, which data/options.json does not list`)
const matchers = new Set(extensionRows.filter(row => row.matcher).map(row => row.name))
const extensionNames = new Set(extensionRows.map(row => row.name))
const rendererOptions = new Map(extensionRows.map(row => [row.name, row.rendererOptions ?? {}]))
const OPTION_VALUE = {
  allowLosses: (value) => value.every(code => ruleChannel.get(code) === 'render-loss'),
  codeBlockRenderer: (value) => typeof value.result !== 'number' || Number.isFinite(value.result),
  extensions: (value) => value.every(name => matchers.has(name)),
  includes: (value) => (value.depth === undefined || (value.depth >= 0 && value.depth <= 16)) && (value.bytes === undefined || (value.bytes >= 0 && value.bytes <= 8388608)),
  maxLosses: (value) => Number.isInteger(value) && value >= 0,
  headingShift: (value) => Number.isInteger(value) && value >= 0 && value <= optionRows.get('headingShift').maximum,
  labels: (value) => Object.keys(value).every(key => Object.hasOwn(optionRows.get('labels').default, key)),
  platforms: (value) => value.every(name => optionRows.get('platforms').values.includes(name)),
  renderers: (value) => Object.entries(value).every(([name, renderer]) => extensionNames.has(name) &&
    (renderer === 'standard' || Object.entries(renderer.standard).every(([key, setting]) => rendererOptions.get(name)?.[key]?.values.includes(setting)))),
  rules: (value) => Object.keys(value).every(code => codes.has(code)),
  social: (value) => Object.keys(value).every(key => ['mentionUrl', 'tagUrl', 'context'].includes(key)),
  urlPolicy: (value) => Object.keys(value).every(key => ['allow', 'deny'].includes(key) && Array.isArray(value[key])) && !(value.allow && value.deny),
}
/** The option names of `options` whose value data/options.json does not allow. */
function badOptions(options) {
  return Object.entries(options).filter(([name, value]) => {
    const row = optionRows.get(name)
    if (!row) return true
    if (row.type === 'enum') return !row.values.includes(value)
    return OPTION_VALUE[name] ? !OPTION_VALUE[name](value) : false
  }).map(([name]) => name)
}
for (const entry of built['examples.json'].examples) for (const name of badOptions(entry.options)) fail(`examples.json ${entry.id}: option ${name} has a value data/options.json does not allow`)

// An expected entry names an active code of the catalog, its channel and severity where stated, and a start that
// lies in the text it is counted in: the file it names, or the input. Lines end at a line feed (C2-A-141).
const ruleOf = new Map(rules.map(rule => [rule.id, rule]))
const textOf = (entry, file) => {
  const source = file === undefined ? entry.input ?? (entry.inputBytes ? Buffer.from(entry.inputBytes.replaceAll(' ', ''), 'hex').toString('utf8') : undefined) : entry.files?.[file]?.text
  return source
}
function diagnosticProblems(entry) {
  const problems = []
  const listed = entry.expected.diagnostics ?? []
  for (const item of listed) {
    const diagnostic = typeof item === 'string' ? { code: item } : item
    const rule = ruleOf.get(diagnostic.code)
    if (!rule) { problems.push(`expects ${diagnostic.code}, which data/lint-rules.json does not list`); continue }
    if (['obsolete', 'void'].includes(rule.status)) problems.push(`expects ${diagnostic.code}, which is ${rule.status}`)
    if (diagnostic.messageWhen !== undefined && !rule.messages?.some(message => typeof message === 'object' && message.when === diagnostic.messageWhen)) problems.push(`expects ${diagnostic.code} message condition ${diagnostic.messageWhen}, which the catalog does not list`)
    if (diagnostic.channel && rule.channel !== diagnostic.channel) problems.push(`gives ${diagnostic.code} the channel ${diagnostic.channel}, the catalog ${rule.channel}`)
    const severity = entry.options?.strictLosses && rule.channel === 'render-loss' ? 'error' : rule.severity ?? 'warning'
    if (diagnostic.severity && severity !== diagnostic.severity) problems.push(`gives ${diagnostic.code} the severity ${diagnostic.severity}, expected ${severity}`)
    if (diagnostic.file !== undefined && !entry.files?.[diagnostic.file]) problems.push(`names the file ${diagnostic.file}, which files does not hold`)
    const text = textOf(entry, diagnostic.file)
    for (const [line, column] of [[diagnostic.line, diagnostic.column], [diagnostic.endLine, diagnostic.endColumn]]) {
      if (line === undefined || text === undefined) continue
      const lines = text.split('\n')
      if (line > lines.length || column > [...lines[line - 1]].length + 1) problems.push(`places ${diagnostic.code} at ${line}:${column}, outside its text`)
    }
  }
  for (const code of entry.expected.notReported ?? []) {
    if (!ruleOf.has(code)) problems.push(`notReported names ${code}, which data/lint-rules.json does not list`)
    if (listed.some(item => (typeof item === 'string' ? item : item.code) === code)) problems.push(`both expects and excludes ${code}`)
  }
  if (entry.expected.diagnosticsComplete !== undefined && !entry.expected.diagnostics) problems.push('states diagnosticsComplete without diagnostics')
  return problems
}

// A refusal names an error the case's call can throw (C2-T-040), and nothing else is expected beside it but the
// diagnostics a writer error carries. A tree a case reads is valid, or refused by the schema or a reader check.
const readerProblems = readerChecks(spec)
const REFUSALS = {
  render: ['CarveInputError', 'CarveRenderError', 'CarveOptionError', 'CarveTreeError'],
  parse: ['CarveInputError', 'CarveOptionError'],
  cli: [],
  layout: ['CarveInputError', 'CarveOptionError'],
  lint: ['CarveOptionError'],
  format: ['CarveWriteError', 'CarveOptionError'],
  write: ['CarveWriteError', 'CarveLayoutError', 'CarveTreeError', 'CarveOptionError'],
  tree: ['CarveTreeError'],
  migrate: ['CarveTreeError'],
  import: ['ImportInputError', 'CarveRenderError', 'CarveOptionError'],
  position: ['CarveOptionError'],
  patch: ['CarvePatchError'],
  diff: [],
  fingerprint: [],
  export: ['CarveOptionError'],
}
const CATEGORY_ERRORS = new Set(readJson(join(spec, 'data/cli.json')).categories.flatMap(row => row.errors))
function refusalProblems(entry) {
  const problems = []
  const kind = entry.kind ?? 'render'
  const refusal = entry.expected.refusal
  if (refusal) {
    if (!CATEGORY_ERRORS.has(refusal.error)) problems.push(`refuses with ${refusal.error}, which no category of data/cli.json names`)
    if (REFUSALS[kind] && !REFUSALS[kind].includes(refusal.error)) problems.push(`a ${kind} call does not refuse with ${refusal.error}`)
    for (const field of Object.keys(entry.expected)) if (!['refusal', 'diagnostics', 'diagnosticsComplete', 'notReported'].includes(field)) problems.push(`expects ${field} beside a refusal`)
  }
  if (entry.tree && kind !== 'migrate') {
    const isEnvelope = entry.tree.type === undefined && entry.tree.document !== undefined
    const schemaAccepts = validateTree(entry.tree)
    const found = schemaAccepts ? (isEnvelope ? readerProblems(entry.tree.document, { envelope: entry.tree, annotations: entry.annotations }) : readerProblems(entry.tree, { annotations: entry.annotations })) : []
    const refused = !schemaAccepts || found.length > 0
    if (refusal?.error === 'CarveTreeError') {
      if (!refused) problems.push('expects a tree refusal, but neither the schema nor a reader check of the gate refuses the tree')
      else if (schemaAccepts && refusal.path !== undefined && refusedNodePath(entry, readerProblems) !== refusal.path) problems.push(`refuses at ${refusal.path}, but the reader check that cites its clause refuses at ${refusedNodePath(entry, readerProblems)}`)
    } else if (refused) problems.push(`reads a tree the ${schemaAccepts ? `reader refuses at ${found[0].path} (${found[0].clause})` : `schema refuses at ${validateTree.errors[0].instancePath || '/'}`}`)
  }
  if (entry.json !== undefined && !refusal && entry.expected.accepted === undefined && !entry.expected.tree) problems.push('decodes JSON text and expects neither a refusal nor a tree')
  return problems
}

// A sidecar a case gives or expects passes the layout schema (a supplied one unless the case expects its
// refusal); an expected one holds the input as its source, and its ranges lie inside it (C2-L-012).
const validateAnnotations = new Ajv2020({ strict: true, allErrors: false }).compile(readJson(join(spec, 'data/annotation-ranges.schema.json')))
const validateLayout = new Ajv2020({ strict: true, allErrors: false }).compile(readJson(join(spec, 'data/layout-schema.json')))
function layoutProblems(entry) {
  const problems = []
  if (entry.annotations && entry.kind !== 'tree') problems.push('gives annotation ranges to a call that reads none')
  if (entry.annotations && entry.expected.refusal?.error !== 'CarveTreeError' && !validateAnnotations(entry.annotations)) problems.push(`gives annotation ranges the schema refuses at ${validateAnnotations.errors[0].instancePath || '/'}`)
  if (entry.layout && entry.expected.refusal?.error !== 'CarveLayoutError' && !validateLayout(entry.layout)) problems.push(`gives a sidecar the layout schema refuses at ${validateLayout.errors[0].instancePath || '/'}: ${validateLayout.errors[0].message}`)
  if (entry.layout && entry.kind !== 'write') problems.push('gives a sidecar to a call that reads none')
  const expected = entry.expected.layout
  if (expected) {
    if (entry.kind !== 'layout') problems.push('expects a sidecar from a call that returns none')
    const bytes = entry.inputBytes !== undefined ? Buffer.from(entry.inputBytes.replaceAll(' ', ''), 'hex') : Buffer.from(entry.input ?? '', 'utf8')
    const complete = { version: 2, encoding: 'utf-8', source: '', lineEndings: 'none', bom: false, nodes: [], ...expected }
    if (!validateLayout(complete)) problems.push(`expects a sidecar the layout schema refuses at ${validateLayout.errors[0].instancePath || '/'}: ${validateLayout.errors[0].message}`)
    if (expected.source !== undefined && expected.source !== (expected.encoding === 'base64' ? bytes.toString('base64') : entry.input)) problems.push('expects a sidecar whose source is not the input')
    for (const node of expected.nodes ?? []) if (node.startByte > node.endByte || node.endByte > bytes.length) problems.push(`expects ${node.path} at a range outside the input`)
  }
  for (const [path, facts] of Object.entries(entry.expected.layoutAbsent ?? {})) {
    const stated = expected?.nodes?.find(node => node.path === path)
    for (const fact of facts) if (stated && fact in stated) problems.push(`both expects and excludes ${fact} on ${path}`)
  }
  return problems
}

// A command line case runs a command of data/cli.json with flags that command lists, unless it expects the usage
// failure; a failure category has its status; only a command line case states what a command line writes.
const cli = readJson(join(spec, 'data/cli.json'))
const CLI_FIELDS = ['status', 'stdout', 'stdoutJson', 'stdoutDiagnostics', 'stderrCategory', 'stderrDiagnostics', 'filesAfter']
function commandProblems(entry) {
  const problems = []
  const fields = Object.keys(entry.expected).filter(field => CLI_FIELDS.includes(field))
  if (entry.kind !== 'cli') {
    if (fields.length) problems.push(`expects ${fields.join(', ')} from a call that is no command line`)
    if (entry.args || entry.stdin !== undefined) problems.push('gives arguments to a call that is no command line')
    return problems
  }
  if (entry.expected.status === undefined) problems.push('states no exit status')
  if (Object.keys(entry.options).length) problems.push('sets options, which a command line takes as flags')
  for (const field of Object.keys(entry.expected)) if (!CLI_FIELDS.includes(field)) problems.push(`expects ${field} from a command line`)
  const category = entry.expected.stderrCategory
  if (category) {
    const row = cli.categories.find(item => item.name === category)
    if (!row) problems.push(`expects the category ${category}, which data/cli.json does not list`)
    else if (row.status !== entry.expected.status) problems.push(`expects the category ${category} with status ${entry.expected.status}, data/cli.json gives ${row.status}`)
  }
  const commands = new Set(cli.commands.map(row => row.name))
  const command = commands.has(entry.args[0]) ? entry.args[0] : 'render'
  if (category !== 'usage') {
    for (const arg of entry.args.slice(commands.has(entry.args[0]) ? 1 : 0)) {
      if (arg === '--') break
      if (!arg.startsWith('-') || arg === '-') continue
      const name = cli.flags.find(row => row.short === arg)?.name ?? arg.replace(/^--(no-)?/, '').split('=')[0]
      const flag = cli.flags.find(row => row.name === name)
      const flagsOf = cli.commands.find(row => row.name === command)?.flags_of ?? command
      if (!flag || !flag.commands.includes(flagsOf)) problems.push(`passes ${arg}, which data/cli.json does not list for ${command}`)
    }
  }
  for (const list of [entry.expected.stdoutDiagnostics ?? [], entry.expected.stderrDiagnostics ?? []]) {
    for (const item of list) if (typeof item === 'object' && item.channel) problems.push(`states the channel of the line of ${item.code}, which a diagnostic line does not carry (C2-T-019)`)
    for (const item of list) if (!codes.has(typeof item === 'string' ? item : item.code)) problems.push(`expects the line of ${typeof item === 'string' ? item : item.code}, which data/lint-rules.json does not list`)
  }
  return problems
}

// A position case gives an offset and expects a line and a column or a refusal (C2-T-041); only it states them.
function positionProblems(entry) {
  const problems = []
  const fields = ['line', 'column'].filter(field => entry.expected[field] !== undefined)
  if (entry.kind !== 'position') {
    if (fields.length) problems.push(`expects ${fields.join(', ')} from a call that is no positionOf`)
    if (entry.offset !== undefined) problems.push('gives an offset to a call that is no positionOf')
    return problems
  }
  if (Object.keys(entry.options).length) problems.push('sets options, which positionOf does not read')
  if (!entry.expected.refusal && fields.length !== 2) problems.push('expects neither a refusal nor a line and a column')
  for (const field of Object.keys(entry.expected)) if (!['line', 'column', 'refusal'].includes(field)) problems.push(`expects ${field} from positionOf`)
  return problems
}

// diff, patch and fingerprint cases (C2-T-043 to C2-T-046) state only their own fields and read no option.
const TREE_CALL_FIELDS = { diff: ['applies', 'patch'], patch: ['children', 'refusal'], fingerprint: ['fingerprint'] }
const TREE_CALL_INPUTS = { diff: ['inputAfter'], patch: ['patch', 'fingerprintOf'], fingerprint: ['of'] }
function treeCallProblems(entry) {
  const problems = []
  for (const [kind, inputs] of Object.entries(TREE_CALL_INPUTS)) for (const field of inputs) if (entry[field] !== undefined && entry.kind !== kind) problems.push(`gives ${field} to a call that is no ${kind}`)
  for (const [kind, fields] of Object.entries(TREE_CALL_FIELDS)) for (const field of fields) if (entry.expected[field] !== undefined && field !== 'children' && field !== 'refusal' && entry.kind !== kind) problems.push(`expects ${field} from a call that is no ${kind}`)
  const own = TREE_CALL_FIELDS[entry.kind]
  if (!own) return problems
  if (Object.keys(entry.options).length) problems.push(`sets options, which a ${entry.kind} case does not read`)
  for (const field of Object.keys(entry.expected)) if (!own.includes(field)) problems.push(`expects ${field} from a ${entry.kind} case`)
  if (entry.kind === 'patch' && !entry.expected.children === !entry.expected.refusal) problems.push('expects exactly one of children and refusal')
  if (entry.kind === 'diff' && entry.expected.patch !== undefined && entry.expected.patch.length !== 0) problems.push('pins a patch other than the empty one, which C2-T-043 does not fix')
  return problems
}

// An export case names its export and expects its output, its diagnostics or a refusal; only it does.
function exportProblems(entry) {
  const problems = []
  if (entry.kind !== 'export') {
    if (entry.to !== undefined) problems.push('names an export, but is no export case')
    if (entry.expected.output !== undefined) problems.push('expects output from a call that is no export')
    return problems
  }
  for (const field of Object.keys(entry.expected)) if (!['output', 'diagnostics', 'diagnosticsComplete', 'notReported', 'refusal'].includes(field)) problems.push(`expects ${field} from an export`)
  return problems
}

// A clause case quotes the sentence that decides it, from a clause of the documents.
const clauseText = new Map()
for (const document of ['syntax-blocks', 'syntax-inline', 'ast', 'html', 'writer', 'source-layout', 'includes', 'extensions', 'import-html', 'tooling']) {
  const text = readFileSync(join(spec, `${document}.md`), 'utf8')
  for (const match of text.matchAll(/^\*\*(?:Exception )?(C2-[A-Z]-\d{3})\*\*(.*)$/gm)) clauseText.set(match[1], match[2])
}
const validateTree = new Ajv2020({ strict: true, allErrors: false }).compile(readJson(join(spec, 'data/ast-schema.json')))
const exampleInputs = new Set(built['examples.json'].examples.map(entry => JSON.stringify([entry.input, entry.options])))
const ids = new Set()
for (const entry of cases.cases) {
  if (ids.has(entry.id)) fail(`clause-cases.json ${entry.id}: duplicate id`)
  ids.add(entry.id)
  for (const clause of entry.clauses) if (!clauseText.has(clause)) fail(`clause-cases.json ${entry.id}: cites ${clause}, which no document defines`)
  // `why` quotes clauses and, when a catalog trigger decides the case, a fragment of its range or reports.
  const quotes = entry.why.split(/ (?=C2-[A-Z]-\d{3}: |Catalog [a-z0-9/-]+: )/)
  const norm = (text) => text.replaceAll(/\s+/g, ' ').trim()
  for (const part of quotes) {
    const clause = /^(C2-[A-Z]-\d{3}): (.+)$/.exec(part)
    const catalog = /^Catalog ([a-z0-9/-]+): (.+)$/.exec(part)
    if (clause) {
      if (!entry.clauses.includes(clause[1])) fail(`clause-cases.json ${entry.id}: why quotes ${clause[1]}, which clauses does not list`)
      else if (!clause[2].split(' ... ').map(norm).every(piece => norm(clauseText.get(clause[1]) ?? '').includes(piece))) fail(`clause-cases.json ${entry.id}: why is not text of ${clause[1]}`)
    } else if (catalog) {
      const report = [ruleOf.get(catalog[1])?.range, ruleOf.get(catalog[1])?.reports].filter(Boolean).join(' ')
      if (!catalog[2].split(' ... ').map(norm).every(piece => norm(report).includes(piece))) fail(`clause-cases.json ${entry.id}: why is not reports text of ${catalog[1]}`)
    } else fail(`clause-cases.json ${entry.id}: why does not start with a clause or Catalog id`)
  }
  if (entry.expected.children && !validateTree({ type: 'document', astVersion: '2.0', children: entry.expected.children })) fail(`clause-cases.json ${entry.id}: the AST schema refuses the expected children at ${validateTree.errors[0].instancePath || '/'}: ${validateTree.errors[0].message}`)
  if ((entry.kind ?? 'render') === 'render' && entry.input !== undefined && !entry.files && exampleInputs.has(JSON.stringify([entry.input, entry.options]))) fail(`clause-cases.json ${entry.id}: duplicates an example`)
  for (const problem of diagnosticProblems(entry)) fail(`clause-cases.json ${entry.id}: ${problem}`)
  for (const problem of refusalProblems(entry)) fail(`clause-cases.json ${entry.id}: ${problem}`)
  for (const problem of layoutProblems(entry)) fail(`clause-cases.json ${entry.id}: ${problem}`)
  for (const problem of commandProblems(entry)) fail(`clause-cases.json ${entry.id}: ${problem}`)
  for (const problem of positionProblems(entry)) fail(`clause-cases.json ${entry.id}: ${problem}`)
  for (const problem of treeCallProblems(entry)) fail(`clause-cases.json ${entry.id}: ${problem}`)
  for (const problem of exportProblems(entry)) fail(`clause-cases.json ${entry.id}: ${problem}`)
  const refusedOption = entry.expected.refusal?.error === 'CarveOptionError' ? entry.expected.refusal.path?.split('/')[1] : undefined
  for (const name of badOptions(entry.options)) if (name !== refusedOption) fail(`clause-cases.json ${entry.id}: option ${name} has a value data/options.json does not allow`)
}

if (failures.length) {
  console.error(`spec 0.2 conformance: ${failures.length} failures\n  ${failures.slice(0, 200).join('\n  ')}`)
  process.exit(1)
}
const examples = built['examples.json'].examples
const verified = examples.filter(entry => entry.status === 'verified').length
console.log(`spec 0.2 conformance: ${examples.length} examples (${verified} verified), ${cases.cases.length} clause cases, ${built['refused-trees.json'].trees.length} refused trees`)
