#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

function usage() {
  throw new Error('Usage: node tools/migrate-markdown-directory.mjs <source-dir> <output-dir> [--carve <executable> | --carve-node <cli.js>]')
}

function entriesUnder(root, current = root) {
  const entries = []
  for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const target = join(current, entry.name)
    if (entry.isDirectory()) entries.push(...entriesUnder(root, target))
    else entries.push({
      source: relative(root, target),
      kind: entry.isFile() ? (/\.(md|markdown)$/i.test(entry.name) ? 'markdown' : 'asset') : 'skipped',
    })
  }
  return entries
}

function migrate(command, prefix, source) {
  const result = spawnSync(command, [...prefix, 'migrate', '--from', 'markdown', '--report', '-', source], {
    encoding: 'utf8', timeout: 30_000, maxBuffer: 32 * 1024 * 1024,
  })
  if (result.error || result.status !== 0) {
    throw new Error(`${source}: converter failed: ${result.error?.message || result.stderr.trim() || `exit ${result.status}`}`)
  }
  let report
  try { report = JSON.parse(result.stderr) } catch { throw new Error(`${source}: converter did not write a JSON report`) }
  if (report?.schemaVersion !== 2 || report.sourceFormat !== 'markdown' || !Array.isArray(report.diagnostics)) {
    throw new Error(`${source}: converter wrote an incompatible migration report`)
  }
  for (const diagnostic of report.diagnostics) {
    if (!['preserved', 'normalized', 'degraded', 'dropped'].includes(diagnostic?.fidelity)) {
      throw new Error(`${source}: converter wrote a diagnostic without a valid fidelity`)
    }
  }
  return { output: result.stdout, report }
}

export function run(argv = process.argv.slice(2)) {
  if (argv.length !== 2 && argv.length !== 4) usage()
  if (argv.length === 4 && argv[2] !== '--carve' && argv[2] !== '--carve-node') usage()
  const sourceRoot = resolve(argv[0])
  const outputRoot = resolve(argv[1])
  const nodeCli = argv[2] === '--carve-node'
  const command = nodeCli ? process.execPath : argv.length === 4 ? argv[3] : 'carve'
  const prefix = nodeCli ? [resolve(argv[3])] : []
  if (!command) usage()
  if (process.platform === 'win32' && (command === 'carve' || /\.(cmd|bat)$/i.test(command))) {
    throw new Error('Windows npm launchers need --carve-node <path-to-dist/cli.js>; a native carve.exe can use --carve')
  }
  if (!existsSync(sourceRoot)) throw new Error(`Source directory does not exist: ${sourceRoot}`)
  if (!statSync(sourceRoot).isDirectory()) throw new Error(`Source is not a directory: ${sourceRoot}`)
  if (existsSync(outputRoot)) throw new Error(`Output already exists: ${outputRoot}`)
  const nested = relative(sourceRoot, outputRoot)
  if (nested === '' || (!nested.startsWith(`..${sep}`) && nested !== '..' && !isAbsolute(nested))) {
    throw new Error('Output directory must be outside the source directory')
  }
  const inputs = entriesUnder(sourceRoot)
  if (!inputs.some((entry) => entry.kind === 'markdown')) throw new Error(`No Markdown files found in ${sourceRoot}`)

  mkdirSync(dirname(outputRoot), { recursive: true })
  const shell = mkdtempSync(join(dirname(outputRoot), `.${basename(outputRoot)}-`))
  const temporary = join(shell, 'out')
  mkdirSync(temporary)
  const files = []
  const assets = []
  const skipped = []
  const destinations = new Set(['migration-report.json'])
  try {
    for (const entry of inputs) {
      const sourceName = entry.source.split(sep).join('/')
      if (entry.kind === 'skipped') {
        skipped.push(sourceName)
        continue
      }
      const destination = entry.kind === 'markdown'
        ? sourceName.replace(/\.(md|markdown)$/i, '.crv')
        : sourceName
      const key = destination.toLowerCase()
      if (destinations.has(key)) throw new Error(`Two inputs map to the same output path: ${destination}`)
      destinations.add(key)
      const output = join(temporary, destination)
      mkdirSync(dirname(output), { recursive: true })
      if (entry.kind === 'asset') {
        copyFileSync(join(sourceRoot, entry.source), output)
        assets.push(sourceName)
        continue
      }
      const converted = migrate(command, prefix, join(sourceRoot, entry.source))
      writeFileSync(output, converted.output)
      files.push({ source: sourceName, output: destination, diagnostics: converted.report.diagnostics })
    }
    const review = files.filter((file) => file.diagnostics.some((diagnostic) =>
      diagnostic.fidelity === 'degraded' || diagnostic.fidelity === 'dropped'))
    writeFileSync(join(temporary, 'migration-report.json'), `${JSON.stringify({
      schemaVersion: 1,
      sourceFormat: 'markdown',
      files,
      assets,
      skipped,
      review: review.map((file) => file.source),
    }, null, 2)}\n`)
    if (existsSync(outputRoot)) throw new Error(`Output appeared during conversion: ${outputRoot}`)
    renameSync(temporary, outputRoot)
    rmSync(shell, { recursive: true, force: true })
    process.stdout.write(`${files.length} file(s) converted; ${assets.length} asset(s) copied; ${review.length} file(s) need review; ${skipped.length} entry(s) skipped. Report: ${join(outputRoot, 'migration-report.json')}\n`)
    return review.length === 0 && skipped.length === 0 ? 0 : 2
  } catch (error) {
    rmSync(shell, { recursive: true, force: true })
    throw error
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = run() }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1 }
}
