import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))
const notes = (source) => (html(source).match(/<section role="doc-endnotes"[\s\S]*<\/section>/) ?? ['none'])[0]

// carve#4031 shape 3, carve#4409: a note stacked on an item marker in a quote takes a
// list at its own column behind the prefixes; an unprefixed one folds into its paragraph.
for (const host of ['> - ', '> * ', '> 1. ', '> - [ ] ', '> - - ', '> > - ', '> - > - ']) {
  for (const marker of ['- after', '* after', '1. after', '- [ ] after']) {
    test(`${JSON.stringify(host)}[^b]: + then ${JSON.stringify(marker)}`, () => {
      const source = `${host}[^b]: +\n${marker}\n\nr[^b]\n`
      assert.ok(notes(source).includes(`<p>+\n${marker}<a href`), html(source))
    })
    test(`${JSON.stringify(host)}[^b]: + takes ${JSON.stringify(marker)} at its column`, () => {
      const source = `${host}[^b]: +\n${host.replace(/[^> ]/g, ' ')}${marker}\n\nr[^b]\n`
      assert.match(notes(source), /<li>(?:<input[^>]*> )?after<\/li>/, html(source))
    })
  }
}

test('carve#4031 shape 3', () => {
  const out = html('> - [^b]: +\n- after\n\nr[^b]\n')
  assert.ok(out.startsWith('<blockquote>\n  <ul>\n    <li></li>\n  </ul>\n</blockquote>\n<p>r'), out)
})

// carve#4031 shape 4, CARVE-P9-067: a colon fence a note's `+` pulls moves
// whole. In a quote an unprefixed div does not reach the note, so the `+`
// stays text and the div follows the quote (carve#4097).
for (const host of ['', '> ', '> > ', '- > ', '> - x\n>   ']) {
  for (const [body, tail] of [[['y'], []], [['y'], [':::']], [['y', '', 'z'], [':::']], [['- y'], [':::']]]) {
    test(`${JSON.stringify(host)}[^b]: + then a div holding ${JSON.stringify(body)}${tail.length ? ', closed' : ''}`, () => {
      const source = `${host}[^b]: +\n${['::: d', ...body, ...tail].join('\n')}\n\nr[^b]\n`
      const reference = `[^b]: +\n${['::: d', ...body, ...tail].join('\n')}\n\nr[^b]\n`
      if (host === '') return assert.equal(notes(source), notes(reference), html(source))
      const out = html(source)
      assert.match(notes(source), /<p>\+<a href/, out)
      assert.match(out.slice(0, out.indexOf('<section')), /<\/blockquote>\n(?:[\s\S]*\n)?<div class="d">/, out)
    })
  }
}

test('carve#4031 shape 4', () => {
  assert.match(notes('[^b]: +\n::: d\ny\n\nr[^b]\n'), /<div class="d">\n\s*<p>y<\/p>\n\s*<\/div>/)
  assert.match(notes('> [^b]: +\n::: d\ny\n\nr[^b]\n'), /<p>\+<a href/)
})
