import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseTargetDrift, targetDriftKey } from '../scripts/lib/target-drift.mjs'

const root = resolve(import.meta.dirname, '..')
const entries = parseTargetDrift(resolve(root, 'resources/engine-target-drift.txt'))

test('every declared target difference names a published corpus row', () => {
  for (const { slug } of entries.values()) {
    assert.ok(existsSync(resolve(root, 'tests/corpus', `${slug}.crv`)), slug)
  }
})

test('a declared target difference requires one outlier and two agreeing engines', () => {
  const slug = '352-a-bracketed-construct-s-identifiers-stay-on-one-line'
  const good = [['js', 'a\nb'], ['php', 'a b'], ['rust', 'a\nb']]
  assert.equal(targetDriftKey('plain', slug, good, entries), `plain/php/${slug}`)
  assert.equal(targetDriftKey('ansi', slug, good, entries), `ansi/php/${slug}`)
  assert.equal(targetDriftKey('markdown', slug, good, entries), null)
  assert.equal(targetDriftKey('plain', slug, [['js', 'a\nb'], ['php', 'a\nb'], ['rust', 'a\nb']], entries), null)
  assert.equal(targetDriftKey('plain', slug, [['js', 'a'], ['php', 'b'], ['rust', 'c']], entries), null)
  assert.equal(targetDriftKey('plain', slug, [['js', 'a'], ['rust', 'a'], ['other', 'b']], entries), null)
  assert.equal(targetDriftKey('plain', slug, [['js', 'a'], ['php', 'ERROR:bad'], ['rust', 'a']], entries), null)
  assert.equal(targetDriftKey('plain', slug, good.slice(0, 2), entries), null)
})
