import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { examplesOf, fenceAt } from '../scripts/lib/spec2-examples.mjs'

test('a longer same-character run closes a sample fence', () => {
  assert.deepEqual(fenceAt(['````carve', '# sample', '``````', 'after'], 0), {
    lang: 'carve', body: '# sample', next: 3,
  })
  assert.equal(fenceAt(['````carve', '~~~~', '```', '# sample', '````'], 0).body, '~~~~\n```\n# sample')
})

test('section headings and clauses ignore fenced sample content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'carve-spec2-fences-'))
  writeFileSync(join(dir, 'html.md'), [
    '## Real section', '**C2-H-001** First.',
    'Example 1 (generated)', '````carve', '# false section', '```', '``````',
    '**C2-H-002** Second.', 'Example 2 (generated)', '```carve', 'text', '```',
    '## Next section', '**C2-H-003** Third.', 'Example 3 (generated)', '```carve', 'text', '```',
  ].join('\n'))
  const entries = examplesOf(dir, 'html')
  assert.deepEqual(entries.map(({ section, clauses }) => ({ section, clauses })), [
    { section: 'Real section', clauses: ['C2-H-001', 'C2-H-002'] },
    { section: 'Real section', clauses: ['C2-H-001', 'C2-H-002'] },
    { section: 'Next section', clauses: ['C2-H-003'] },
  ])
})

test('1024 fence lengths, characters and neighboring sections keep their owner', () => {
  const dir = mkdtempSync(join(tmpdir(), 'carve-spec2-variants-'))
  const lines = []
  for (let i = 0; i < 1024; i++) {
    if (i % 16 === 0) lines.push(`## Section ${i / 16}`, `**C2-H-001** Clause ${i / 16}.`)
    const mark = (i % 2 ? '~' : '`').repeat(3 + i % 4)
    lines.push(`Example ${i + 1} (generated)`, `${mark}carve`, `# false ${i}`)
    if (i % 3 === 0) lines.push(mark[0].repeat(mark.length - 1), `# still false ${i}`)
    lines.push(mark[0].repeat(mark.length + i % 3))
  }
  writeFileSync(join(dir, 'html.md'), lines.join('\n'))
  const entries = examplesOf(dir, 'html')
  assert.equal(entries.length, 1024)
  for (let i = 0; i < entries.length; i++) {
    assert.equal(entries[i].section, `Section ${Math.floor(i / 16)}`)
    assert.deepEqual(entries[i].clauses, ['C2-H-001'])
  }
})
