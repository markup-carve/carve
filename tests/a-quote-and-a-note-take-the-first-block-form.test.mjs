import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n[ \t]+(?=<)/g, '').replace(/>\s+</g, '><').trim()
const ref = '<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>'
const back = '<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a>'
const note = (body) => `<section role="doc-endnotes" aria-label="Footnotes"><hr><ol><li id="fn1">${body}</li></ol></section>`
const see = `<p>see${ref}</p>`

test('a quote takes one table as its first block', () => {
  assert.equal(html('> +\n|= 2-col header | < |= header |'), '<blockquote><table><thead><tr><th scope="col" colspan="2">2-col header</th><th scope="col">header</th></tr></thead></table></blockquote>')
})

test('a quote takes one flush-left paragraph', () => {
  assert.equal(html('> +\nflush'), '<blockquote><p>flush</p></blockquote>')
})

test('quote first-block markers accept trailing whitespace at every depth', () => {
  for (const marker of ['> + ', '> > + ', '> > +\t']) {
    const depth = marker.match(/>/g).length
    const expected = '<blockquote>'.repeat(depth) + '<p>flush</p>' + '</blockquote>'.repeat(depth)
    assert.equal(html(`${marker}\nflush`), expected)
  }
})

test('a glued quote plus is not a quote line', () => {
  for (const marker of ['>+', '>>+', '>> +']) {
    assert.equal(html(`${marker}\nflush`), `<p>${marker.replaceAll('>', '&gt;')}\nflush</p>`)
  }
  assert.equal(html('> >+\nflush'), '<blockquote><p>&gt;+\nflush</p></blockquote>')
})

test('a quote keeps + at end of input or before a blank', () => {
  assert.equal(html('> +'), '<blockquote><p>+</p></blockquote>')
  assert.equal(html('> +\n\nafter'), '<blockquote><p>+</p></blockquote><p>after</p>')
})

test('the inner quote takes the fenced block', () => {
  assert.equal(html('> > +\n```\nx\n```'), '<blockquote><blockquote><pre><code>x\n</code></pre></blockquote></blockquote>')
})

test('a note takes one fenced block and keeps the document body separate', () => {
  assert.equal(html('[^a]: +\n```\nx\n```\n\nsee[^a]'), see + note('<pre><code>x\n</code></pre><p>' + back + '</p>'))
})

test('a note takes one flush-left paragraph', () => {
  assert.equal(html('[^a]: +\nflush\n\nsee[^a]'), see + note('<p>flush' + back + '</p>'))
})

test('a note keeps + at end of input or before a blank', () => {
  assert.equal(html('see[^a]\n\n[^a]: +'), see + note('<p>+' + back + '</p>'))
  assert.equal(html('[^a]: +\n\nsee[^a]'), see + note('<p>+' + back + '</p>'))
})

test('non-flush-left lines retain their quote and note ownership', () => {
  assert.equal(html('> +\n flush'), '<blockquote><p>+\nflush</p></blockquote>')
  assert.equal(html('> +\n  flush'), '<blockquote><p>+\nflush</p></blockquote>')
  assert.equal(html('[^a]: +\n flush\n\nsee[^a]'), see + note('<p>+\nflush' + back + '</p>'))
  // A footnote body takes its next owned block like a list item (carve#4152).
  assert.equal(html('[^a]: +\n  flush\n\nsee[^a]'), see + note('<p>flush' + back + '</p>'))
})

test('other marker positions retain their behavior', () => {
  assert.equal(html('> +\n> x'), '<blockquote><p>+\nx</p></blockquote>')
  assert.equal(html('- +\nflush'), '<ul><li>flush</li></ul>')
  assert.equal(html(': +\nflush'), '<p>: +\nflush</p>')
  assert.equal(html('> a\n+\nflush'), '<blockquote><p>a</p><p>flush</p></blockquote>')
})

test('a nested quote opened after outer content takes its first block', () => {
  assert.equal(html('> outer\n> > +\n```\nx\n```'), '<blockquote><p>outer</p><blockquote><pre><code>x\n</code></pre></blockquote></blockquote>')
  assert.equal(html('> > a\nlazy\n> > +\nz'), '<blockquote><blockquote><p>a\nlazy\n+\nz</p></blockquote></blockquote>')
})
