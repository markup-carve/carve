#!/usr/bin/env node
// Lints and fmt-checks every crv/carve fence and component .crv in docs/.
// A marker comment directly above a sample adjusts the check:
//   <!-- carve-sample {"lint":"reason"} -->      must have a lint finding
//   <!-- carve-sample {"includes":"name"} -->    include root other than "default"
//   <!-- carve-example {"extensions":["mermaid"]} -->  render the shown HTML with these standard extensions
// Includes resolve against tests/fixtures/docs-samples-includes/<name>.
// There is no opt-out: a "skip" key is reported as stale and the sample is still checked.
// Usage: docs-samples-check.mjs [--docs <dir>]
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, relative, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { format, lint as lintSource, render } from '../docs/.vitepress/engine.js'
import { render as renderPinned } from '@markup-carve/carve'
import * as standard from '@markup-carve/carve/extensions'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const docsArg = process.argv.indexOf('--docs')
const docs = docsArg > 0 ? resolve(process.argv[docsArg + 1]) : join(root, 'docs')
// Pins from before the 0.2 rename ship the 0.2 CLI as dist/cli2.js beside the 0.1 dist/cli.js.
const pinned = join(root, 'node_modules/@markup-carve/carve/dist')
const cli = existsSync(join(pinned, 'cli2.js')) ? join(pinned, 'cli2.js') : join(pinned, 'cli.js')
if (!existsSync(cli)) throw new Error('Install the pinned carve-js package with npm ci first')
const includeRoots = join(root, 'tests/fixtures/docs-samples-includes')
const failures = []
const counts = new Map()
const staleSkips = []
let checked = 0

function pages(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? pages(path) : entry.name.endsWith('.md') ? [path] : []
  })
}

function run(args, source) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    input: source, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
  })
  return { status: result.status, output: result.stdout ?? '', error: result.stderr ?? result.error?.message ?? '' }
}

function fail(page, line, message) {
  const name = relative(root, page)
  failures.push(`${name}:${line}: ${message}`)
  counts.set(name, (counts.get(name) ?? 0) + 1)
}

function difference(expected, actual) {
  const left = expected.replace(/\r\n/g, '\n').trimEnd().split('\n')
  const right = actual.replace(/\r\n/g, '\n').trimEnd().split('\n')
  const at = left.findIndex((value, index) => value !== right[index])
  const n = at < 0 ? Math.min(left.length, right.length) : at
  return `shown HTML differs at line ${n + 1}\n  shown: ${JSON.stringify(left[n] ?? '<end>')}\n  render: ${JSON.stringify(right[n] ?? '<end>')}`
}

// The docs engine bundle has no extension entry, so extension samples render with the pinned package.
function renderSample(source, options) {
  if (!options.extensions) return render(source, options.render ?? {})
  const bundles = options.extensions.map((name) => {
    if (typeof standard[name] !== 'function') throw new Error(`unknown standard extension ${name}`)
    return standard[name]()
  })
  return renderPinned(source, { ...options.render, ...standard.withExtensions(...bundles) })
}

function checkSample(page, line, source, options = {}) {
  checked++
  if (Object.hasOwn(options, 'skip')) staleSkips.push(`${relative(root, page)}:${line}`)
  const includeRoot = join(includeRoots, options.includes ?? 'default')
  if (!existsSync(includeRoot)) {
    fail(page, line, `include root missing: ${relative(root, includeRoot)}`)
    return
  }
  const includeFlags = ['--includes', '--include-root', includeRoot]
  if (options.extensions && (options.includes || source.includes('{{'))) {
    fail(page, line, 'extension samples cannot use includes')
    return
  }
  // The generated pages use this same pinned 0.2 engine. Keep the CLI for file-backed includes.
  if (!options.includes && !source.includes('{{')) {
    try {
      const findings = lintSource(source)
      if (findings.length && !options.lint) fail(page, line, `lint: ${findings.map((entry) => `${entry.code}: ${entry.message}`).join('; ')}`)
      if (!findings.length && options.lint) fail(page, line, 'marked as a lint demonstration but has no finding')
      if (!options.fmtSkip && format(source) !== source) fail(page, line, 'fmt --check: source is not canonical')
      if (options.html !== undefined) {
        const html = renderSample(source, options)
        if (options.html.replace(/\r\n/g, '\n').trimEnd() !== html.replace(/\r\n/g, '\n').trimEnd()) {
          fail(page, line, difference(options.html, html))
        }
      }
    } catch (error) { fail(page, line, `0.2 engine failed: ${error.message}`) }
    return
  }
  // Lint must report every parse finding of the expansion (C2-N-085), but the pinned lint drops
  // those of included files and unresolved targets, so the diagnostics command supplies them.
  const lint = run(['lint', '--json', ...includeFlags], source)
  const parse = run(['diagnostics', '--json', ...includeFlags], source)
  if (lint.status === null || (!lint.output && lint.status !== 0)) {
    fail(page, line, `lint command failed: ${lint.error.trim()}`)
  } else if (parse.status !== 0) {
    fail(page, line, `diagnostics command failed: ${parse.error.trim()}`)
  } else {
    try {
      const found = new Map()
      for (const report of [lint, parse]) {
        for (const entry of JSON.parse(report.output).files.flatMap((file) => file.diagnostics)) {
          found.set(JSON.stringify([entry.code, entry.file, entry.range?.startOffset]), entry)
        }
      }
      const entries = [...found.values()]
      if (entries.length && !options.lint) fail(page, line, `lint: ${entries.map((entry) => `${entry.file ? `${entry.file}: ` : ''}${entry.code}: ${entry.message}`).join('; ')}`)
      if (!entries.length && options.lint) fail(page, line, 'marked as a lint demonstration but has no finding')
    } catch (error) {
      fail(page, line, `invalid lint report: ${error.message}`)
    }
  }
  if (!options.fmtSkip) {
    const fmt = run(['fmt', '--check'], source)
    if (fmt.status !== 0) fail(page, line, `fmt --check: ${fmt.output.trim() || fmt.error.trim() || `exit ${fmt.status}`}`)
  }
  if (options.html !== undefined) {
    const flags = Object.entries(options.render ?? {}).flatMap(([key, value]) => {
      const flag = `--${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`
      return value === true ? [flag] : value === false ? [] : [flag, String(value)]
    })
    const rendered = run(['render', ...includeFlags, ...flags], source)
    if (rendered.status !== 0) fail(page, line, `render command failed: ${rendered.error.trim()}`)
    else if (options.html.replace(/\r\n/g, '\n').trimEnd() !== rendered.output.replace(/\r\n/g, '\n').trimEnd()) {
      fail(page, line, difference(options.html, rendered.output))
    }
  }
}

function fences(text, page) {
  const lines = text.split(/\r?\n/)
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    const open = /^( {0,3})(`{3,}|~{3,})(carve|crv|html)(?:\s.*)?$/i.exec(lines[i])
    if (!open) continue
    const start = i
    const indent = open[1].length
    const marker = open[2]
    let end = i + 1
    for (; end < lines.length; end++) {
      const close = /^ {0,3}(`+|~+)\s*$/.exec(lines[end])
      if (close && close[1][0] === marker[0] && close[1].length >= marker.length) break
    }
    if (end === lines.length) {
      fail(page, start + 1, 'unclosed Carve or HTML fence')
      continue
    }
    // A fence in a list item is indented; its body loses up to that many spaces, as in CommonMark.
    const body = lines.slice(start + 1, end).map((line) => line.replace(new RegExp(`^ {0,${indent}}`), ''))
    blocks.push({ type: open[3].toLowerCase(), line: start + 1, start, end, source: body.join('\n') + '\n' })
    i = end
  }
  return { blocks, lines }
}

function marker(lines, start, name) {
  for (let i = start - 1; i >= 0 && i >= start - 5; i--) {
    const value = lines[i].trim()
    if (value === '' || /^:{3,} compare(?: no-render)?$/.test(value)) continue
    const match = new RegExp(`^<!-- ${name} (\\{.*\\}) -->$`).exec(value)
    if (match) {
      try { return JSON.parse(match[1]) } catch { return { invalid: true } }
    }
    break
  }
  return null
}

function componentSamples(page, lines) {
  for (let i = 0; i < lines.length; i++) {
    const tag = /<([A-Z][A-Za-z0-9]*)\s*\/?\s*>/g
    for (const match of lines[i].matchAll(tag)) {
      const component = join(docs, '.vitepress/theme/components', `${match[1]}.vue`)
      if (!existsSync(component)) continue
      const text = readFileSync(component, 'utf8')
      for (const imported of text.matchAll(/\bfrom\s*['"]([^'"]+\.crv)['"]/g)) {
        const sourceFile = resolve(dirname(component), imported[1])
        if (!existsSync(sourceFile)) fail(page, i + 1, `component sample missing: ${imported[1]}`)
        else checkSample(page, i + 1, readFileSync(sourceFile, 'utf8'), marker(lines, i, 'carve-sample') ?? {})
      }
    }
  }
}

for (const page of pages(docs)) {
  const { blocks, lines } = fences(readFileSync(page, 'utf8'), page)
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (block.type === 'html') continue
    const adjacent = blocks[i + 1]
    const html = adjacent?.type === 'html' && lines.slice(block.end + 1, adjacent.start).every((line) => line.trim() === '')
      ? adjacent.source : undefined
    const annotation = marker(lines, block.start, 'carve-sample') ?? {}
    const example = marker(lines, block.start, 'carve-example') ?? {}
    if (annotation.invalid || example.invalid) fail(page, block.line, 'invalid sample marker JSON')
    checkSample(page, block.line, block.source, { ...annotation, html, render: example.options, extensions: example.extensions })
  }
  componentSamples(page, lines)
}

console.log(`Docs samples: ${checked} checked, ${failures.length} failures across ${counts.size} pages.`)
for (const at of staleSkips) console.log(`${at}: "skip" is ignored, the sample was checked; remove the key`)
for (const [page, count] of [...counts].sort()) console.log(`${page}: ${count}`)
for (const failure of failures) console.error(failure)
if (failures.length) process.exitCode = 1
