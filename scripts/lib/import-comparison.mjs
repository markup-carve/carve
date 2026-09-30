import { createHash } from 'node:crypto'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

export const engines = ['js', 'php', 'rust']
export function fingerprint(value) {
  // Imported source is retained as evidence; only its rendered meaning gates.
  const compared = value.answers ? {
    ...value,
    answers: Object.fromEntries(engines.map(engine => {
      const { source, ...answer } = value.answers[engine]
      return [engine, answer]
    })),
  } : value
  return createHash('sha256').update(JSON.stringify(compared)).digest('hex')
}

export function processFailure(engine, error) {
  if (!Number.isInteger(error.code) || error.signal || error.killed
    || (engine === 'php' && error.code === 255) || (engine === 'rust' && error.code === 101)
    || /Fatal error|Stack trace|panicked at|Cannot find module/.test(`${error.stdout}\n${error.stderr}`)) {
    throw new Error(`${engine}: ${error.message ?? error.stderr}`)
  }
  return { status: error.code, stdout: error.stdout, stderr: error.stderr }
}

export function missesTarget(answers, expectedHtml) {
  return engines.some(engine => answers[engine].status !== 0 || answers[engine].html !== expectedHtml)
}
export const htmlBytes = value => value.replace(/\n$/, '')

export function classifyImports(results) {
  if (engines.some(engine => results[engine].status !== 0)) return 'failed'
  if (new Set(engines.map(engine => results[engine].html)).size !== 1) return 'meaning'
  if (new Set(engines.map(engine => results[engine].source)).size !== 1) return 'spelling'
  return 'identical'
}

export function ingestCorpus(root) {
  const files = []
  function walk(path) {
    for (const item of readdirSync(join(root, path), { withFileTypes: true })) {
      const next = `${path}/${item.name}`
      if (item.isDirectory()) walk(next)
      else if (item.isFile() && item.name.endsWith('.crv')) files.push(next)
    }
  }
  for (const item of readdirSync(join(root, 'tests'), { withFileTypes: true })) {
    if (item.isDirectory() && item.name.startsWith('corpus')) walk(`tests/${item.name}`)
  }
  if (!files.length) throw new Error('AST ingest corpus is empty')
  return files.sort()
}

/** Require the runtime evidence carried by every completed comparison report. */
export function validateInterpreters(interpreters) {
  if (!interpreters || !['js', 'php'].every(engine => typeof interpreters[engine] === 'string' && /^\d+\.\d+\.\d+/.test(interpreters[engine]))) {
    throw new Error('Missing or invalid comparison interpreter versions')
  }
  return interpreters
}

/** Interpreter versions use numeric prefixes: 8.3 matches every PHP 8.3 patch. */
export function interpreterMatches(condition, interpreters) {
  if (!condition || typeof condition !== 'object' || Array.isArray(condition) || !Object.keys(condition).length) {
    throw new Error('invalid interpreter condition')
  }
  for (const [engine, version] of Object.entries(condition)) {
    if (!['js', 'php'].includes(engine) || typeof version !== 'string' || !/^\d+(?:\.\d+){0,2}$/.test(version)) {
      throw new Error('invalid interpreter condition')
    }
  }
  return Object.entries(condition).every(([engine, version]) => {
    const measured = interpreters?.[engine]?.match(/^\d+(?:\.\d+)*/)?.[0]
    return typeof measured === 'string' && (measured === version || measured.startsWith(`${version}.`))
  })
}

export function reconcileDifferences(actual, ledger, interpreters) {
  if (ledger.version !== 1 || !Array.isArray(ledger.differences)) throw new Error('invalid comparison ledger')
  const declared = new Map()
  const failures = []
  for (const row of ledger.differences) {
    if (typeof row.key !== 'string' || !row.key || !/^[a-f0-9]{64}$/.test(row.fingerprint ?? '')
      || !row.reason?.trim() || !/^https:\/\/github\.com\/markup-carve\/[^/]+\/issues\/\d+$/.test(row.issue ?? '')) {
      throw new Error('a comparison declaration needs a key, fingerprint, reason and issue')
    }
    if (row.observation === undefined || fingerprint(row.observation) !== row.fingerprint) throw new Error(`invalid observation fingerprint: ${row.key}`)
    if (declared.has(row.key)) throw new Error(`duplicate comparison declaration: ${row.key}`)
    declared.set(row.key, row)
    if (row.interpreters !== undefined && !interpreterMatches(row.interpreters, interpreters)) {
      failures.push(`INTERPRETER MISMATCH comparison declaration: ${row.key}; wanted ${JSON.stringify(row.interpreters)}, measured ${JSON.stringify(interpreters ?? null)}`)
    }
  }
  for (const [key, value] of Object.entries(actual)) {
    const row = declared.get(key)
    if (!row) failures.push(`NEW comparison difference: ${key}`)
    else if (row.fingerprint !== fingerprint(value)) failures.push(`CHANGED comparison difference: ${key}`)
  }
  for (const key of declared.keys()) if (!Object.hasOwn(actual, key)) failures.push(`STALE comparison declaration: ${key}`)
  return failures
}

export async function compareIngestDocument(source, output, invoke) {
  const direct = {}
  const differences = {}
  for (const reader of engines) direct[reader] = htmlBytes(await output(reader, [], source))
  for (const producer of engines) {
    const ast = await output(producer, ['--json'], source)
    JSON.parse(ast)
    for (const reader of engines) {
      const expected = direct[reader]
      const result = await invoke(reader, ['--from-json'], ast)
      const actual = htmlBytes(result.stdout)
      if (result.status !== 0 || actual !== expected) {
        differences[`${producer}->${reader}`] = {
          expected, status: result.status, actual,
          ...(result.status ? { stderr: result.stderr } : {}),
        }
      }
    }
  }
  return differences
}
