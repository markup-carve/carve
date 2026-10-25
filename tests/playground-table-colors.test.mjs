import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHighlighter } from 'shiki'
import { carveGrammar, carveLightTheme, carveDarkTheme } from '@markup-carve/carve-grammars/shiki'

test('playground gives alignment and span angle marks different colors', async () => {
  const highlighter = await createHighlighter({
    themes: [carveLightTheme, carveDarkTheme],
    langs: [carveGrammar],
  })
  const source = '|=< Left | < |'
  for (const theme of ['github-light', 'github-dark']) {
    const angleMarks = highlighter.codeToTokens(source, { lang: 'carve', theme }).tokens[0]
      .filter((token) => token.content === '<')
    assert.equal(angleMarks.length, 2)
    assert.notEqual(angleMarks[0].color, angleMarks[1].color)
  }
  highlighter.dispose()
})
