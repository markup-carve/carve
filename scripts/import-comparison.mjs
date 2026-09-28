#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { phpDir, rustDir, rustBinary } from './lib/engine-locations.mjs'
import { comparisonRevisions, printComparisonRevisions } from './lib/comparison-revisions.mjs'
import { engines, classifyImports, processFailure, missesTarget, htmlBytes, ingestCorpus, reconcileDifferences } from './lib/import-comparison.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const args = process.argv.slice(2)
const mode = args.shift()
if (!['import', 'ingest'].includes(mode) || (args.length && (args.length !== 2 || args[0] !== '--report'))) {
  console.error('usage: import-comparison.mjs import|ingest [--report file.json]')
  process.exit(2)
}
const commands = {
  js: [process.execPath, resolve(process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js'), 'dist/cli.js')],
  php: ['php', resolve(phpDir(), 'bin/carve')],
  rust: [rustBinary()],
}
const execute = promisify(execFile)
let runJs
async function invoke(engine, argv, source) {
  if (engine === 'js' && runJs) {
    let stdout = ''
    let stderr = ''
    const status = await runJs(argv, {
      readStdin: async () => source,
      readFile: path => readFileSync(path, 'utf8'),
      write: value => { stdout += value },
      writeErr: value => { stderr += value },
      writeFile: () => { throw new Error('comparison CLI must not write files') },
    })
    return { status, stdout, stderr }
  }
  const [command, ...prefix] = commands[engine]
  if (!command) throw new Error(`${engine}: build the engine before running the comparison`)
  let child
  const running = execute(command, [...prefix, ...argv], {
    cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 16 * 1024 * 1024,
  })
  child = running.child
  child.stdin.on('error', error => { if (error.code !== 'EPIPE') child.kill() })
  child.stdin.end(source)
  try {
    const result = await running
    return { status: 0, stdout: result.stdout, stderr: result.stderr }
  } catch (error) {
    return processFailure(engine, error)
  }
}
async function output(engine, argv, source) {
  const result = await invoke(engine, argv, source)
  if (result.status !== 0) throw new Error(`${engine} ${argv.join(' ')}: ${result.stderr}`)
  return result.stdout
}
async function each(items, work) {
  let cursor = 0
  let done = 0
  let failed = false
  const workers = await Promise.allSettled(Array.from({ length: 6 }, async () => {
    while (!failed && cursor < items.length) {
      const index = cursor++
      try { await work(items[index]) } catch (error) { failed = true; throw error }
      if (++done % 100 === 0) console.log(`${mode}: ${done}/${items.length} documents`)
    }
  }))
  const failure = workers.find(result => result.status === 'rejected')
  if (failure) throw failure.reason
}
const readJson = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const differences = {}
const counts = {}
const revisions = comparisonRevisions(root, [
  { name: 'js', cwd: resolve(commands.js[1], '../..') },
  { name: 'php', cwd: phpDir() },
  { name: 'rust', cwd: rustDir() },
])
try {
  printComparisonRevisions(revisions)
  // A broken installation must fail before it can become a declared import gap.
  for (const engine of engines) {
    const direct = htmlBytes(await output(engine, [], 'probe\n'))
    if (direct !== '<p>probe</p>') throw new Error(`${engine}: renderer smoke check failed`)
    if (mode === 'import') {
      for (const format of ['markdown', 'html', 'djot']) {
        const source = format === 'html' ? '<p>probe</p>\n' : 'probe\n'
        const imported = await output(engine, ['migrate', '--from', format], source)
        if (htmlBytes(await output('js', [], imported)) !== direct) throw new Error(`${engine}/${format}: importer smoke check failed`)
      }
    } else {
      const ast = await output(engine, ['--json'], 'probe\n')
      JSON.parse(ast)
      if (htmlBytes(await output(engine, ['--from-json'], ast)) !== direct) throw new Error(`${engine}: AST ingest smoke check failed`)
    }
  }
  const jsCli = await import(pathToFileURL(commands.js[1]).href)
  if (typeof jsCli.run !== 'function') throw new Error('carve-js CLI has no injectable run entry')
  runJs = jsCli.run
  const jsProbe = await output('js', ['--json'], 'probe\n')
  JSON.parse(jsProbe)
  if (htmlBytes(await output('js', ['--from-json'], jsProbe)) !== '<p>probe</p>') throw new Error('js: in-process AST ingest smoke check failed')
  if (mode === 'import') {
    const commonmark = readJson('tests/import-comparison/commonmark.json')
    const djot = readJson('tests/import-comparison/djot.json')
    if (commonmark.length !== 652 || djot.length !== 277) throw new Error('public importer suite population changed')
    const cases = [
      ...commonmark.flatMap(item => [
        { id: `commonmark/markdown/${item.example}`, format: 'markdown', source: item.markdown },
        { id: `commonmark/html/${item.example}`, format: 'html', source: item.html },
      ]),
      ...djot.map(item => ({ id: `djot/${item.id}`, format: 'djot', source: item.source })),
      ...readJson('tests/import-comparison/targets.json'),
    ]
    for (const item of cases.filter(item => item.expectedCarve !== undefined)) {
      if (htmlBytes(await output('js', [], item.expectedCarve)) !== item.expectedHtml) throw new Error(`${item.id}: shared target spelling no longer renders as expected`)
    }
    await each(cases, async item => {
      const answers = {}
      for (const engine of engines) {
        const result = await invoke(engine, ['migrate', '--from', item.format], item.source)
        answers[engine] = result.status === 0
          ? { status: 0, source: result.stdout, html: htmlBytes(await output('js', [], result.stdout)) }
          : { status: result.status, stdout: result.stdout, stderr: result.stderr }
      }
      const kind = classifyImports(answers)
      const suite = item.id.split('/').slice(0, item.id.startsWith('commonmark/') ? 2 : 1).join('/')
      counts[suite] ??= { identical: 0, spelling: 0, meaning: 0, failed: 0 }
      counts[suite][kind]++
      if (kind === 'meaning' || kind === 'failed') differences[item.id] = { kind, answers }
      if (item.expectedHtml !== undefined) {
        if (missesTarget(answers, item.expectedHtml)) differences[`${item.id}/target`] = { expectedHtml: item.expectedHtml, answers }
      }
    })
  } else {
    const files = ingestCorpus(root)
    counts.documents = files.length
    counts.pairs = files.length * engines.length ** 2
    await each(files, async file => {
      const source = readFileSync(resolve(root, file), 'utf8')
      const direct = {}
      for (const reader of engines) direct[reader] = htmlBytes(await output(reader, [], source))
      for (const producer of engines) {
        const ast = await output(producer, ['--json'], source)
        JSON.parse(ast)
        for (const reader of engines) {
          const expected = direct[reader]
          const result = await invoke(reader, ['--from-json'], ast)
          const actual = htmlBytes(result.stdout)
          if (result.status !== 0 || actual !== expected) {
            differences[`${file}/${producer}->${reader}`] = {
              expected, status: result.status, actual,
              ...(result.status ? { stderr: result.stderr } : {}),
            }
          }
        }
      }
    })
  }
  const sorted = Object.fromEntries(Object.entries(differences).sort(([a], [b]) => a.localeCompare(b, 'en')))
  const failures = reconcileDifferences(sorted, readJson(`resources/${mode}-comparison-drift.json`))
  const report = { complete: true, mode, revisions, counts, differences: sorted, failures }
  if (args.length) writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(counts))
  console.log(`${mode}: ${Object.keys(sorted).length} observed differences`)
  for (const failure of failures) console.error(failure)
  process.exitCode = failures.length ? 1 : 0
} catch (error) {
  if (args.length) writeFileSync(args[1], JSON.stringify({ complete: false, mode, revisions, error: error.message }, null, 2) + '\n')
  console.error(`${mode} comparison could not complete: ${error.message}`)
  process.exitCode = 2
}
