// Compare the 0.2 schema with every available v2 source tree and with mutations
// of the engine's example trees. Usage: node scripts/spec2-ast-crosscheck.mjs PATH_TO_CARVE_JS
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'
import { Ajv2020 } from 'ajv/dist/2020.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const engineRoot = resolve(process.argv[2] ?? '')
if (!process.argv[2]) throw new Error('pass the path of a carve-js next2 checkout')
const engine = await import(pathToFileURL(join(engineRoot, 'v2/src/index.ts')).href)
const { parse, encodeTree, decodeTree } = engine
const schema = JSON.parse(readFileSync(join(root, 'spec/0.2/data/ast-schema.json'), 'utf8'))
const validate = new Ajv2020({ strict: true, allErrors: false, inlineRefs: false }).compile(schema)
const localAjv = new Ajv2020({ strict: true, allErrors: false, inlineRefs: false })
const local = Object.fromEntries(Object.entries(schema.$defs).map(([type, definition]) => {
  const shallow = structuredClone(definition)
  for (const slot of ['children', 'caption', 'fallback', 'slots', 'pairs', 'columns', 'short', 'prefix', 'locator', 'suffix', 'title']) {
    if (shallow.properties[slot]) shallow.properties[slot] = true
  }
  if (type === 'citation_group') { delete shallow.if; delete shallow.then }
  shallow.$defs = schema.$defs
  shallow.definitions = schema.definitions
  return [type, localAjv.compile(shallow)]
}))
function localError(value) {
  const queue = [value]
  while (queue.length) {
    const item = queue.pop()
    if (!item || typeof item !== 'object') continue
    if (Array.isArray(item)) { queue.push(...item); continue }
    if (local[item.type] && !local[item.type](item)) {
      const error = local[item.type].errors[0]
      return { type: item.type, path: error.instancePath, keyword: error.keyword, params: error.params }
    }
    queue.push(...Object.values(item))
  }
  return null
}
const examples = JSON.parse(readFileSync(join(engineRoot, 'v2/data/examples.json'), 'utf8'))
const tickets = JSON.parse(readFileSync(join(engineRoot, 'v2/test/fixtures/superseded-tickets.json'), 'utf8'))
const errors = []
const tree = (input, positions) => JSON.parse(encodeTree(parse(input, { positions })))
function filePaths(folder, out = []) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue
    const path = join(folder, entry.name)
    if (entry.isDirectory()) filePaths(path, out)
    else if (entry.isFile() && path.endsWith('.crv')) out.push(path)
  }
  return out
}
const paths = [...filePaths(root), ...filePaths(engineRoot)].sort()
let produced = 0
const seedTrees = []
for (const [group, inputs] of [
  ['example', examples.map((x, i) => [String(i + 1), x.input])],
  ['ticket', tickets.map((x, i) => [String(i + 1), x.input])],
  ['file', paths.map(x => [x, readFileSync(x, 'utf8')])],
]) {
  for (const [name, input] of inputs) {
    for (const positions of [true, false]) {
      try {
        const value = tree(input, positions)
        produced++
        if (!validate(value)) errors.push({ group, name, positions, error: validate.errors?.[0], tree: value })
        if (group === 'example') seedTrees.push(value)
      } catch (error) { errors.push({ group, name, positions, error: String(error) }) }
    }
  }
}

// The same single-mutation families as v2/scripts/fuzz-tree.ts: object field
// changes, list changes, type swaps, enum swaps, and deep self nesting.
const TYPES = Object.keys(schema.$defs).concat('escaped_text', 'unknown')
const COMMON = ['attrs', 'data', 'pos', 'segments', 'metadata', 'dir', 'lang']
const other = [null, 7, -1, 1.5, 0, true, '', 'x'.repeat(65536), 'r', '2.0', 'html', [], [null], [{}], [7], ['r'], {}, { a: null }, [['k', 'v']], { keyValues: [['k', 7]] }]
let state = Number(process.env.AST_FUZZ_SEED ?? 1) >>> 0
function rand() { state = (state + 0x6d2b79f5) >>> 0; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
const pick = xs => xs[Math.floor(rand() * xs.length)]
function containers(value, out = []) { if (value && typeof value === 'object') { out.push(value); for (const v of Object.values(value)) containers(v, out) } return out }
function valueFor(current, nodes) { return structuredClone(pick([...other, current, pick(nodes), [pick(nodes)]])) }
function mutate(source, nodes) {
  const copy = structuredClone(source)
  const all = containers(copy), typed = all.filter(x => !Array.isArray(x) && typeof x.type === 'string')
  const target = pick(rand() < 0.5 ? typed : all)
  if (Array.isArray(target)) {
    if (!target.length || rand() < 0.2) target.push(valueFor(null, nodes))
    else { const i = Math.floor(rand() * target.length); if (rand() < 0.5) target.splice(i, 1); else target[i] = valueFor(target[i], nodes) }
    return copy
  }
  const keys = Object.keys(target), choice = rand()
  if (typeof target.type === 'string' && choice < 0.15) target.type = pick(TYPES)
  else if (typeof target.type === 'string' && choice < 0.25) {
    const field = pick(['children', 'children', 'fallback', 'title', 'caption'])
    let inner = structuredClone(target)
    for (let n = 0; n < 300; n++) inner = { ...target, [field]: field === 'caption' ? inner : [inner] }
    target[field] = field === 'caption' ? inner : [inner]
  } else if (!keys.length || choice < 0.45) {
    const names = Object.keys(schema.$defs[target.type]?.properties ?? {}).concat(COMMON, 'unknownField')
    const field = pick(names)
    target[field] = valueFor(target[field] ?? null, nodes)
  } else { const key = pick(keys); if (choice < 0.6) delete target[key]; else target[key] = valueFor(target[key], nodes) }
  return copy
}
const enumValues = new Map()
for (const [type, def] of Object.entries(schema.$defs)) for (const [key, rule] of Object.entries(def.properties)) {
  if (!rule.enum) continue
  const values = enumValues.get(key) ?? new Set()
  for (const v of rule.enum) values.add(v)
  enumValues.set(key, values)
}
function enumSwap(source) {
  const copy = structuredClone(source), choices = []
  for (const node of containers(copy)) {
    if (Array.isArray(node) || !schema.$defs[node.type]) continue
    for (const [key, value] of Object.entries(node)) {
      const all = enumValues.get(key), own = schema.$defs[node.type].properties[key]?.enum ?? []
      if (all && typeof value === 'string') for (const v of all) if (!own.includes(v)) choices.push([node, key, v])
    }
  }
  if (!choices.length) return null
  const [node, key, value] = pick(choices); node[key] = value; return copy
}
const rare = { type: 'document', astVersion: '2.0', children: [
  { type: 'paragraph', children: [
    { type: 'ruby', pairs: [{ type: 'ruby_pair', base: [{ type: 'text', value: 'a' }], annotation: [] }] },
    { type: 'inline_extension', name: 'kbd', children: [{ type: 'text', value: 'a' }], fallback: [{ type: 'text', value: 'a' }], payload: [{ format: 'text/plain', value: 'a' }] },
    { type: 'citation_group', raw: '[@a]', children: [{ type: 'citation', key: 'a', namespace: 'citation', mode: 'normal' }] },
  ] },
  { type: 'block_extension', name: 'org.example.x', children: [], fallback: [], payload: [{ format: 'text/plain', value: 'a' }] },
  { type: 'table', columns: [{ type: 'table_column' }], children: [{ type: 'table_body', children: [{ type: 'table_row', children: [{ type: 'table_cell', header: false, children: [{ type: 'cell_paragraph', children: [] }] }] }] }] },
] }
const seeds = seedTrees.concat(Array.from({length: seedTrees.length}, () => rare))
const nodes = seeds.flatMap(x => containers(x).filter(v => !Array.isArray(v) && typeof v.type === 'string'))
const count = Number(process.env.AST_FUZZ_COUNT ?? 100000)
let agreed = 0, schemaOnly = 0, engineOnly = 0
const findings = []
for (let i = 0; i < count; i++) {
  const source = pick(seeds)
  const mutant = (rand() < 0.1 ? enumSwap(source) : null) ?? mutate(source, nodes)
  const valid = validate(mutant)
  let accepted = false, reason = ''
  try { decodeTree(JSON.stringify(mutant)); accepted = true } catch (error) { reason = String(error) }
  if (valid === accepted) { agreed++; continue }
  if (valid) schemaOnly++; else engineOnly++
  const localIssue = valid ? null : localError(mutant)
  const classification = valid ? 'schema wrong' :
    localIssue?.path.startsWith('/task') && localIssue.keyword === 'additionalProperties' ? 'text undecided' : 'engine wrong'
  findings.push({ index: i, classification, localIssue, schemaError: valid ? null : validate.errors?.[0], engineError: accepted ? null : reason, mutant })
}
const classifications = Object.fromEntries(['engine wrong', 'schema wrong', 'text undecided'].map(name => [name, findings.filter(x => x.classification === name).length]))
const summary = { examples: examples.length, ticketInputs: tickets.length, files: paths.length, produced, producedFailures: errors.length, mutants: count, agreed, schemaOnly, engineOnly, disagreements: findings.length, classifications }
const reportPath = resolve(root, '..', '_AST_CROSSCHECK_FINDINGS.json.gz')
writeFileSync(reportPath, gzipSync(JSON.stringify({ summary, producedFailures: errors, findings })))
console.log(JSON.stringify(summary))
console.log(`Findings: ${reportPath}`)
if (errors.length) process.exitCode = 1
