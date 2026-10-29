import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// A footnote body takes a lazy line like every container (carve#3885, PART 0
// S4): an unmarked or below-column line folds into the note when the note's
// last block leaves a paragraph open, and leaves every container otherwise.
const F = '`'.repeat(3)
const contents = [
  ['a paragraph', 'note', [], true],
  ['a continued paragraph', 'note', ['more'], true],
  ['a second paragraph', 'note', ['', 'more'], true],
  ['a nested list', '- x', [], true],
  ['a quote', '> q', [], true],
  // carve#4018: a closerless opener interrupts too, so no paragraph stays open.
  ['a closerless fence line', 'note', ['~~~', 'x'], false],
  ['a heading', '# h', [], false],
  ['a table', '| a |', [], false],
  ['a closed fence', 'note', [F, 'x', F], false],
  ['an open fence', 'note', ['', '~~~', 'x'], false],
  ['a comment', 'note', ['%% c'], false],
  ['a closed fence in a child item', ':: term', ['- y', '  ~~~', '  x', '  ~~~'], false],
]
const hosts = {
  'the document': (n) => n,
  'a quote': (n) => n.map((l) => '> ' + l),
  'a nested quote': (n) => n.map((l) => '> > ' + l),
  'a list item': (n) => ['- a', ...n.map((l) => '  ' + l)],
  'an ordered item': (n) => ['1. a', ...n.map((l) => '   ' + l)],
  'a marker line': (n) => ['- ' + n[0], ...n.slice(1).map((l) => '  ' + l)],
  'a task item': (n) => ['- [ ] a', ...n.map((l) => '  ' + l)],
  'a description': (n) => [':: t', ': d', ...n.map((l) => '  ' + l)],
  'a description marker line': (n) => [':: t', ': ' + n[0], ...n.slice(1).map((l) => '  ' + l)],
  'a sub-item': (n) => ['- a', '  - b', ...n.map((l) => '    ' + l)],
  'a quoted item': (n) => ['> - a', ...n.map((l) => '>   ' + l)],
  'a quote in an item': (n) => ['- > a', ...n.map((l) => '  > ' + l)],
  'a note': (n) => ['[^m]: m', ...n.map((l) => '  ' + l)],
  'a description in an item': (n) => ['- :: t', '  : d', ...n.map((l) => '    ' + l)],
}
const where = (html) => {
  const at = html.indexOf('tail')
  const notes = html.indexOf('doc-endnotes')
  return notes >= 0 && at > notes ? 'note' : 'body'
}

for (const [content, first, extra, open] of contents) {
  for (const [host, wrap] of Object.entries(hosts)) {
    test(`a lazy line after ${content} in a note in ${host} ${open ? 'joins the note' : 'leaves'}`, () => {
      for (const tail of ['tail', ' tail']) {
        const note = ['[^n]: ' + first, ...extra.map((l) => (l === '' ? '' : '  ' + l))]
        const lines = wrap(note).map((l) => l.replace(/ +$/, ''))
        const source = `r[^n] r[^m]\n\n${lines.join('\n')}\n${tail}\n`
        assert.equal(where(renderDoc(parse(source))), open ? 'note' : 'body', source)
      }
    })
  }
}

test('a blank line or a heading below the note is never lazy', () => {
  for (const tail of ['\ntail', '# tail']) {
    const html = renderDoc(parse(`r[^n]\n\n- a\n  [^n]: note\n${tail}\n`))
    assert.equal(where(html), 'body')
  }
})

test('a list in a note in a description in an item stays in the note', () => {
  const html = renderDoc(parse('r[^n]\n\n- :: t\n  : d\n    [^n]: note\n      - y\n'))
  assert.match(html, /<dd>d<\/dd>/)
  assert.match(html, /<p>note\n- y<a href="#fnref1"/)
})
