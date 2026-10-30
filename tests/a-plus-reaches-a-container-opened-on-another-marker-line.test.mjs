/*
 * A `+` at the marker column of a container opened on another container's marker
 * line reads the same with and without a quote around the document.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))
const compact = (html) => html.replace(/\s*\n\s*/g, ' ').replace(/> </g, '><')
const quote = (source) => source.split('\n').map((line, at, all) => at === all.length - 1 ? line : line === '' ? '>' : `> ${line}`).join('\n')

test('an item on a description marker line takes the block after its +', () => {
  assert.match(compact(render(':: t\n: - a\n  +\n  p\n')), /<dd><ul><li>a p ?<\/li><\/ul><\/dd>/)
})

test('an item on a note marker line reads its + at the note body column', () => {
  assert.match(compact(render('[^n]: - a\n  +\n  p\n\nr[^n]\n')), /<li id="fn1"><ul><li>a p ?<\/li><\/ul>/)
})

test('a note on an item marker line takes the block after its +', () => {
  const html = compact(render('- [^m]: x\n  +\n  > q\n\nr[^m]\n'))
  assert.match(html, /^<ul><li><\/li><\/ul>/)
  assert.match(html, /<li id="fn1"><p>x<\/p><blockquote><p>q<\/p><\/blockquote>/)
})

test('a + with no following block stays text', () => {
  assert.match(compact(render('- [^m]: x\n  +\n\n  p\n\nr[^m]\n')), /<p>x \+/)
})

test('quoting a document only adds the quote', () => {
  const hosts = ['- ', '1. ', ':: t\n: ', '[^n]: ', '- [ ] ']
  const leaves = ['+', '```', ':::', 'p', '- +', ':: u\n: +', '[^m]: +', '- ```']
  const followers = ['+\np', '+\n> q', '+\n# H', '+\n```\nx\n```', '+\n- y', '+\n{.c}\np', '+\n| a |', '+']
  const tails = ['', '\nafter', '\n\nafter']
  const normal = (html) => html.replace(/<section id="[^"]*">/g, '').replace(/<\/section>/g, '').replace(/<h1 id="[^"]*">/g, '<h1>')
  let count = 0
  for (const host of hosts) for (const leaf of leaves) for (const follower of followers) for (let column = 0; column <= 3; column++) for (const tail of tails) {
    const body = follower.split('\n').map((line) => ' '.repeat(column) + line).join('\n')
    const source = `${host}${leaf}\n${body}${tail}${host.startsWith('[^') ? '\n\nr[^n]' : ''}\n`
    const split = (html) => {
      const at = html.indexOf('<section role="doc-endnotes"')
      return at < 0 ? [html, ''] : [html.slice(0, at), html.slice(at)]
    }
    const [plain, plainNotes] = split(compact(render(source)))
    const [quoted, quotedNotes] = split(compact(render(quote(source))))
    assert.equal(normal(quoted), normal(`<blockquote>${plain}</blockquote>`), JSON.stringify(source))
    assert.equal(quotedNotes, plainNotes, JSON.stringify(source))
    count++
  }
  assert.equal(count, 3840)
})
