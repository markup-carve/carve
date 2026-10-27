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
  const sampleEntries = new Set([
    'plain/js/352-a-bracketed-construct-s-identifiers-stay-on-one-line',
    'ansi/js/352-a-bracketed-construct-s-identifiers-stay-on-one-line',
    'markdown/js/716-url-sinks-reject-schemes-after-emitted-value-normalization',
    'html/js/732-paired-german-quotes-leave-no-quote-in-a-heading-id',
  ])
  const slug = '352-a-bracketed-construct-s-identifiers-stay-on-one-line'
  const good = [['js', 'a\nb'], ['php', 'a b'], ['rust', 'a b']]
  assert.equal(targetDriftKey('plain', slug, good, sampleEntries), `plain/js/${slug}`)
  assert.equal(targetDriftKey('ansi', slug, good, sampleEntries), `ansi/js/${slug}`)
  const security = '716-url-sinks-reject-schemes-after-emitted-value-normalization'
  assert.equal(targetDriftKey('markdown', security, [['js', 'javascript:alert(1)'], ['php', ''], ['rust', '']], sampleEntries), `markdown/js/${security}`)
  const heading = '732-paired-german-quotes-leave-no-quote-in-a-heading-id'
  assert.equal(targetDriftKey('html', heading, [['js', 'id="„2"'], ['php', 'id="2"'], ['rust', 'id="2"']], sampleEntries), `html/js/${heading}`)
  assert.equal(targetDriftKey('markdown', slug, good, sampleEntries), null)
  assert.equal(targetDriftKey('plain', slug, [['js', 'a b'], ['php', 'a b'], ['rust', 'a b']], sampleEntries), null)
  assert.equal(targetDriftKey('plain', slug, [['js', 'a'], ['php', 'b'], ['rust', 'c']], sampleEntries), null)
  assert.equal(targetDriftKey('plain', slug, [['js', 'a'], ['rust', 'a'], ['other', 'b']], sampleEntries), null)
  assert.equal(targetDriftKey('plain', slug, [['js', 'a'], ['php', 'ERROR:bad'], ['rust', 'a']], sampleEntries), null)
  assert.equal(targetDriftKey('plain', slug, good.slice(0, 2), sampleEntries), null)
})
