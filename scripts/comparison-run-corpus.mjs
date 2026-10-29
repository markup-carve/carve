#!/usr/bin/env node
// Record the fixtures the dated comparison runs on
// docs/implementation-comparison-methodology.md covered. Run it in the commit
// that retakes those runs; the page's checks compute the lag from this list.
import { readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const fixtures = ['tests/corpus', 'tests/corpus-optional'].flatMap((dir) => {
  const files = readdirSync(`${root}${dir}`)
  const stems = new Set(files.filter((f) => f.endsWith('.crv')).map((f) => f.slice(0, -'.crv'.length)))
  return files.filter((f) => {
    if (f.endsWith('.crv')) return true
    const sidecar = f.match(/^(.*)\.(md|txt|fmt|ansi)$/)
    return sidecar && stems.has(sidecar[1])
  }).map((f) => `${dir}/${f}`)
})
writeFileSync(`${root}resources/comparison-run-corpus.txt`, fixtures.sort().join('\n') + '\n')
console.log(`resources/comparison-run-corpus.txt: ${fixtures.length} fixtures`)
