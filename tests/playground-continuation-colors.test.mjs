import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHighlighter } from 'shiki'
import { carveGrammar, carveLightTheme, carveDarkTheme, carvePalette } from '@markup-carve/carve-grammars/shiki'
import { standaloneContinuationOffsets } from '../docs/.vitepress/semantic-continuations.js'
import { insertMarkerOverride } from '../docs/.vitepress/shiki-editor-source.js'

test('playground colors only standalone continuations accepted by the parser', async () => {
  const valid = '- install the CLI\n+\n> Needs Node 20 or newer.'
  assert.deepEqual(standaloneContinuationOffsets(valid), [valid.indexOf('\n+') + 1])

  const nested = '- a\n  - b\n  +\n  c'
  assert.deepEqual(standaloneContinuationOffsets(nested), [nested.indexOf('  +') + 2])

  const emoji = '- 😀\n+\n> q'
  assert.deepEqual(standaloneContinuationOffsets(emoji), [emoji.indexOf('\n+') + 1])

  const definition = ':: term\n: body\n+\n> q'
  assert.deepEqual(standaloneContinuationOffsets(definition), [definition.indexOf('\n+') + 1])

  for (const source of [
    '+\nx',
    'text\n+',
    '- a\n  +\n  > q',
    '- a\n  +',
    '- 😀😀😀😀\n  +',
    '> - a\n> +\n> q',
    '```\n+\n```',
    '%%%\n+\n%%%',
    '---\ntitle: x\n+\n---',
    '`a\n+\nb`',
    '[a](https://x.test "t\n+\nu")',
  ]) {
    assert.deepEqual(standaloneContinuationOffsets(source), [], source)
  }

  const ranges = [{ from: 0, to: 5, mark: 'original' }]
  insertMarkerOverride(ranges, 2, 'continuation')
  assert.deepEqual(ranges.sort((a, b) => a.from - b.from), [
    { from: 0, to: 2, mark: 'original' },
    { from: 2, to: 3, mark: 'continuation' },
    { from: 3, to: 5, mark: 'original' },
  ])

  const highlighter = await createHighlighter({
    themes: [carveLightTheme, carveDarkTheme],
    langs: [carveGrammar],
  })
  try {
    const marker = highlighter.codeToTokens('- +', {
      lang: 'carve',
      themes: { light: 'github-light', dark: 'github-dark' },
    }).tokens[0].find((token) => token.content === '+')
    assert.equal(marker?.htmlStyle.color.toLowerCase(), carvePalette.light.definition)
    assert.equal(marker?.htmlStyle['--shiki-dark'].toLowerCase(), carvePalette.dark.definition)
  } finally {
    highlighter.dispose()
  }
})
