#!/usr/bin/env node
// The published 0.2 examples are selected from the frozen spec's conformance
// file. HTML is rendered by the same pinned 0.2 API as the playground.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { format, lint, render } from '../docs/.vitepress/engine.js'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const examples = JSON.parse(readFileSync(resolve(root, 'spec/0.2/conformance/examples.json'), 'utf8')).examples
const byId = new Map(examples.map((entry) => [entry.id, entry]))
const destination = resolve(root, 'docs/examples')
mkdirSync(resolve(destination, 'edge-cases'), { recursive: true })

const groups = {
  core: {
    title: 'Core examples',
    intro: 'These examples use Carve 0.2 core syntax with default render options. The source is canonicalized by the 0.2 writer.',
    ids: ['syntax-blocks-22', 'syntax-blocks-27', 'syntax-blocks-30', 'syntax-blocks-42', 'syntax-blocks-65', 'syntax-blocks-173', 'syntax-blocks-275', 'syntax-inline-36', 'syntax-inline-63', 'syntax-inline-94', 'syntax-inline-14'],
  },
  'processor-options': {
    title: 'Processor options',
    intro: 'The 0.2 host controls rendering. Each example names the options passed to the renderer. Raw HTML is off by default.',
    ids: ['html-81', 'html-25', 'html-11', 'html-31', 'html-32', 'html-34'],
    variants: [
      { id: 'html-81', options: { headingIds: 'ascii', headingShift: 1 } },
      { id: 'syntax-blocks-173', options: { sections: true } },
      { id: 'syntax-inline-94', options: { smartTypography: true } },
      { id: 'html-11', options: { rawHtml: true } },
    ],
  },
  'edge-cases/index': {
    title: 'Edge cases',
    intro: 'These 0.2 spec cases show literal or incomplete forms. Their source has been formatted without changing its parsed meaning.',
    ids: ['syntax-blocks-29', 'syntax-blocks-114', 'syntax-blocks-223', 'syntax-inline-64', 'syntax-inline-105'],
  },
}

function fence(language, content) {
  const max = Math.max(2, ...[...content.matchAll(/`+/g)].map((match) => match[0].length))
  const mark = '`'.repeat(max + 1)
  return `${mark}${language}\n${content.replace(/\n$/, '')}\n${mark}`
}

function sample(entry, options = entry.options ?? {}) {
  if (!entry || entry.kind !== 'render' || typeof entry.input !== 'string') throw new Error('missing render example')
  const source = format(entry.input)
  if (format(source) !== source) throw new Error(`${entry.id}: formatter is not stable`)
  const findings = lint(source)
  if (findings.length) throw new Error(`${entry.id}: ${findings.length} lint findings in generated source`)
  const html = render(source, options)
  const anchor = entry.section.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').trim().replace(/\s+/g, '-')
  const ref = `https://github.com/markup-carve/carve/blob/main/spec/0.2/${entry.document}#${anchor}`
  const declaration = JSON.stringify({ id: entry.id, options })
  return [
    `## ${entry.section} (${entry.id})`, '',
    `Adapted from [${entry.document}, ${entry.section}](${ref}).`, '',
    `Options: \`${JSON.stringify(options)}\``, '',
    `<!-- carve-example ${declaration} -->`,
    '::: compare',
    fence('carve', source), '',
    fence('html', html),
    ':::', '',
  ].join('\n')
}

for (const [name, group] of Object.entries(groups)) {
  const lines = [
    '---', `title: ${group.title}`, 'editLink: false', '---', '',
    `# ${group.title}`, '', group.intro, '',
  ]
  for (const id of group.ids) lines.push(sample(byId.get(id)))
  for (const variant of group.variants ?? []) lines.push(sample(byId.get(variant.id), variant.options))
  writeFileSync(resolve(destination, `${name}.md`), lines.join('\n'))
}

const tabSource = format(`:::: tabs\n::: tab "Install"\nRun setup.\n:::\n\n::: tab "Use"\nOpen the app.\n:::\n::::\n`)
if (lint(tabSource).length) throw new Error('tabs example has lint findings')
const extensionPage = [
  '---', 'title: Extensions', 'editLink: false', '---', '',
  '# Extensions', '',
  'Carve 0.2 extensions are registered by the host. The standard tabs extension is provisional. Without registration, its source renders as ordinary nested divs. The example below shows that core fallback.', '',
  'See [the 0.2 extension specification](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#standard-extension-tabs) for registration and the optional tabs renderer.', '',
  '## Admonitions', '',
  'Admonitions are core containers in 0.2. See the [block syntax chapter](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#fences-divs-and-comment-blocks).', '',
  '## Tabs fallback', '',
  '<!-- carve-example {"id":"extensions-tabs","options":{}} -->',
  '::: compare', fence('carve', tabSource), '', fence('html', render(tabSource)), ':::', '',
].join('\n')
writeFileSync(resolve(destination, 'extensions.md'), extensionPage)
writeFileSync(resolve(root, 'docs/.vitepress/generated-examples.json'), JSON.stringify({ edgeCases: [] }, null, 2) + '\n')
console.log('Generated 4 example pages from 0.2 spec examples.')
