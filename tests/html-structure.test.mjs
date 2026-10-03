import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareHtmlStructure as compare } from '../scripts/lib/html-structure.mjs'
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

test('attribute order and entity spelling can share structure while bytes differ', () => {
  assert.equal(compare('<p id="a" class="b">&amp;</p>', '<p class="b" id="a">&#38;</p>'), 'same structure')
  assert.equal(compare('<p>x</p>', '<p>x</p>'), 'identical')
})

test('text, whitespace, raw comments and meaningful attributes remain significant', () => {
  for (const [left, right] of [
    ['<p>a b</p>', '<p>ab</p>'],
    ['<p>a\nb</p>', '<p>a b</p>'],
    ['<pre>a\n b</pre>', '<pre>a b</pre>'],
    ['<code>a  b</code>', '<code>a b</code>'],
    ['<p>x</p>\n<p>y</p>', '<p>x</p><p>y</p>'],
    ['<!--raw--><p>x</p>', '<!--changed--><p>x</p>'],
    ['<a href="https://example.org">x</a>', '<a href="javascript:x">x</a>'],
    ['<p aria-label="a">x</p>', '<p aria-label="b">x</p>'],
    ['<section><p>x</p></section>', '<div><p>x</p></div>'],
    ['<template><p>x</p></template>', '<template><p>y</p></template>'],
  ]) assert.equal(compare(left, right), 'different structure', `${left} versus ${right}`)
})

test('parser repair cannot erase a mismatch', () => {
  for (const html of [
    '<p id="a" id="b">x</p>',
    '<table><tr><td>x</td></tr></table>',
    '<p>\u0000x</p>',
    '<p>x',
    '<ul><li>x</ul>',
    '<pre>\nx</pre>',
    '<textarea>\nx</textarea>',
    '<math><mi>x',
    '<svg><circle>',
  ]) assert.equal(compare(html, '<p>x</p>'), 'unclassified', html)
})

test('void element slash spelling is a structural-only difference', () => {
  assert.equal(compare('<br/>', '<br>'), 'same structure')
  assert.equal(compare('<svg><circle/></svg>', '<svg><circle></circle></svg>'), 'unclassified')
})

test('structural diagnostics preserve byte failures and the two-way drift gate', () => {
  const repo = fileURLToPath(new URL('..', import.meta.url))
  const root = mkdtempSync(resolve(tmpdir(), 'carve-html-structure-'))
  try {
    mkdirSync(resolve(root, 'scripts'))
    cpSync(resolve(repo, 'scripts/engine-report.mjs'), resolve(root, 'scripts/engine-report.mjs'))
    cpSync(resolve(repo, 'scripts/lib'), resolve(root, 'scripts/lib'), { recursive: true })
    mkdirSync(resolve(root, 'scripts/spec'))
    cpSync(resolve(repo, 'scripts/spec/participants.mjs'), resolve(root, 'scripts/spec/participants.mjs'))
    cpSync(resolve(repo, 'package.json'), resolve(root, 'package.json'))
    symlinkSync(resolve(repo, 'node_modules'), resolve(root, 'node_modules'), 'dir')
    mkdirSync(resolve(root, 'tests/corpus'), { recursive: true })
    mkdirSync(resolve(root, 'resources'))
    const ledger = resolve(root, 'resources/engine-pin-drift.txt')
    writeFileSync(ledger, '')
    for (let i = 0; i < 100; i++) {
      writeFileSync(resolve(root, `tests/corpus/case-${i}.crv`), 'a & b\n')
      writeFileSync(resolve(root, `tests/corpus/case-${i}.html`), '<p>a &amp; b</p>\n')
    }
    const run = (...args) => spawnSync(process.execPath,
      [resolve(root, 'scripts/engine-report.mjs'), '--structure', ...args], { encoding: 'utf8' })
    assert.equal(run('--check').status, 0)
    writeFileSync(resolve(root, 'tests/corpus/case-0.html'), '<p>a &#38; b</p>\n')
    const mismatch = run('--check')
    assert.equal(mismatch.status, 1, mismatch.stderr)
    assert.match(mismatch.stdout, /HTML diagnostic: same structure/)
    assert.match(mismatch.stdout, /UNDECLARED  case-0/)
    writeFileSync(ledger, 'case-0  Entity spelling control\n')
    assert.equal(run('--check').status, 0)
    assert.equal(run().status, 1)
    writeFileSync(resolve(root, 'tests/corpus/case-0.html'), '<p>a &amp; b</p>\n')
    const stale = run('--check')
    assert.equal(stale.status, 1)
    assert.match(stale.stdout, /STALE       case-0/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
