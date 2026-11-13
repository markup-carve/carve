import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))
const endnotes = (source) => /<section role="doc-endnotes"[\s\S]*<\/section>/.exec(html(source))?.[0] ?? ''
const sameLists = (out) => out.replace(/<ol[^>]*>|<ul>/g, '<L>').replace(/<\/ol>|<\/ul>/g, '</L>')

const NOTE_BODIES = {
  list: ['  - z'], ordered: ['  1. z'], quote: ['  > z'], heading: ['  # z'], fence: ['  ```', '  c', '  ```'],
  paragraph: ['', '  z2'], attribute: ['  {#i}'], continuation: ['  z'], 'list paragraph': ['  - z', '', '    more'],
  'fence with a blank': ['  ```', '  a', '', '  c', '  ```'], 'indented fence': ['   ```', '', '   c', '   ```'], 'indented list': ['   - z'],
}
const TRAILS = { 'at the marker column': ['q'], 'one column in': [' q'], 'at the body column': ['  q'], none: [] }
const OUTERS = { top: [], bullet: ['- '], ordered: ['1. '], nested: ['1. ', '- '] }

function documentFor(outer, host, body, trail) {
  const lines = []
  let col = 0
  for (const marker of outer) {
    lines.push(' '.repeat(col) + marker + 'x')
    col += marker.length
  }
  const at = (text) => text === '' ? '' : ' '.repeat(col) + text
  if (host !== null) lines.push(at(host))
  lines.push(at('[^m]: n'), ...body.map(at), ...trail.map(at), '', 'p[^m]')
  return lines.join('\n') + '\n'
}

test('a note at a 1. host marker column keeps a list in its body (carve#5993)', () => {
  assert.equal(html('1. x\n   1. +\n   [^m]: n\n     - z\n   q\n\np[^m]\n'), `<ol>
  <li>x
    <ol>
      <li></li>
    </ol>
  </li>
</ol>
<p>p<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n</p>
      <ul>
        <li>z
q</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>`)
})

test('a refused note plus keeps no lazy paragraph past a sibling note (carve#5994)', () => {
  assert.equal(html('- x\n   - y\n     [^h]: +\n     [^m]: n\n       {#i}\n      q\n\np[^m][^h]\n'), `<ul>
  <li>x
    <ul>
      <li>y
        q
      </li>
    </ul>
  </li>
</ul>
<p>p<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p><a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>`)
})

test('a passed note reads the same with and without the plus host, at every host width', () => {
  for (const outer of Object.values(OUTERS)) {
    for (const body of Object.values(NOTE_BODIES)) {
      for (const trail of Object.values(TRAILS)) {
        const plain = endnotes(documentFor(outer, null, body, trail))
        const widths = new Set()
        for (const host of ['- +', '1. +', '10. +']) {
          const source = documentFor(outer, host, body, trail)
          assert.equal(endnotes(source), plain, source)
          widths.add(sameLists(html(source)))
        }
        assert.equal(widths.size, 1, documentFor(outer, '1. +', body, trail))
      }
    }
  }
})

test('a refused note plus reads a sibling note as the lines without it do', () => {
  for (const outer of Object.values(OUTERS)) {
    for (const body of Object.values(NOTE_BODIES)) {
      for (const trail of Object.values(TRAILS)) {
        const source = documentFor(outer, '[^h]: +', body, trail)
        assert.equal(endnotes(source), endnotes(documentFor(outer, null, body, trail)), source)
      }
    }
  }
})
