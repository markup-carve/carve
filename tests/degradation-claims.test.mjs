/*
 * The promises in docs/graceful-degradation.md are real, and still real.
 *
 * That page tells an author what survives when a document leaves interactive
 * HTML - what a spoiler looks like in print, whether a disclosure block is
 * flattened, whether a diagram's source is still there in Markdown. It is the
 * page someone reads before committing to a construct, and nothing checked any
 * of it.
 *
 * Only the falsifiable rows are pinned. "clickable tabs" and "blurred until
 * revealed" describe an appearance and are left alone; "kept, not flattened"
 * and "source preserved" name an output, and those are asserted here.
 *
 * Same argument as tests/divergence-claims.test.mjs, one page over: a stale
 * entry is worse than a missing one, because every reader believes it.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml, carveToMarkdown, details, spoiler } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const page = readFileSync(resolve(root, 'docs/graceful-degradation.md'), 'utf8')

const squash = (html) => html.replace(/\s+/g, ' ').trim()

test('a spoiler is revealed, not hidden, outside interactive HTML', () => {
  // The page: "blurred until revealed | revealed | degrades natively (hiding is
  // meaningless offline)".
  const source = '::: spoiler\nhidden text\n:::\n'
  const interactive = squash(carveToHtml(source, { extensions: [spoiler()], mode: 'interactive' }))
  const staticHtml = squash(carveToHtml(source, { extensions: [spoiler()], mode: 'static' }))

  assert.match(interactive, /<details class="spoiler">/)
  assert.match(staticHtml, /spoiler-revealed/)
  assert.doesNotMatch(staticHtml, /<details/, 'static output must not still hide the content')
  assert.match(staticHtml, /hidden text/, 'the content itself survives either way')
})

test('a disclosure block is kept open, not flattened', () => {
  // The page calls this out as the special case: "native `<details open>` -
  // kept, not flattened". A future change that unwrapped it into a plain
  // section would still render the text, so only this asserts the difference.
  const source = '::: details "T"\nbody\n:::\n'
  const staticHtml = squash(carveToHtml(source, { extensions: [details()], mode: 'static' }))

  assert.match(staticHtml, /<details open>/)
  assert.match(staticHtml, /<summary>T<\/summary>/)
})

test('a diagram keeps its source in Markdown', () => {
  // The page: "diagram source preserved (a ```mermaid fence in Markdown)".
  const source = '```mermaid\ngraph TD;\nA-->B;\n```\n'
  assert.equal(carveToMarkdown(source), '```mermaid\ngraph TD;\nA-->B;\n```\n')
})

test('math keeps its source in Markdown', () => {
  // The page: "source preserved (`$...$` in Markdown)".
  assert.equal(carveToMarkdown('x $`a^2` y\n'), 'x $a^2$ y\n')
  assert.equal(carveToMarkdown('$$`E=mc^2`\n'), '$$E=mc^2$$\n')
})

test('each pinned claim still appears on the page', () => {
  // A claim that is deleted upstream should take its test with it, rather than
  // leaving an assertion here defending a promise the page no longer makes.
  for (const phrase of [
    'kept, not flattened',
    'source preserved',
    'degrades natively',
  ]) {
    assert.ok(page.includes(phrase), `docs/graceful-degradation.md no longer says "${phrase}"`)
  }
})
