import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const skip = '<!-- carve-sample {"skip":"The pinned engine has not yet implemented typed metadata blocks."} -->'
const metadata = '---\ntitle: Book\n---\n\n= Chapter 1\n\n{#chapter-1}\n---yaml\nauthor: Ada\n---\n\nText.\n'

function check(sample) {
  const docs = mkdtempSync(join(tmpdir(), 'docs-samples-check-'))
  writeFileSync(join(docs, 'page.md'), `# Page\n\n${skip}\n\`\`\`\`carve\n${sample}\`\`\`\`\n`)
  return spawnSync(process.execPath, ['scripts/docs-samples-check.mjs', '--docs', docs], { encoding: 'utf8' })
}

test('a skip marker does not exempt a typed metadata sample from the check', () => {
  const result = check(metadata)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /1 checked, 0 failures/)
  assert.match(result.stdout, /page\.md:4: "skip" is ignored/)
})

test('a broken sample under a skip marker fails the gate', () => {
  const result = check(metadata.replace('= Chapter 1', '=  Chapter  1'))
  assert.equal(result.status, 1)
  assert.match(result.stderr, /page\.md:4: fmt --check: source is not canonical/)
})
