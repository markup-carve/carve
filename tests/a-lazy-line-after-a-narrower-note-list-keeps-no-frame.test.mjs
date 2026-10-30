import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))
const back = /\s*<a href="#fnref1" role="doc-backlink"[^>]*>↩<\/a>/
const flat = html => html.replace(back, '').replace(/<p><\/p>/, '').split('\n').map(l => l.trim()).filter(Boolean).join('\n')
const noteBody = html => flat(html.match(/<li id="fn1">([\s\S]*)<\/li>\s*<\/ol>\s*<\/section>/)[1])
const ddBody = html => flat(html.match(/<dd>([\s\S]*)<\/dd>/)[1])

// A wider list before a narrower one left the walk's LAZY frame behind a space (carve#4259, fixed by #4275).
const firsts = ['1. +', '1. a', '10. a', '1) a', '* - +', 'x\n\n  1. a', 'i. a']
const seconds = ['- y', '* y', '- [ ] y', '- y\n    - z']
const tails = ['tail', ' tail', 'tail\nmore', '> q']

test('a lazy line after a narrower note list folds into its item as in the description twin', () => {
  for (const f of firsts) for (const s of seconds) for (const t of tails) {
    const body = `${f}\n  ${s}\n${t}`
    const note = render(`[^a]: ${body}\n\nr[^a]\n`)
    assert.ok(!note.includes('\u0000'), body)
    assert.equal(noteBody(note), ddBody(render(`:: t\n: ${body}\n`)), body)
  }
})

// A blank line and a later paragraph do not move the column the readers' list took.
test('a lazy line after a blank and a later paragraph still folds as in the description twin', () => {
  for (const f of ['1. +', '10. a']) for (const s of ['- y', '* y']) for (const mid of ['\n\n     z', '\n\n       z', '\n\n  w', '\n\n  10. b']) for (const t of ['tail', '   tail']) {
    const body = `${f}\n  ${s}${mid}\n${t}`
    const note = render(`[^a]: ${body}\n\nr[^a]\n`)
    assert.ok(!note.includes('\u0000'), body)
    assert.equal(noteBody(note), ddBody(render(`:: t\n: ${body}\n`)), body)
  }
})

test('the reproduction folds tail into the bullet item', () => {
  const note = noteBody(render('[^a]: 1. +\n  - y\ntail\n\nr[^a]\n'))
  assert.equal(note, '<ol>\n<li>+</li>\n</ol>\n<ul>\n<li>y\ntail</li>\n</ul>')
})
