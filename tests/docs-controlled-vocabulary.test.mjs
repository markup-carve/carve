import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'

const root = resolve(import.meta.dirname, '..')

const authorFacingPages = [
  'README.md',
  'docs/index.md',
  'docs/get-started.md',
  'docs/cheatsheet.md',
  'docs/examples.md',
  'docs/playground.md',
  'docs/migrate-from-markdown.md',
  'docs/comparison.md',
  'docs/recipes.md',
  'docs/diagrams.md',
  'docs/svg-images.md',
]

const unexplainedInternalTerms = [
  /\bchecked APIs?\b/i,
  /\btarget[- ]routed\b/i,
  /\brender seam\b/i,
  /\bhandler family\b/i,
  /\bfeature taxonomy\b/i,
  /\bhost degradation\b/i,
  /\bsource-positioned losses?\b/i,
  /\bhydrat(?:e|es|ed|ing|ion)\b/i,
]

test('main author-facing pages do not use unexplained internal terminology', () => {
  for (const path of authorFacingPages) {
    const text = readFileSync(resolve(root, path), 'utf8')
    for (const term of unexplainedInternalTerms) {
      assert.doesNotMatch(text, term, `${path} uses internal terminology ${term}`)
    }
  }
})

test('the documentation defines its specialized terms and links the terms page', () => {
  const terms = readFileSync(resolve(root, 'docs/terms.md'), 'utf8')
  for (const heading of [
    'Core syntax',
    'Optional feature',
    'Abstract syntax tree (AST)',
    'Output warning',
    'Fallback output',
    'Raw HTML passthrough',
  ]) {
    assert.match(terms, new RegExp(`\\*\\*${heading.replace(/[()]/g, '\\$&')}\\*\\*`))
  }

  const config = readFileSync(resolve(root, 'docs/.vitepress/config.ts'), 'utf8')
  assert.match(config, /link: '\/terms'/)
})
