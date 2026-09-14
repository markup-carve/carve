/**
 * Corpus-coverage guards for the docs Playground's extension and highlighted
 * code-language sets.
 *
 * carve-js ships a growing set of extension factories. The docs Playground (and
 * the build-time vite-plugin-carve render) only loads the subset listed in
 * docs/.vitepress/carve-extensions.js. To stop a newly added carve-js extension
 * from being silently missed when the carve-js pin is bumped, that file classifies
 * EVERY exported extension factory as either ENABLED (shown) or EXCLUDED (off,
 * with a reason). `unclassifiedExtensions()` returns any factory that is neither.
 *
 * This test fails the moment an unclassified extension appears, telling the
 * maintainer to file it. It mirrors the spec-corpus coverage guards: a new
 * capability cannot land without an explicit decision recorded for it.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { carveToHtml } from '@markup-carve/carve'
import { createHighlighter } from 'shiki'
import {
  unclassifiedExtensions,
  carveExtensions,
} from '../docs/.vitepress/carve-extensions.js'
import { PLAYGROUND_CODE_LANGUAGES } from '../docs/.vitepress/playground-code-languages.js'
import { diffCodeTransformer } from '../docs/.vitepress/diff-code-transformer.js'

test('every carve-js extension is classified as ENABLED or EXCLUDED', () => {
  const unclassified = unclassifiedExtensions()
  assert.deepEqual(
    unclassified,
    [],
    `Unclassified carve-js extension(s): ${unclassified.join(', ')}.\n` +
      `A new extension factory landed in the pinned carve-js build. Add each name to\n` +
      `either ENABLED (show it in the Playground demo) or EXCLUDED (with a short\n` +
      `reason) in docs/.vitepress/carve-extensions.js.`,
  )
})

test('carveExtensions() builds the enabled set without throwing', () => {
  let exts
  assert.doesNotThrow(() => {
    exts = carveExtensions()
  }, 'one of the ENABLED extensions threw while constructing')
  assert.ok(Array.isArray(exts) && exts.length > 0, 'expected a non-empty extension array')
  for (const ext of exts) {
    assert.equal(typeof ext.name, 'string', 'each enabled extension must expose a string name')
  }
})

test('the Playground loads Shiki support for diff fences', async () => {
  const source = '```diff\n-old\n+new\n```\n'
  assert.match(carveToHtml(source), /class="language-diff"/)

  const highlighter = await createHighlighter({
    themes: ['github-light'],
    langs: PLAYGROUND_CODE_LANGUAGES,
  })
  try {
    assert.ok(highlighter.getLoadedLanguages().includes('diff'))
    const highlighted = highlighter.codeToHtml('-old\n+new\n', {
      lang: 'diff',
      theme: 'github-light',
    })
    assert.match(highlighted, /<span[^>]+>\+new<\/span>/)
  } finally {
    highlighter.dispose()
  }
})

test('a .diff code block combines diff lines with its fence language', async () => {
  const source = '{.diff}\n```js\n  let oldName = true;\n- const oldName = true;\n+ const newName = true;\n```\n'
  assert.match(carveToHtml(source), /<pre class="diff"><code class="language-js">/)

  const highlighter = await createHighlighter({
    themes: ['github-light'],
    langs: ['javascript'],
  })
  try {
    const highlighted = highlighter.codeToHtml(
      '  let oldName = true;\n- const oldName = true;\n+ const newName = true;\n',
      {
        lang: 'js',
        theme: 'github-light',
        transformers: [diffCodeTransformer()],
      },
    )
    assert.match(highlighted, /class="shiki github-light has-diff"/)
    assert.match(highlighted, /class="line diff remove"/)
    assert.match(highlighted, /class="line diff add"/)
    assert.match(highlighted, /class="diff-marker">-<\/span>/)
    assert.match(highlighted, /class="diff-marker">\+<\/span>/)
    assert.match(highlighted, /style="color:[^"]+"> const<\/span>/)
  } finally {
    highlighter.dispose()
  }
})
