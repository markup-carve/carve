import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const grammar = await readFile(new URL('../resources/grammar.ebnf', import.meta.url), 'utf8')
const coverage = JSON.parse(
  await readFile(new URL('../resources/html-import-construct-coverage.json', import.meta.url), 'utf8'),
)

const production = (name) =>
  grammar.match(new RegExp(`^${name}[ \\t]*=([\\s\\S]*?);`, 'm'))?.[1] ?? null
const alternatives = (name) =>
  production(name)
    ?.replace(/\(\*[\s\S]*?\*\)/g, ' ')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean) ?? null
const isFamily = (values) =>
  values?.length >= 2 && values.every((value) => /^[a-z_][a-zA-Z0-9_]*$/.test(value))

const constructs = []
for (const root of ['block', 'inline_element']) {
  for (const name of alternatives(root) ?? []) {
    const members = alternatives(name)
    constructs.push(...(isFamily(members) ? members : [name]))
  }
}

test('every grammar construct has exactly one HTML-import coverage declaration', () => {
  const declared = Object.values(coverage).flat()
  assert.equal(new Set(declared).size, declared.length, 'a construct appears in multiple buckets')
  assert.deepEqual(
    [...declared].sort(),
    [...constructs].sort(),
    'classify every new or removed grammar construct before HTML-import coverage can pass',
  )
})
