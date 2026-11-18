#!/usr/bin/env node
// Build the browser entry while carve-js does not ship a 0.2 package export.
// Usage: node docs/.vitepress/build-engine-v2.mjs ../carve-js
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const checkout = resolve(process.argv[2] ?? '../carve-js')
const packageFile = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
const revision = packageFile.devDependencies['@markup-carve/carve'].split('#')[1]
const actual = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: checkout, encoding: 'utf8' }).trim()
if (revision !== actual) throw new Error(`carve-js checkout ${actual} differs from docs pin ${revision}`)
const { build } = await import(pathToFileURL(resolve(checkout, 'node_modules/esbuild/lib/main.js')).href)
const result = await build({
  stdin: {
    contents: "export { parse, render, lint, format } from './v2/src/index.ts'\n",
    resolveDir: checkout,
    sourcefile: 'docs-engine-v2-entry.ts',
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
writeFileSync(resolve('docs/.vitepress/engine-v2.js'), banner + result.outputFiles[0].text)
console.log(`Built docs/.vitepress/engine-v2.js from ${revision}`)
