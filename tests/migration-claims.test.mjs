/*
 * The migration guide's claims are real, and still real.
 *
 * docs/migrate-from-markdown.md is followed with existing documents in hand.
 * A wrong row there does not confuse a reader in the abstract - it corrupts a
 * file they are porting, and the page's whole value is that its "Changed" rows
 * are trustworthy.
 *
 * Only the mechanical rows are pinned: the ones that say a Markdown spelling
 * does or does not do something in Carve. Prose about workflow is left alone.
 *
 * The heading case gets the most attention because it is the one that fails
 * quietly: `## H {#id}` is the kramdown/Pandoc spelling, it is everywhere in
 * existing Markdown, and left in place it renders a tag chip AND changes the
 * heading's anchor. Nothing about the output looks like an error.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml, lintCarve } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const page = readFileSync(resolve(root, 'docs/migrate-from-markdown.md'), 'utf8')

const html = (source) => carveToHtml(source).replace(/\s+/g, ' ').trim()

test('a Markdown + bullet is not a Carve bullet', () => {
  assert.equal(html('+ item\n'), '<p>+ item</p>')
  assert.match(html('- item\n'), /<ul>/)
})

test('a spaced thematic break is not a thematic break', () => {
  // The page: "Contiguous `---`, `***`, or `___` (no spaced forms)".
  assert.doesNotMatch(html('- - -\n'), /<hr/)
  assert.equal(html('---\n'), '<hr>')
})

test('GFM double tilde is literal; Carve strikethrough is single', () => {
  assert.equal(html('a ~~strike~~ b\n'), '<p>a ~~strike~~ b</p>')
  assert.match(html('a ~strike~ b\n'), /<s>strike<\/s>/)
})

test('Markdown ** bold is literal; Carve bold is single asterisk', () => {
  assert.equal(html('a **bold** b\n'), '<p>a **bold** b</p>')
  assert.match(html('a *bold* b\n'), /<strong>bold<\/strong>/)
})

test('a bare HTML tag is literal', () => {
  assert.equal(html('a <b>x</b> c\n'), '<p>a &lt;b&gt;x&lt;/b&gt; c</p>')
})

test('a trailing heading attribute becomes a tag AND moves the anchor', () => {
  // Both halves matter. "Literal text" alone would let someone assume the
  // characters simply survive, and the anchor change is the part that breaks
  // inbound links without looking like a failure.
  const out = html('## Introduction {#intro}\n')

  assert.match(out, /<section id="Introduction-intro">/, 'the anchor absorbs the tag text')
  assert.match(out, /<span class="tag">/, 'the #id is parsed as a tag, not left as characters')
  assert.doesNotMatch(out, /<section id="Introduction">/)
  assert.doesNotMatch(out, /<section id="intro">/)
})

test('the linter reports the trailing heading attribute', () => {
  // The guide now points at `carve lint` as the way to find these before
  // publishing, so the rule has to exist and fire.
  const findings = lintCarve('## Introduction {#intro}\n')
  const hit = findings.find((f) => f.rule === 'heading-trailing-attribute')

  assert.ok(hit, `expected a heading-trailing-attribute finding, got ${JSON.stringify(findings)}`)
  assert.match(hit.message, /directly above the heading/)
})

test('the attribute-on-the-line-above form works', () => {
  assert.match(html('{#intro}\n## Introduction\n'), /<section id="intro">/)
})

test('each pinned claim still appears on the page', () => {
  for (const phrase of [
    'a Markdown `+` bullet is not a Carve bullet',
    'no spaced forms',
    'heading-trailing-attribute',
  ]) {
    assert.ok(page.includes(phrase), `docs/migrate-from-markdown.md no longer says "${phrase}"`)
  }
})
