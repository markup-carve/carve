import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { carveToHtml, mathBlock, presets } from '@markup-carve/carve'

const corpus = new URL('./corpus-optional/', import.meta.url)
const { cases } = JSON.parse(readFileSync(new URL('manifest.json', corpus), 'utf8'))
const visualCases = cases.filter(({ feature }) =>
  feature.startsWith('fenced-render-') || feature === 'math-block',
)
const fixtures = visualCases.map(({ slug }) => ({
  slug,
  source: readFileSync(new URL(`${slug}.crv`, corpus), 'utf8'),
  expected: readFileSync(new URL(`${slug}.html`, corpus), 'utf8').trim(),
}))

test('every bundled diagram preset and display math has an optional wrapper fixture', () => {
  // Ask each factory which inputs it claims, so adding a preset requires a case.
  for (const [index, extension] of [...presets(), mathBlock()].entries()) {
    const claimed = fixtures.filter(({ source }) => {
      const html = carveToHtml(source, { extensions: [extension] })
      return /<(?:pre|div) class="[^"]+"(?: role="img"|>\\\[)/.test(html)
    })
    assert.ok(claimed.length > 0, `${extension.name} preset ${index} has no hydration wrapper fixture`)
    for (const { slug, source, expected } of claimed) {
      assert.equal(carveToHtml(source, { extensions: [extension] }).trim(), expected, slug)
    }
  }
})

test('diagram aliases have their own source fixtures', () => {
  for (const language of ['dot', 'puml']) {
    const fixture = fixtures.find(({ source }) => source.startsWith(`\`\`\` ${language}\n`))
    assert.ok(fixture, language)
    assert.equal(carveToHtml(fixture.source, { extensions: presets() }).trim(), fixture.expected, language)
  }
})


test('diagram documentation examples match their hydration HTML', () => {
  const docs = readFileSync(new URL('../resources/examples/extensions.md', import.meta.url), 'utf8')
  const section = docs.slice(docs.indexOf('## Diagrams and charts'))
  const pairs = [...section.matchAll(/````carve\n([\s\S]*?)\n````[\s\S]*?```html\n([\s\S]*?)\n```/g)]
  assert.equal(pairs.length, 2)
  for (const [, source, expected] of pairs) {
    assert.equal(carveToHtml(source, { extensions: presets() }).trim(), expected)
  }
})
