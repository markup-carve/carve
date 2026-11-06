import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const corpus = fileURLToPath(new URL('./corpus/', import.meta.url))

test('the corpus runs each byte-identical input once', () => {
  const seen = new Map()
  for (const name of readdirSync(corpus).filter((name) => name.endsWith('.crv'))) {
    const hash = createHash('sha256').update(readFileSync(join(corpus, name))).digest('hex')
    assert.equal(seen.get(hash), undefined, `${name} repeats ${seen.get(hash)}`)
    seen.set(hash, name)
  }
})
