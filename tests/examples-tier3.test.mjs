import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml, mathBlock, codeGroup, wikilinks, headingPermalinks, externalLinks } from '@markup-carve/carve'
import { scanExampleSource } from '../scripts/lib/example-sections.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const factories = new Map([
  ['MathBlock', mathBlock], ['CodeGroup', codeGroup], ['Wikilinks', wikilinks],
  ['HeadingPermalinks', headingPermalinks], ['ExternalLinks', externalLinks],
])
const scan = scanExampleSource(readFileSync(resolve(__dirname, '../resources/examples-tier3.md'), 'utf8').split('\n'))

assert.equal(scan.dropped.length, 0, scan.dropped.join('\n'))
assert.equal(scan.examples.length, factories.size, 'every Tier-3 section must contain one complete compare block')
for (const example of scan.examples) {
  test(`Tier-3 ${example.section} example matches carve-js`, () => {
    const factory = factories.get(example.section)
    assert.ok(factory, `${example.section} has no single-extension verifier`)
    assert.equal(carveToHtml(example.carve, { extensions: [factory()] }), example.html)
  })
}
