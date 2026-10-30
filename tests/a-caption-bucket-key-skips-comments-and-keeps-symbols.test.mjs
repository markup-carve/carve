// CARVE-P2-022 and carve#4111: a comment contributes nothing to a caption's
// bucket key, a symbol contributes what the caption renders for it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const captions = (labels) => {
  const source = labels.map((label) => `||\n^ ${label} #: t\n`).join('\n')
  return [...renderDoc(parse(source)).matchAll(/<caption>(.*?)<\/caption>/g)].map((m) => m[1])
}

test('a comment in a label does not open a bucket', () => {
  assert.deepEqual(captions(['Fig', 'Fig {#c#}', '{%c%}Fig']), [
    'Fig 1: t',
    'Fig <span class="critic-comment">c</span> 2: t',
    'Fig 3: t',
  ])
})

test('a symbol in a label opens its own bucket', () => {
  assert.deepEqual(captions(['Fig', 'Fig :smile:', 'Fig']), ['Fig 1: t', 'Fig :smile: 1: t', 'Fig 2: t'])
})
