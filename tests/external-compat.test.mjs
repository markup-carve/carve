import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse as parseDjot, renderDjot } from '@djot/djot'
import { corpus, lossCorpus, checkCase, checkLossCase, validateCorpus, validateLossCorpus, validateAst, runCompatibility } from '../scripts/compat/check.mjs'
import { toolNames, nativeTools, readForeign } from '../scripts/compat/tools.mjs'
import { semantics, fromMd4c, fromHast, parseHtml } from '../scripts/compat/trees.mjs'

const javascriptTools = toolNames.filter(t => !nativeTools.includes(t))

test('every declared compatibility fixture has a source and every tool has coverage', () => {
  validateCorpus()
  validateLossCorpus()
  for (const tool of toolNames) {
    assert.ok(lossCorpus.cases.some(c => c.tools.includes(tool)), `${tool}: no loss case`)
  }
  assert.equal(new Set(lossCorpus.cases.map(c => c.id)).size, lossCorpus.cases.length)
  for (const fixture of lossCorpus.cases) {
    assert.ok(['import', 'export'].includes(fixture.direction))
    assert.ok(fixture.tools.length)
    for (const tool of fixture.tools) assert.ok(toolNames.includes(tool))
    assert.equal(typeof fixture[fixture.direction === 'import' ? 'source' : 'carve'], 'string')
  }
  assert.throws(() => validateCorpus({ schemaVersion: 1, cases: [] }), /empty/)
  const broken = structuredClone(corpus)
  delete broken.cases[0].markdown
  assert.throws(() => validateCorpus(broken), /missing mdast source/)
  const brokenLoss = structuredClone(lossCorpus)
  brokenLoss.cases[0].tools.push('typo')
  assert.throws(() => validateLossCorpus(brokenLoss), /unknown loss tool typo/)
})

test('the Djot hard-break writer workaround still corresponds to an upstream failure', () => {
  assert.throws(() => renderDjot(parseDjot('one\\\ntwo\n')), /No renderer defined for node type hard_break/, 'Remove the workaround when the pinned writer supports hard_break')
})

for (const tool of javascriptTools) {
  for (const fixture of corpus.cases.filter(c => (c.tools ?? toolNames).includes(tool))) {
    test(`${tool}/${fixture.id}: schema, AST, rendering, and both source round trips`, async () => {
      const result = await checkCase(tool, fixture)
      assert.equal(result.status, 'passed')
      assert.equal(result.checks.length, tool === 'asciidoctor' ? 6 : 7)
      assert.ok(result.version)
    })
  }
  for (const fixture of lossCorpus.cases.filter(c => c.tools.includes(tool))) {
    test(`${tool}/${fixture.id}: reports the loss and keeps readable content`, async () => {
      const result = await checkLossCase(tool, fixture)
      assert.equal(result.status, 'passed')
      assert.equal(result.checks.length, 3)
    })
  }
}

test('equal visible text cannot hide changed inline structure or destinations', async () => {
  const fixture = corpus.cases.find(c => c.id === 'inline-structure')
  await assert.rejects(checkCase('mdast', { ...fixture, markdown: fixture.markdown.replace('**bold**', '*bold*') }), /foreign AST mapping/)
  await assert.rejects(checkCase('mdast', { ...fixture, markdown: fixture.markdown.replace('https://example.org', 'https://other.example') }), /foreign AST mapping/)
})

test('the semantic projection preserves attributes, list tightness, destinations and code whitespace', () => {
  for (const [first, second] of [
    [{ type: 'paragraph', attrs: { id: 'a' } }, { type: 'paragraph', attrs: { id: 'b' } }],
    [{ type: 'list', tight: true }, { type: 'list', tight: false }],
    [{ type: 'link', href: '/a' }, { type: 'link', href: '/b' }],
    [{ type: 'code_block', content: 'x\n' }, { type: 'code_block', content: 'x \n' }],
  ]) assert.notDeepEqual(semantics(first), semantics(second))
})

test('authored attributes survive even when their values collide with generated HTML classes and IDs', () => {
  const options = { generated: true, authoredIds: new Set(['authored']), authoredClasses: new Set(['simple']) }
  const kept = fromHast(parseHtml('<h2 id="authored" class="simple">Heading</h2>'), undefined, options)
  const missing = fromHast(parseHtml('<h2>Heading</h2>'), undefined, options)
  assert.notDeepEqual(semantics(kept), semantics(missing))
  assert.deepEqual(kept.children[0].attrs, { id: 'authored', classes: ['simple'] })
})

test('mapped AST validation rejects foreign properties and invalid block placement', async () => {
  const result = await readForeign('mdast', 'A paragraph.\n')
  validateAst(result.ast)
  assert.throws(() => validateAst({ ...result.ast, foreignField: true }), /additionalProperties/)
  assert.throws(() => validateAst({ ...result.ast, children: [{ type: 'text', value: 'misplaced' }] }))
})

test('the MD4C adapter refuses incomplete or mismatched event streams', () => {
  assert.throws(() => fromMd4c([]), /Incomplete/)
  assert.throws(() => fromMd4c([{ event: 'enter_block', kind: 0 }]), /Incomplete/)
  assert.throws(() => fromMd4c([{ event: 'enter_block', kind: 0 }, { event: 'leave_span', kind: 0 }]), /Unbalanced/)
})

test('tool selection names every unmeasured target and rejects invalid selections', async () => {
  const result = await runCompatibility(['commonmark'])
  assert.equal(result.failed, 0)
  assert.deepEqual(result.notMeasured, toolNames.filter(t => t !== 'commonmark'))
  assert.ok(result.rows.every(r => r.tool === 'commonmark'))
  await assert.rejects(runCompatibility([]), /No compatibility tools/)
  await assert.rejects(runCompatibility(['unknown']), /Unknown tool/)
  await assert.rejects(runCompatibility(['hast', 'hast']), /Duplicate/)
})

test('a missing native parser fails the CLI and remains a named failure in its report', () => {
  const dir = mkdtempSync(join(tmpdir(), 'carve-external-failure-'))
  try {
    const report = join(dir, 'report.json')
    const result = spawnSync(process.execPath, ['scripts/external-compat.mjs', '--tools=cmark', `--report=${report}`], {
      cwd: new URL('..', import.meta.url), encoding: 'utf8', env: { ...process.env, CARVE_CMARK: join(dir, 'absent-cmark') },
    })
    assert.equal(result.status, 1, result.stderr)
    const data = JSON.parse(readFileSync(report))
    assert.ok(data.failed > 0)
    assert.equal(data.passed, 0)
    assert.ok(data.rows.every(r => r.status === 'failed' && r.tool === 'cmark'))
    assert.match(result.stderr, /ENOENT/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
