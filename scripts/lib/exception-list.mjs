/*
 * Measurement exception lists: one corpus id per line, sorted, naming the
 * documents that do NOT pass a measure. Totals are computed from the corpus at
 * run time, so a corpus PR whose rows pass touches no list.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const corpusId = file => file.replace(/^.*\//, '').replace(/\.crv$/, '')

/** The ids in a list, or null when the file does not exist. */
export function readExceptions(path) {
  if (!existsSync(path)) return null
  return readFileSync(path, 'utf8').split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'))
}

export function writeExceptions(path, ids) {
  mkdirSync(dirname(path instanceof URL ? fileURLToPath(path) : path), { recursive: true })
  const sorted = [...new Set(ids)].sort()
  writeFileSync(path, sorted.length ? sorted.join('\n') + '\n' : '')
}

/**
 * Compare the ids that failed a measure with the ids a list declares.
 * Returns one message per problem; an empty array is a pass.
 */
export function compareExceptions({ name, declared, failing, corpus }) {
  const problems = []
  const listed = new Set(declared)
  const failed = new Set(failing)
  const known = new Set(corpus)
  const sorted = [...listed].sort()
  if (declared.length !== listed.size) problems.push(`${name}: lists an id twice`)
  if (declared.some((id, i) => id !== sorted[i])) problems.push(`${name}: ids are not sorted`)
  for (const id of [...failed].sort()) {
    if (!listed.has(id)) problems.push(`${name}: ${id} fails and is not listed; fix it or add it to the list`)
  }
  for (const id of sorted) {
    if (!known.has(id)) problems.push(`${name}: ${id} is not in the corpus; remove it from the list`)
    else if (!failed.has(id)) problems.push(`${name}: ${id} passes now; remove it from the list`)
  }
  return problems
}
