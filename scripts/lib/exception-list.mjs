/*
 * Measurement exception lists: a directory per list holding one empty file per
 * corpus id, naming the documents that do NOT pass a measure. Two PRs that list
 * different ids add different files, so they cannot conflict. A corpus id is
 * the corpus file name without `.crv`, used as the file name unchanged; `.keep`
 * marks an empty list as present. Totals are computed from the corpus at run
 * time, so a corpus PR whose rows pass touches no list.
 */
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const corpusId = file => file.replace(/^.*\//, '').replace(/\.crv$/, '')

const KEEP = '.keep'
const SAFE_ID = /^[a-z0-9_-][a-z0-9._-]*$/
const dirPath = path => path instanceof URL ? fileURLToPath(path) : path

/** The ids in a list, sorted, or null when its directory does not exist. */
export function readExceptions(path) {
  const dir = dirPath(path)
  if (!existsSync(dir)) return null
  return readdirSync(dir).filter(name => !name.startsWith('.')).sort()
}

export function writeExceptions(path, ids) {
  const dir = dirPath(path)
  const wanted = new Set(ids)
  for (const id of wanted) if (!SAFE_ID.test(id)) throw new Error(`${id}: not a file-safe corpus id`)
  mkdirSync(dir, { recursive: true })
  for (const name of readdirSync(dir)) if (!name.startsWith('.') && !wanted.has(name)) unlinkSync(join(dir, name))
  for (const id of [...wanted, KEEP]) if (!existsSync(join(dir, id))) writeFileSync(join(dir, id), '')
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
