import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { carveToMarkdownWithReport } from '@markup-carve/carve'

// carve#3975: default Markdown export of a promoted image reports
// markdown-attributes-dropped only for a block attribute run merged into it.
// The pinned carve-js predates the fix and still reports glued attributes.
const AHEAD_OF_PIN = new Set([
  '155-image-trailing-attribute-is-strict-about-the-glue',
  '342-url-list-attributes-are-probed-token-wise',
  '342-url-list-attributes-are-probed-token-wise-2',
  '342-url-list-attributes-are-probed-token-wise-3',
  '342-url-list-attributes-are-probed-token-wise-4',
  '342-url-list-attributes-are-probed-token-wise-8',
  '342-url-list-attributes-are-probed-token-wise-9',
  '342-url-list-attributes-are-probed-token-wise-12',
  '71-attribute-edge-cases-5',
  '737-model-inline-frames-and-html-attributes-2',
])
const schema = JSON.parse(readFileSync(new URL('../resources/render-loss-report.schema.json', import.meta.url), 'utf8'))
const validate = new Ajv2020({ strict: false }).compile(schema)
const dropped = (pos) => ({
  code: 'markdown-attributes-dropped',
  target: 'markdown',
  nodeType: 'block',
  message: 'Dropped block attributes while rendering Markdown',
  pos,
})

const rows = [
  ['754-a-promoted-image-merges-block-attributes-before-inline-attributes', '{.outer k=one}\n![a](b){.inner k=two}\n', [dropped({ startLine: 2, endLine: 2, startColumn: 1, endColumn: 22, startOffset: 15, endOffset: 36 })]],
  ['155-image-trailing-attribute-is-strict-about-the-glue', '![alt](img.png){.x}\n', []],
  ['342-url-list-attributes-are-probed-token-wise', '![a](safe.png){srcset="javascript:alert(1) 1x, safe.png 2x"}\n', []],
  ['342-url-list-attributes-are-probed-token-wise-2', '![a](safe.png){srcset="safe.png 1x, javascript:alert(1) 2x"}\n', []],
  ['342-url-list-attributes-are-probed-token-wise-3', '![a](safe.png){imagesrcset="safe.png 1x, javascript:alert(1) 2x"}\n', []],
  ['342-url-list-attributes-are-probed-token-wise-4', '![a](safe.png){srcset="safe.png 1x,javascript:alert(1) 2x"}\n', []],
  ['342-url-list-attributes-are-probed-token-wise-8', '![a](safe.png){srcset="https://example.com/a,data:x 1x"}\n', []],
  ['342-url-list-attributes-are-probed-token-wise-9', '![a](safe.png){SRCSET="safe.png 1x, javascript:alert(1) 2x"}\n', []],
  ['342-url-list-attributes-are-probed-token-wise-12', '![a](safe.png){srcset="java script:alert(1) 1x, safe.png 2x"}\n', []],
  ['71-attribute-edge-cases-5', '![a](u){k="{y}"}\n', []],
  ['737-model-inline-frames-and-html-attributes-2', '![a](/u){src=/v}\n', []],
]

for (const [name, source, losses] of rows) {
  test(`${name} has ${losses.length} Markdown render-loss rows`, () => {
    assert.equal(readFileSync(new URL(`./corpus/${name}.crv`, import.meta.url), 'utf8'), source)
    assert.equal(validate({ losses, totalLosses: losses.length, truncated: false }), true)
    const compare = () => assert.deepEqual(carveToMarkdownWithReport(source).losses, losses)
    if (!AHEAD_OF_PIN.has(name)) return compare()
    assert.throws(compare, { code: 'ERR_ASSERTION' }, `${name} is declared AHEAD_OF_PIN but the pinned engine passes it: drop the entry`)
  })
}
