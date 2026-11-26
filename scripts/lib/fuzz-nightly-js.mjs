// carve-js worker of scripts/fuzz-nightly.mjs: reads a JSON array of cases on stdin, writes one record per case.
// A case is { kind: parse | render | format | lint | import, input } (`html` for import).
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const dir = resolve(process.env.CARVE_JS_DIR ?? 'engines/carve-js')
// The built package loads in a fraction of the time of the TypeScript sources; the sources are the fallback.
const built = existsSync(resolve(dir, 'dist/index.js'))
const js = await import(pathToFileURL(resolve(dir, built ? 'dist/index.js' : 'src/index.ts')))
const importer = await import(pathToFileURL(resolve(dir, built ? 'dist/import.js' : 'import/src/index.ts')))

const refusal = e => ({ accepted: false, error: e?.name ?? 'Error', message: String(e?.message ?? e).slice(0, 300) })
function run(c) {
  const started = performance.now()
  let out
  try {
    if (c.kind === 'parse') {
      const r = js.parseWithDiagnostics(c.input, {})
      out = { tree: JSON.parse(js.encodeTree(r.document)), diagnostics: r.diagnostics }
    } else if (c.kind === 'render') out = { html: js.renderWithDiagnostics(c.input, {}).html }
    else if (c.kind === 'format') {
      const r = js.formatWithDiagnostics(c.input, {})
      out = { carve: r.source, diagnostics: r.diagnostics }
    }
    else if (c.kind === 'lint') out = { diagnostics: js.lint(c.input, {}) }
    else if (c.kind === 'import') {
      const r = importer.importDocument(c.html, { from: 'html' })
      out = { carve: r.source, tree: JSON.parse(js.encodeTree(r.document)) }
    } else out = { unsupported: c.kind }
  } catch (e) { out = refusal(e) }
  return { ...out, ms: performance.now() - started }
}
const cases = JSON.parse(readFileSync(0, 'utf8'))
process.stdout.write(JSON.stringify(cases.map(run)))
