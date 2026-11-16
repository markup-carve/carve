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

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const spec = join(root, 'spec/0.2')
const dir = join(spec, 'conformance')
const failures = []
const fail = (message) => failures.push(message)
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

const codes = new Set(readJson(join(spec, 'data/lint-rules.json')).rules.map(rule => rule.id))
const fixtureTrees = new Map()
for (const chapter of ['syntax-blocks', 'syntax-inline', 'html', 'writer', 'includes']) {
  for (const entry of readJson(join(spec, 'trees', `examples-${chapter}.json`)).trees) fixtureTrees.set(entry.id, entry.tree)
}

// The flags beside an example's status, as options. `null` marks a flag that names no option.
const FLAGS = [
  [/^--roundtrip$/, () => ({ roundtrip: true })],
  [/^--profile (\w+)$/, (m) => ({ profile: m[1] })],
  [/^profile set to (\w+)$/, (m) => ({ profile: m[1] })],
  [/^--no-raw-html$/, () => ({ rawHtml: false })],
  [/^--heading-ids (\S+)$/, (m) => ({ headingIds: m[1] })],
  [/^--align-tables$/, () => ({ alignTables: true })],
  [/^--social (\{.*\})$/, (m) => ({ social: JSON.parse(m[1]) })],
  [/^urlPolicy set to (\{.*\})$/, (m) => ({ urlPolicy: JSON.parse(m[1]) })],
  [/^sourceLines on$/, () => ({ sourceLines: true })],
  [/^with the depth limit lowered to (\d+)$/, (m) => ({ includes: { depth: Number(m[1]) } })],
  [/^import option rawHtml on$/, () => ({ rawHtml: true })],
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
  'import-html': 'the tree was written by hand from the clauses because the reference importer differs; the source was produced by the 0.2 writer from that tree (import-html.md, conventions)',
  default: 'the HTML was written by hand from the clauses and has not been run through any engine (conventions of the document)',
}
const VERIFIED = { 'import-html': 'the reference importer at carve-js next2 commit 0266e137 gives this tree and this source (import-html.md, conventions)' }

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
  const entry = { id, document: `${example.document}.md`, number: example.number, section: example.section, clauses: example.clauses, kind: null }
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
  const refused = readJson(join(spec, 'trees/refused.json')).trees.map(({ id, clauses, reason, refusedBy, tree }) => ({ id, clauses, reason, refusedBy, tree }))
  return {
    'examples.json': { $schema: './schema.json', kind: 'examples', description: 'Every example of the nine 0.2 documents, generated by scripts/spec2-conformance.mjs. Do not edit. See README.md.', examples },
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

// A clause case quotes the sentence that decides it, from a clause of the documents.
const clauseText = new Map()
for (const document of ['syntax-blocks', 'syntax-inline', 'ast', 'html', 'writer', 'source-layout', 'includes', 'extensions', 'import-html']) {
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
  // `why` is one or more quotes, each `CLAUSE-ID: sentence`; ' ... ' joins two pieces of one clause.
  const quotes = entry.why.split(/ (?=C2-[A-Z]-\d{3}: )/).map(part => /^(C2-[A-Z]-\d{3}): (.+)$/.exec(part))
  const norm = (text) => text.replaceAll(/\s+/g, ' ').trim()
  for (const quote of quotes) {
    if (!quote) { fail(`clause-cases.json ${entry.id}: why does not start with a clause id`); continue }
    if (!entry.clauses.includes(quote[1])) fail(`clause-cases.json ${entry.id}: why quotes ${quote[1]}, which clauses does not list`)
    else if (!quote[2].split(' ... ').map(norm).every(piece => norm(clauseText.get(quote[1]) ?? '').includes(piece))) fail(`clause-cases.json ${entry.id}: why is not text of ${quote[1]}`)
  }
  if (!validateTree({ type: 'document', astVersion: '2.0', children: entry.expected.children })) fail(`clause-cases.json ${entry.id}: the AST schema refuses the expected children at ${validateTree.errors[0].instancePath || '/'}: ${validateTree.errors[0].message}`)
  if (exampleInputs.has(JSON.stringify([entry.input, entry.options]))) fail(`clause-cases.json ${entry.id}: duplicates an example`)
}

if (failures.length) {
  console.error(`spec 0.2 conformance: ${failures.length} failures\n  ${failures.slice(0, 200).join('\n  ')}`)
  process.exit(1)
}
const examples = built['examples.json'].examples
const verified = examples.filter(entry => entry.status === 'verified').length
console.log(`spec 0.2 conformance: ${examples.length} examples (${verified} verified), ${cases.cases.length} clause cases, ${built['refused-trees.json'].trees.length} refused trees`)
