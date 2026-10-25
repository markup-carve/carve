import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createHighlighter } from 'shiki'
import { carveGrammar, carveLightTheme, carveDarkTheme } from '@markup-carve/carve-grammars/shiki'
import { sourceForShiki, editorTokenRanges } from '../docs/.vitepress/shiki-editor-source.js'

test('playground colors list markers after prose labels and keeps source offsets', async () => {
  const source = readFileSync(new URL('../docs/.vitepress/examples/demo.crv', import.meta.url), 'utf8')
  const highlighter = await createHighlighter({
    themes: [carveLightTheme, carveDarkTheme],
    langs: [carveGrammar],
  })
  try {
    const lines = highlighter.codeToTokens(sourceForShiki(source), {
      lang: 'carve',
      themes: { light: 'github-light', dark: 'github-dark' },
    }).tokens
    const ranges = editorTokenRanges(source, lines)
    for (const line of ['- apples', '  - clementines', '. clone the repo', '- [x] write the grammar']) {
      const start = source.indexOf(line)
      assert.notEqual(start, -1, `demo is missing: ${line}`)
      const marker = line.trimStart()[0]
      const at = start + line.indexOf(marker)
      const range = ranges.find(({ from, to }) => from === at && to === at + 1)
      assert.ok(range, `missing marker token: ${line}`)
      assert.equal(range.token.htmlStyle.color.toLowerCase(), '#d73a49', line)
      assert.equal(range.token.htmlStyle['--shiki-dark'].toLowerCase(), '#f97583', line)
    }
    assert.ok(ranges.every(({ from, to }) => from >= 0 && to <= source.length && from < to))

    const small = 'Tasks:\n\n- [x] done'
    const smallTokens = highlighter.codeToTokens(sourceForShiki(small), {
      lang: 'carve',
      themes: { light: 'github-light', dark: 'github-dark' },
    }).tokens
    const marker = editorTokenRanges(small, smallTokens).find(({ from, to }) => from === small.indexOf('-') && to === small.indexOf('-') + 1)
    assert.equal(marker?.token.htmlStyle.color.toLowerCase(), '#d73a49')
  } finally {
    highlighter.dispose()
  }
})
