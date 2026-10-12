import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()
const noNestedAnchors = (output) => {
  let depth = 0
  for (const [tag] of output.matchAll(/<\/?a\b[^>]*>/g)) {
    depth += tag.startsWith('</') ? -1 : 1
    assert.ok(depth >= 0 && depth <= 1, tag)
  }
  assert.equal(depth, 0)
}

test('a link-text reference keeps its ordinal and both backlinks', () => {
  const output = html('a [t[^1]][r] c [^1] b\n\n[r]: /u\n\n[^1]: n\n')
  assert.equal(output.split('\n')[0], '<p>a <a href="/u">t<sup id="fnref1">1</sup></a> c <a id="fnref1-2" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>')
  assert.match(output, /href="#fnref1" role="doc-backlink"/)
  assert.match(output, /href="#fnref1-2" role="doc-backlink"/)
  noNestedAnchors(output)
})

test('inline and reference link tails keep authored reference attributes on the sup', () => {
  for (const [link, definition] of [
    ['[t[^named]{.x data-carve-footnote-label="named"}](/u)', ''],
    ['[t[^named]{.x data-carve-footnote-label="named"}][r]', '[r]: /u\n'],
  ]) {
    const output = html(`a ${link} c [^named]\n\n${definition}\n[^named]: n\n`)
    assert.match(output, /<a href="\/u">t<sup id="fnref1" class="x" data-carve-footnote-label="named">1<\/sup><\/a>/)
    assert.match(output, /id="fnref1-2"/)
    noNestedAnchors(output)
  }
})

test('link-text references share document numbering with inline notes', () => {
  const output = html('a^[first] [t[^n] and ^[third]](/u) [^n]\n\n[^n]: second\n')
  assert.deepEqual([...output.matchAll(/id="(fnref[\d-]+)"/g)].map((m) => m[1]), ['fnref1', 'fnref2', 'fnref3', 'fnref2-2'])
  assert.match(output, /<sup id="fnref2">2<\/sup>/)
  assert.match(output, /<sup id="fnref3">3<\/sup>/)
  noNestedAnchors(output)
})

test('image alternative text and cloned headings add no link-text reference', () => {
  const image = html('![t[^n]](/u) [^n]\n\n[^n]: note\n')
  assert.match(image, /alt="t\[\^n\]"/)
  assert.equal([...image.matchAll(/id="fnref/g)].length, 1)
  const heading = html('# Head[^n]\n\n</#head>\n\n[^n]: note\n')
  assert.equal([...heading.matchAll(/id="fnref/g)].length, 1)
  noNestedAnchors(heading)
})

test('collapsed link frames use the same sup carrier', () => {
  const label = 't[^n]'
  for (const tail of ['[]']) {
    const doc = parse(`[${label}]${tail} [^n]\n\n[^n]: note\n`)
    doc.linkDefs.set(label, { url: '/u' })
    const output = renderDoc(doc)
    assert.match(output, /<a href="\/u">t<sup id="fnref1">1<\/sup><\/a>/)
    assert.match(output, /href="#fnref1-2" role="doc-backlink"/)
    noNestedAnchors(output)
  }
})

test('raw HTML comments and raw-text elements do not open a reference link', () => {
  for (const raw of [
    '<!-- <a href="/u"> -->',
    ...['script', 'style', 'textarea'].map(tag => `<${tag}><a href="/u"></${tag}>`),
  ]) {
    const output = html('```=html\n' + raw + '\n```\n\nx [^1]\n\n[^1]: n\n')
    assert.match(output, /<p>x <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1<\/sup><\/a><\/p>/)
  }
})
