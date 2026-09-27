#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { phpDir, rustBinary } from './lib/engine-locations.mjs'
import { parseDriftLedger } from './lib/drift-ledger.mjs'
import { cleanRefusal, lintDriftProblems, lintRules } from './lib/parity-verdict.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const js = resolve(process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js'), 'dist/cli.js')
const php = resolve(phpDir(), 'bin/carve')
const rust = rustBinary()
const engines = { js: [process.execPath, js], rust: [rust], php: ['php', php] }
if (![js, php, rust].every(path => path && existsSync(path))) {
  console.error('parity: build all three engines before running this gate')
  process.exit(2)
}
const failures = []
function invoke(engine, args, source) {
  const [command, ...prefix] = engines[engine]
  const result = spawnSync(command, [...prefix, ...args], { input: source, encoding: 'utf8', timeout: 30000, maxBuffer: 16 * 1024 * 1024 })
  if (result.error || result.signal) throw new Error(`${engine}: ${result.error?.message ?? result.signal}`)
  return result
}
function output(engine, args, source) {
  const result = invoke(engine, args, source)
  if (result.status !== 0) throw new Error(`${engine} ${args.join(' ')}: ${result.stderr || result.stdout}`)
  return result.stdout.trim()
}

try {
  const triggers = JSON.parse(readFileSync(resolve(root, 'resources/lint-default-triggers.json'), 'utf8'))
  if (Object.keys(triggers).length < 36) throw new Error('default lint trigger population is incomplete')
  const declared = parseDriftLedger(resolve(root, 'resources/lint-parity-drift.txt'))
  const missing = new Set()
  for (const engine of Object.keys(engines)) {
    let passed = 0
    for (const [rule, source] of Object.entries(triggers)) {
      const result = invoke(engine, ['lint'], source)
      const emitted = lintRules(result)
      if (emitted.has(rule)) {
        passed++
      } else missing.add(`${engine}/${rule}`)
    }
    console.log(`${engine}: default lint triggers ${passed}/${Object.keys(triggers).length}`)
  }
  failures.push(...lintDriftProblems(missing, declared))
  console.log(`declared missing lint rules: ${declared.size}`)

  const text = value => ({ type: 'text', value })
  const paragraph = value => ({ type: 'paragraph', children: [text(value)] })
  const table = cell => JSON.stringify({ type: 'document', srcByteLength: 0, children: [{ type: 'table', rows: [
    { type: 'table_row', cells: [{ type: 'table_cell', header: false, ...cell }] },
  ] }] })
  const cases = [
    { name: 'thematic break between paragraphs', blocks: [paragraph('one'), { type: 'thematic_break' }, paragraph('two')], inlines: [text('one two')] },
    { name: 'code payload', blocks: [{ type: 'code_block', content: 'first\nsecond\n', lang: 'js' }], inlines: [text('first second')] },
    { name: 'code spacing', blocks: [{ type: 'code_block', content: 'a  b\n\nc' }], inlines: [text('a  b  c')] },
    // The three shapes carve#2401 reported as reading three ways. All three
    // engines agree now; nothing held them, which is what let them drift.
    { name: 'code indented continuation line', blocks: [{ type: 'code_block', content: 'a\n  b\n' }], inlines: [text('a   b')] },
    { name: 'code trailing backslash pair', blocks: [{ type: 'code_block', content: 'a\\\\\nb\n' }], inlines: [text('a\\\\ b')] },
    { name: 'image in a block cell', blocks: [{ type: 'paragraph', children: [{ type: 'image', src: 'u.png', alt: 'alt' }] }], inlines: [{ type: 'image', src: 'u.png', alt: 'alt' }] },
    { name: 'titled admonition', blocks: [{ type: 'admonition', kind: 'note', title: [text('Title')], children: [paragraph('body')] }], inlines: [text('Title body')] },
    { name: 'figure order', blocks: [{ type: 'figure', target: paragraph('body'), caption: [text('caption')] }], inlines: [text('body caption')] },
    { name: 'nested heading and quote', blocks: [{ type: 'block_quote', children: [{ type: 'heading', level: 2, children: [text('Heading')] }, paragraph('body')] }], inlines: [text('Heading body')] },
    { name: 'inline styling', blocks: [{ type: 'paragraph', children: [{ type: 'strong', children: [text('bold')] }] }], inlines: [{ type: 'strong', children: [text('bold')] }] },
    { name: 'omitted raw payload', blocks: [{ type: 'raw_block', format: 'html', content: '<b>raw</b>\n' }], inlines: [] },
    { name: 'omitted abbreviation', blocks: [{ type: 'abbreviation_def', abbr: 'HTML', expansion: 'HyperText Markup Language' }], inlines: [] },
    { name: 'omitted raw between paragraphs', blocks: [paragraph('one'), { type: 'raw_block', format: 'html', content: '<b>raw</b>' }, paragraph('two')], inlines: [text('one two')] },
  ]
  for (const testCase of cases) for (const target of ['markdown', 'plain', 'ansi']) {
    const answers = new Set()
    for (const engine of Object.keys(engines)) {
      const args = ['--from-json', `--${target}`]
      const actual = output(engine, args, table({ blocks: testCase.blocks }))
      const expected = output(engine, args, table({ children: testCase.inlines }))
      if (actual !== expected) failures.push(`${engine}/${target}: ${testCase.name} adds or loses cell content`)
      answers.add(actual)
    }
    if (answers.size !== 1) failures.push(`cross-engine/${target}: ${testCase.name}`)
  }
  for (const engine of Object.keys(engines)) {
    const refusal = invoke(engine, ['--from-json', '--carve'], table({ blocks: [{ type: 'thematic_break' }] }))
    if (!cleanRefusal(refusal)) failures.push(`${engine}: an unspellable cell must refuse without output or a stack trace`)
  }
  console.log(`constructed block cells: ${cases.length} cases on Markdown, plain and ANSI; Carve refusal in all three engines`)

  const code = { type: 'code', value: '\n`' }
  for (const children of [
    [text('before '), code, text(' after')],
    [{ type: 'link', href: 'u', children: [text('before '), code] }],
  ]) {
    const ast = JSON.stringify({ type: 'document', srcByteLength: 0, children: [{ type: 'paragraph', children }] })
    for (const engine of Object.keys(engines)) {
      if (!cleanRefusal(invoke(engine, ['--from-json', '--carve'], ast), 'code')) {
        failures.push(`${engine}: an unspellable leading-newline code span must refuse cleanly`)
      }
    }
  }

  for (const source of ['`z` ``\n`\n', 'before ``\n`\n', 'before ```\n``\n', '{~before ``\n`~}\n', 'x {~``\n`~}\n', '``\n`\n']) {
    const written = new Map()
    const original = new Set()
    for (const engine of Object.keys(engines)) {
      const html = output(engine, [], source)
      original.add(html)
      const formatted = output(engine, ['--carve'], source)
      written.set(engine, formatted)
      if (output(engine, ['--carve'], formatted) !== formatted) failures.push(`${engine}: code-span formatter is not idempotent`)
      for (const reader of Object.keys(engines)) {
        if (output(reader, [], formatted) !== html) failures.push(`${engine} -> ${reader}: code-span formatting changes HTML`)
      }
    }
    if (original.size !== 1 || new Set(written.values()).size !== 1) failures.push('cross-engine: code-span source or canonical output differs')
  }
  console.log('code-span formatter: six cases, all writer/reader pairs, idempotence and canonical agreement')
} catch (error) {
  console.error(`parity could not complete: ${error.message}`)
  process.exit(2)
}
for (const failure of failures) console.error(failure)
process.exitCode = failures.length ? 1 : 0
