#!/usr/bin/env node
// Build the browser entry from a carve-js checkout at the docs pin.
// Usage: node docs/.vitepress/build-engine.mjs ../carve-js
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const checkout = resolve(process.argv[2] ?? '../carve-js')
const packageFile = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
const revision = packageFile.devDependencies['@markup-carve/carve'].split('#')[1]
const actual = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: checkout, encoding: 'utf8' }).trim()
if (revision !== actual) throw new Error(`carve-js checkout ${actual} differs from docs pin ${revision}`)
// Checkouts from before the 0.2 rename keep the engine under v2/.
const entry = existsSync(resolve(checkout, 'v2/src/index.ts')) ? './v2/src/index.ts' : './src/index.ts'
const { build } = await import(pathToFileURL(resolve(checkout, 'node_modules/esbuild/lib/main.js')).href)
const result = await build({
  stdin: {
    contents: `export { parse, render, lint, format } from '${entry}'\n`,
    resolveDir: checkout,
    sourcefile: 'docs-engine-entry.ts',
    loader: 'ts',
  },
  bundle: true,
  platform: 'browser',
  format: 'esm',
  minify: true,
  write: false,
  logLevel: 'silent',
})
const banner = `/*! Carve 0.2 browser API from markup-carve/carve-js ${revision} (MIT). Bundled with esbuild: parse, render, lint, format. */\n`
writeFileSync(resolve('docs/.vitepress/engine.js'), banner + result.outputFiles[0].text)
console.log(`Built docs/.vitepress/engine.js from ${revision}`)
