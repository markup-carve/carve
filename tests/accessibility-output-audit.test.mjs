import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToHtml, carveToMarkdown, carveToPlainText, carveToAnsi, presets } from '@markup-carve/carve'

const source = `![Network topology](topology.svg)
^ Deployment paths

::: warning "Review access"
Check the permissions.
:::

The result is $\`x\`{aria-label="variable x"}.
`

test('HTML keeps image, landmark, and math names', () => {
  const html = carveToHtml(source)
  assert.match(html, /<img src="topology.svg" alt="Network topology">/)
  assert.match(html, /<figcaption>Deployment paths<\/figcaption>/)
  assert.match(html, /<aside class="admonition warning" aria-labelledby="adm-1">/)
  assert.match(html, /<p class="admonition-title" id="adm-1">Review access<\/p>/)
  assert.match(html, /<span class="math inline" aria-label="variable x" role="math">/)
})

test('text targets retain visible descriptions and titles', () => {
  for (const output of [carveToMarkdown(source), carveToPlainText(source), carveToAnsi(source)]) {
    const text = output.replace(/\x1b\[[0-9;]*m/g, '')
    assert.match(text, /Network topology/)
    assert.match(text, /Deployment paths/)
    assert.match(text, /Review access/)
    assert.match(text, /Check the permissions/)
    assert.match(text, /\bx\b/)
    assert.doesNotMatch(text, /variable x/)
  }
})

test('a diagram extension uses the authored accessible name', () => {
  const diagram = '{aria-label="Deployment flow"}\n``` mermaid\ngraph LR; Build --> Deploy\n```\n'
  const html = carveToHtml(diagram, { extensions: presets() })
  assert.match(html, /<pre[^>]*role="img"/)
  assert.match(html, /<pre[^>]*aria-label="Deployment flow"/)
  for (const output of [carveToMarkdown(diagram, { extensions: presets() }), carveToPlainText(diagram, { extensions: presets() }), carveToAnsi(diagram, { extensions: presets() })]) {
    const text = output.replace(/\x1b\[[0-9;]*m/g, '')
    assert.match(text, /Build --> Deploy/)
    assert.doesNotMatch(text, /Deployment flow/)
  }
})
