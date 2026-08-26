#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const aggregatePath = resolve(repo, 'resources/grammar.ebnf')
const sourceDir = resolve(repo, 'resources/spec')

const sourceFiles = () => readdirSync(sourceDir)
  .filter((file) => file.endsWith('.ebnf'))
  .sort()

const readSource = (file) => {
  const source = readFileSync(resolve(sourceDir, file), 'utf8')
  if (!source.endsWith('\n')) throw new Error(`${file} must end with a newline`)
  return source
}

const assemble = () => sourceFiles()
  .map(readSource)
  .join('')

const command = process.argv[2] ?? '--check'

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
