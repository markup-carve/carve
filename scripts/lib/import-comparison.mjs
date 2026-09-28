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

export function reconcileDifferences(actual, ledger) {
  if (ledger.version !== 1 || !Array.isArray(ledger.differences)) throw new Error('invalid comparison ledger')
  const declared = new Map()
  for (const row of ledger.differences) {
    if (typeof row.key !== 'string' || !row.key || !/^[a-f0-9]{64}$/.test(row.fingerprint ?? '')
      || !row.reason?.trim() || !/^https:\/\/github\.com\/markup-carve\/[^/]+\/issues\/\d+$/.test(row.issue ?? '')) {
      throw new Error('a comparison declaration needs a key, fingerprint, reason and issue')
    }
    if (row.observation === undefined || fingerprint(row.observation) !== row.fingerprint) throw new Error(`invalid observation fingerprint: ${row.key}`)
    if (declared.has(row.key)) throw new Error(`duplicate comparison declaration: ${row.key}`)
    declared.set(row.key, row)
  }
  const failures = []
  for (const [key, value] of Object.entries(actual)) {
    const row = declared.get(key)
    if (!row) failures.push(`NEW comparison difference: ${key}`)
    else if (row.fingerprint !== fingerprint(value)) failures.push(`CHANGED comparison difference: ${key}`)
  }
  for (const key of declared.keys()) if (!Object.hasOwn(actual, key)) failures.push(`STALE comparison declaration: ${key}`)
  return failures
}
