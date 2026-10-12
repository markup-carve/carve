#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { updateFallbackViews } from './ast-fallback-matrix.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const aggregatePath = resolve(repo, 'resources/grammar.ebnf')
const sourceDir = resolve(repo, 'resources/spec')

const sourceFiles = () => readdirSync(sourceDir)
  .filter((file) => file.endsWith('.ebnf'))
  .sort()

// A clause id outside every comment means a stray `*)` turned clause prose into grammar.
const proseOutsideComments = (file, source) => {
  let depth = 0
  let line = 1
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (c === '\n') line++
    else if (source.startsWith('(*', i)) { depth++; i++ }
    else if (depth > 0 && source.startsWith('*)', i)) { depth--; i++ }
    else if (depth === 0 && (c === '"' || c === "'")) {
      const end = source.indexOf(c, i + 1)
      const eol = source.indexOf('\n', i + 1)
      if (end > 0 && (eol < 0 || end < eol)) i = end
    } else if (depth === 0 && source.startsWith('[CARVE-', i)) {
      throw new Error(`${file}:${line}: clause id outside a comment; look for a stray *) above it`)
    }
  }
  if (depth !== 0) throw new Error(`${file} leaves ${depth} comment(s) open`)
}

const readSource = (file) => {
  const source = readFileSync(resolve(sourceDir, file), 'utf8')
  if (!source.endsWith('\n')) throw new Error(`${file} must end with a newline`)
  proseOutsideComments(file, source)
  return source
}

const assemble = () => sourceFiles()
  .map(readSource)
  .join('')

const command = process.argv[2] ?? '--check'
if (command === '--write' || command === '--check') updateFallbackViews(repo, command === '--write')

if (command === '--write') {
  writeFileSync(aggregatePath, assemble())
  console.log(`assembled ${sourceFiles().length} normative source modules`)
} else if (command === '--check') {
  const expected = assemble()
  const actual = readFileSync(aggregatePath, 'utf8')
  if (actual !== expected) {
    console.error('resources/grammar.ebnf is stale; run: npm run spec:write')
    process.exitCode = 1
  } else {
    console.log(`grammar aggregate matches ${sourceFiles().length} normative source modules`)
  }
} else {
  console.error(`unknown command: ${command}`)
  process.exitCode = 2
}
