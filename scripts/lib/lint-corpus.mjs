import { readdirSync } from 'node:fs'
import { join } from 'node:path'

export const lintEngines = ['js', 'php', 'rust']

export function corpusFiles(root) {
  const files = []
  function walk(path) {
    for (const entry of readdirSync(join(root, path), { withFileTypes: true })) {
      const child = `${path}/${entry.name}`
      if (entry.isDirectory()) walk(child)
      else if (entry.isFile() && entry.name.endsWith('.crv')) files.push(child)
    }
  }
  for (const entry of readdirSync(join(root, 'tests'), { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('corpus')) walk(`tests/${entry.name}`)
  }
  if (!files.length) throw new Error('lint corpus is empty')
  return files.sort()
}

export function diagnostics(result, files) {
  if (result.error || result.signal || ![0, 1].includes(result.status)) {
    throw new Error(`lint failed: ${result.error?.message ?? result.signal ?? result.status}: ${result.stderr}`)
  }
  if (result.stderr?.trim()) throw new Error(`lint stderr: ${result.stderr}`)
  const byFile = Object.fromEntries(files.map(file => [file, []]))
  let count = 0
  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line.trim()) continue
    const match = /^(.*):(\d+):(\d+) ([a-z][a-z0-9-]*)(?:\s.*)?$/.exec(line)
    // Diagnostic messages can contain source newlines. Only stdout following
    // a diagnostic header is message text; stderr always indicates failure.
    if (!match && (/^.*\.crv:\d+:\d+\b/.test(line) || /^(?:PHP )?(?:Warning|Deprecated|Notice|Fatal error|Parse error):/.test(line))) throw new Error(`malformed lint output: ${line}`)
    if (!match && count > 0) continue
    if (!match || !Object.hasOwn(byFile, match[1])) throw new Error(`unexpected lint output: ${line}`)
    const [, file, row, column, rule] = match
    if (+row < 1 || +column < 1) throw new Error(`invalid lint location: ${line}`)
    byFile[file].push([rule, +row, +column])
    count++
  }
  if ((result.status === 1) !== (count > 0)) throw new Error('lint status and diagnostics disagree')
  for (const values of Object.values(byFile)) values.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0) || a[1] - b[1] || a[2] - b[2])
  return byFile
}

export function differences(results, files) {
  return Object.fromEntries(files.flatMap(file => {
    const answers = Object.fromEntries(lintEngines.map(engine => [engine, results[engine][file]]))
    return new Set(Object.values(answers).map(JSON.stringify)).size === 1 ? [] : [[file, answers]]
  }))
}

export function reconcile(actual, declarations) {
  if (declarations.version !== 1 || !Array.isArray(declarations.differences)) throw new Error('invalid lint corpus ledger')
  const declared = new Map()
  for (const entry of declarations.differences) {
    if (!entry.file || !entry.reason?.trim() || !/^https:\/\/github\.com\/markup-carve\/[^/]+\/issues\/\d+$/.test(entry.issue ?? '')) throw new Error('lint declaration needs file, reason and owning issue')
    if (declared.has(entry.file)) throw new Error(`duplicate lint declaration: ${entry.file}`)
    if (Object.keys(entry.diagnostics ?? {}).sort().join() !== [...lintEngines].sort().join()) throw new Error(`invalid participants: ${entry.file}`)
    declared.set(entry.file, entry)
  }
  const failures = []
  for (const [file, answers] of Object.entries(actual)) {
    const entry = declared.get(file)
    if (!entry) failures.push(`NEW lint difference: ${file}`)
    else if (lintEngines.some(engine => JSON.stringify(entry.diagnostics[engine]) !== JSON.stringify(answers[engine]))) failures.push(`CHANGED lint difference: ${file}`)
  }
  for (const file of declared.keys()) if (!Object.hasOwn(actual, file)) failures.push(`STALE lint declaration: ${file}`)
  return failures
}
