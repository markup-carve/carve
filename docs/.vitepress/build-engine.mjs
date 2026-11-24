#!/usr/bin/env node
// Build the playground's browser entries from a carve-js checkout at ENGINE_REVISION.
// Usage: node docs/.vitepress/build-engine.mjs ../carve-js
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

// Ahead of the package pin: definitions continuing on indented lines (carve#6507) landed on carve-js next2 after it.
const ENGINE_REVISION = 'a333bbc52fef189ff67d70b57d735599c3ef8fdd'

const checkout = resolve(process.argv[2] ?? '../carve-js')
const actual = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: checkout, encoding: 'utf8' }).trim()
if (ENGINE_REVISION !== actual) throw new Error(`carve-js checkout ${actual} differs from ENGINE_REVISION ${ENGINE_REVISION}`)
if (!existsSync(resolve(checkout, 'public/index.ts'))) throw new Error('carve-js checkout has no public/ entry')
const { build } = await import(pathToFileURL(resolve(checkout, 'node_modules/esbuild/lib/main.js')).href)

// The core entry loads with the playground; the tools entry (0.1 reader, Markdown and Djot libraries) on first use.
const bundles = [
  {
    file: 'engine.js',
    names: 'parse, render, lint, format, fix, fixEdits',
    contents: `export { parse, render, lint, format, fix, fixEdits } from './public/index.ts'\n`,
  },
  {
    file: 'engine-tools.js',
    names: 'upgrade, importDocument, exportDocument',
    contents: [
      `export { upgrade } from './public/upgrade.ts'`,
      `export { importDocument } from './public/formats.ts'`,
      `export { exportDocument } from './public/export.ts'`,
      '',
    ].join('\n'),
  },
]
for (const bundle of bundles) {
  const result = await build({
    stdin: { contents: bundle.contents, resolveDir: checkout, sourcefile: `docs-${bundle.file}.ts`, loader: 'ts' },
    bundle: true,
    platform: 'browser',
    format: 'esm',
    minify: true,
    write: false,
    logLevel: 'silent',
  })
  const banner = `/*! Carve 0.2 browser API from markup-carve/carve-js ${ENGINE_REVISION} (MIT). Bundled with esbuild: ${bundle.names}. */\n`
  writeFileSync(resolve('docs/.vitepress', bundle.file), banner + result.outputFiles[0].text)
  console.log(`Built docs/.vitepress/${bundle.file} from ${ENGINE_REVISION}`)
}
