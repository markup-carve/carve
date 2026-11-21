// The playground maps the 0.2 engine's UTF-8 byte ranges to UTF-16 string offsets.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyByteEdits, byteToUtf16 } from '../docs/.vitepress/theme/editor/offsets.ts'
import { lint, fixEdits } from '../docs/.vitepress/engine.js'

const SOURCE = '# Hällo 😀 ###\n\nÄ text\n'

test('a lint range after umlauts and an emoji selects the reported text', () => {
  const finding = lint(SOURCE).find((d) => d.code === 'heading-closing-hashes')
  assert.ok(finding)
  const toUtf16 = byteToUtf16(SOURCE)
  assert.equal(SOURCE.slice(toUtf16(finding.range.startOffset), toUtf16(finding.range.endOffset)), '###')
})

test('quick-fix edits apply at the right place in a non-ASCII line', () => {
  const finding = lint(SOURCE).find((d) => d.code === 'heading-closing-hashes')
  const { text, applied } = applyByteEdits(SOURCE, fixEdits(SOURCE, finding))
  assert.equal(applied, 1)
  assert.equal(text, '# Hällo 😀\n\nÄ text\n')
})

test('an edit that overlaps an earlier one is skipped', () => {
  const edits = [{ startOffset: 0, endOffset: 3, text: 'X' }, { startOffset: 2, endOffset: 4, text: 'Y' }]
  assert.deepEqual(applyByteEdits('abcdef', edits), { text: 'Xdef', applied: 1 })
})
