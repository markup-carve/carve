#!/usr/bin/env node
// Copies each spec/0.2 schema into docs/public at the path its `$id` names, so
// the site answers a `$ref` to it. The copies are generated and gitignored; the
// 0.1 schemas in docs/public are committed copies from branch 0.1 and frozen.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'https://markup-carve.github.io/carve/'
export const SCHEMAS = ['spec/0.2/data/ast-schema.json', 'spec/0.2/data/layout-schema.json', 'spec/0.2/conformance/schema.json']

export function publish(repo = root) {
  const problems = []
  for (const path of SCHEMAS) {
    const { $id } = JSON.parse(readFileSync(resolve(repo, path), 'utf8'))
    if ($id !== `${BASE}${path}`) {
      problems.push(`${path}: $id is ${$id}, expected ${BASE}${path}`)
      continue
    }
    const target = resolve(repo, 'docs/public', path)
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(resolve(repo, path), target)
  }
  return problems
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = publish()
  for (const problem of problems) console.error(problem)
  if (problems.length) process.exitCode = 1
  else console.log(`published ${SCHEMAS.length} 0.2 schemas`)
}
