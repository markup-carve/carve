import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  cluster, clusterKey, divergence, features, issueSamples, ledgerRefs, lineParts, loadFindings,
  matchCluster, oddOnes, outputDelta, writerChecks,
} from '../scripts/lib/triage-findings.mjs'

test('a line peels into its container chain, its block and its content column', () => {
  assert.deepEqual(
    (({ chain, terminal, column }) => ({ chain, terminal, column }))(lineParts('  - > ```x')),
    { chain: ['bullet', 'quote'], terminal: 'fence', column: 6 },
  )
  assert.equal(lineParts('+').terminal, 'plus')
  assert.deepEqual(lineParts('+ a').chain, ['plus-item'])
  assert.equal(lineParts('---').terminal, 'rule')
  assert.deepEqual(lineParts('---').chain, [])
  assert.equal(lineParts('[^f]: t').terminal, 'footnote-def')
})

test('features name the markup and the column relations, never the words', () => {
  const f = features('- a\n b\n- c\n  d\n- e\n   f\n')
  assert.deepEqual(f.blocks, ['bullet'])
  assert.deepEqual(f.columns, ['at', 'below', 'beyond'])
  assert.deepEqual(features('- alpha\n').blocks, features('- x\n').blocks)
  assert.deepEqual(features('a *b* `c`\n').inline, ['code', 'emph'])
})

test('the odd ones are the groups without the model, or outside the largest group', () => {
  assert.deepEqual(oddOnes('js,model,rs|php').odd, [['php']])
  assert.deepEqual(oddOnes('js,php|rs').odd, [['rs']])
})

test('the divergence point is the open element path and each side\'s next token', () => {
  const d = divergence({ model: '<ul>\n  <li>a</li>\n</ul>', js: '<ul>\n  <li>a\n+</li>\n</ul>' }, 'js|model')
  assert.deepEqual(d, { path: 'ul>li', ref: '</li', odd: 'text' })
})

test('the output delta reports elements first, then markup shown as text, then whitespace', () => {
  assert.equal(outputDelta('<p>a</p>', '<ul><li>a</li></ul>'), '+li +ul -p')
  assert.equal(outputDelta('<p>a</p>', '<p>&gt; a</p>'), 'text +>')
  assert.equal(outputDelta('<pre><code>a\n</code></pre>', '<pre><code>a\n\n</code></pre>'), 'ws')
  assert.equal(outputDelta('<p>a</p>', 'ERROR: boom'), 'error')
  assert.equal(outputDelta('<p>a</p>', undefined), 'refused')
})

test('two findings with the same markup shape and split share a cluster, words aside', () => {
  const a = { id: 'a', kind: 'html', reduced: '- one\n  +\n', pattern: 'js|model,php,rs', outputs: { model: '<ul><li>one</li></ul>', js: '<ul><li>one\n+</li></ul>', php: '<ul><li>one</li></ul>', rs: '<ul><li>one</li></ul>' } }
  const b = { ...a, id: 'b', reduced: '- two\n  +\n', outputs: { model: '<ul><li>two</li></ul>', js: '<ul><li>two\n+</li></ul>', php: '<ul><li>two</li></ul>', rs: '<ul><li>two</li></ul>' } }
  const c = { ...a, id: 'c', reduced: '> two\n+\n', outputs: { model: '<blockquote><p>two</p></blockquote>', js: '<blockquote><p>two\n+</p></blockquote>', php: '', rs: '' } }
  const keyed = [a, b, c].map((finding) => ({ finding, ...clusterKey(finding) }))
  assert.equal(keyed[0].cluster, keyed[1].cluster)
  assert.equal(keyed[0].family, 'js: text ++')
  const groups = cluster(keyed)
  assert.equal(groups.length, 2)
  assert.deepEqual(groups[0].members.map((m) => m.finding.id), ['a', 'b'])
})

test('a cluster matches a known reproduction by key, then by family and similar features', () => {
  const finding = { id: 'a', kind: 'html', reduced: '- x\n  +\n', pattern: 'js|model', outputs: { model: '<ul><li>x</li></ul>', js: '<ul><li>x\n+</li></ul>' } }
  const [group] = cluster([{ finding, ...clusterKey(finding) }])
  const same = { ref: 'o/r#1', ...clusterKey({ ...finding, reduced: '- y\n  +\n' }) }
  assert.deepEqual(matchCluster(group, [same]), { how: 'exact', refs: ['o/r#1'] })
  const near = { ref: 'o/r#2', ...clusterKey({ ...finding, reduced: '- y\n  +\n  ```\n' }) }
  assert.equal(matchCluster(group, [near]).how, 'family')
  const far = { ref: 'o/r#3', ...clusterKey({ ...finding, reduced: '[^f]: y\n' }) }
  assert.equal(matchCluster(group, [far]), null)
})

test('writer checks keep the failing engine and the odd spelling', () => {
  assert.equal(writerChecks('canon:js,php|rs'), 'canon:rs')
  assert.equal(writerChecks('semantic:php idem:js'), 'idem:js semantic:php')
})

test('issue samples are the Carve fences, not the output ones, and a long fence holds a short one', () => {
  const body = 'Text\n\n````carve\n```\nx\n```\n````\n\n```html\n<p>x</p>\n```\n\n```\n- a\n```\n'
  assert.deepEqual(issueSamples(body), ['```\nx\n```\n', '- a\n'])
})

test('ledger reasons yield their ticket references', () => {
  assert.deepEqual(ledgerRefs('drops a body; tracked at markup-carve/carve-js#3764 and markup-carve/carve#1.'), ['markup-carve/carve-js#3764', 'markup-carve/carve#1'])
})

test('findings load from a run file and from a writer run', () => {
  const html = loadFindings({ area: 'lazy', seed: 2, shard: 1, findings: [{ reduced: 'a\n', pattern: 'js|model', outputs: { js: 'x', model: 'y' } }] })
  assert.deepEqual(html.map((f) => [f.id, f.kind, f.pattern]), [['lazy-2.1.0', 'html', 'js|model']])
  const writer = loadFindings({ area: 'writer', findings: [{ reduced: 'a\n', pattern: 'canon:js|php,rs', outputs: { fmt: { verdict: 'canon:js|php,rs', fmt: {} } } }] })
  assert.equal(writer[0].kind, 'writer')
})
