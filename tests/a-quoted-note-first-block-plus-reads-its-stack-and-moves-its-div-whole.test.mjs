import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))
const notes = (source) => (html(source).match(/<section role="doc-endnotes"[\s\S]*<\/section>/) ?? ['none'])[0]

// carve#4031 shape 3, §10 I2: a note stacked on an item marker in a quote
// refuses a list follower, keeps its `+` and lets the list item interrupt.
for (const host of ['> - ', '> * ', '> 1. ', '> - [ ] ', '> - - ', '> > - ', '> - > - ']) {
  for (const marker of ['- after', '* after', '1. after', '- [ ] after']) {
    test(`${JSON.stringify(host)}[^b]: + then ${JSON.stringify(marker)}`, () => {
      const source = `${host}[^b]: +\n${marker}\n\nr[^b]\n`
      const out = html(source)
      assert.match(notes(source), /<p>\+<a href/, out)
      assert.match(out.slice(0, out.indexOf('<section')), /<li>(?:<input[^>]*> )?after<\/li>/, out)
    })
  }
}

test('carve#4031 shape 3', () => {
  const out = html('> - [^b]: +\n- after\n\nr[^b]\n')
  assert.ok(out.startsWith('<blockquote>\n  <ul>\n    <li></li>\n  </ul>\n</blockquote>\n<ul>\n  <li>after</li>\n</ul>\n'), out)
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
