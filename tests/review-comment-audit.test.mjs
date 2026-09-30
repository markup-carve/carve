import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { audit, readPages, ticketReferences, summarize } from '../scripts/review-comment-audit.mjs'

test('review comments use their own paginated endpoint', () => {
  const calls = []
  const result = audit('example', endpoint => {
    calls.push(endpoint)
    if (endpoint.startsWith('orgs/')) return [{ full_name: 'example/one' }, { full_name: 'example/two' }]
    return endpoint.includes('/one/') ? [{ id: 1, html_url: 'review', pull_request_url: 'pull', user: { login: 'author' }, body: 'Settles #7', created_at: 'created', updated_at: 'updated' }] : []
  })
  assert.deepEqual(calls, ['orgs/example/repos?type=public&per_page=100', 'repos/example/one/pulls/comments?per_page=100', 'repos/example/two/pulls/comments?per_page=100'])
  assert.equal(result.coverage[1].comments, 0)
  assert.deepEqual(result.comments[0].tickets, ['example/one#7'])
  assert.equal(result.comments[0].url, 'review')
})

test('cross-repository references do not become local issue numbers', () => {
  assert.deepEqual(ticketReferences('markup-carve/carve-rs#2212, #2645, https://github.com/markup-carve/carve/pull/2656 and markup-carve/carve-rs#2212', 'markup-carve/carve'), ['markup-carve/carve#2645', 'markup-carve/carve#2656', 'markup-carve/carve-rs#2212'])
})

test('all returned pages are decoded as separate records', () => {
  assert.deepEqual(readPages('endpoint', (command, args) => {
    assert.equal(command, 'gh')
    assert.deepEqual(args, ['api', 'endpoint', '--paginate', '--jq', '.[]|@json'])
    return '{"id":1}\n{"id":2}\n'
  }), [{ id: 1 }, { id: 2 }])
  assert.throws(() => readPages('endpoint', () => { throw new Error('API failed') }), /API failed/)
})


test('entities are not references and short repository names retain their owner', () => {
  assert.deepEqual(ticketReferences('&#123; &#125; carve-php#37 carve-rs#2212 and #2645', 'markup-carve/carve'), ['markup-carve/carve#2645', 'markup-carve/carve-php#37', 'markup-carve/carve-rs#2212'])
  assert.deepEqual(summarize({ organization: 'markup-carve', channel: 'pull-request-review-comments', coverage: [{ repository: 'markup-carve/carve', comments: 1 }], comments: [{ tickets: ['markup-carve/carve-rs#2212'], url: 'review' }] }, '2026-09-30').referencesToCarveRs2212, ['review'])
})

test('repository inventory excludes prose abbreviations and external URL fragments', () => {
  assert.deepEqual(ticketReferences('PR#12 C#1 https://example.com/a/b#12 carve-rs#2212', 'markup-carve/carve', new Set(['markup-carve/carve', 'markup-carve/carve-rs'])), ['markup-carve/carve-rs#2212'])
})
