import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// PART 0 S4 (carve#3885): a line that misses a note folds into the deepest open
// paragraph below it, whatever hosts the note (carve#3918, #3919, #3920).
const html = (lines) => renderDoc(parse(lines.join('\n') + '\n'))
const noteHolds = (out, text) => {
  const notes = out.slice(out.indexOf('<section'))
  return out.includes('<section') && notes.includes(text) && !out.slice(0, out.indexOf('<section')).includes(text)
}

const bodies = {
  'a paragraph': ['[^b]: text'],
  'a list after a blank': ['[^b]: text', '', '  - c2'],
  'a nested list': ['[^b]: text', '', '  - c2', '    - c3'],
  'an ordered list': ['[^b]: text', '', '  1. c2'],
  'an absorbed colon opener': ['[^b]: :::bad', '  :::'],
  'a quote': ['[^b]: > q'],
}
const hosts = {
  'the document': (n) => n,
  'a quote': (n) => n.map((l) => ('> ' + l).trimEnd()),
  'a list item': (n) => ['- x', ...n.map((l) => ('  ' + l).trimEnd())],
  'a marker line': (n) => ['- ' + n[0], ...n.slice(1).map((l) => ('  ' + l).trimEnd())],
  'an item in an item': (n) => ['- - para', ...n.map((l) => ('    ' + l).trimEnd())],
  'an item in a quote': (n) => ['> - para', ...n.map((l) => ('>   ' + l).trimEnd())],
  'an item in a description': (n) => [':: t', ': - para', ...n.map((l) => ('    ' + l).trimEnd())],
  'an item in a colon fence': (n) => ['::: note', '- para', ...n.map((l) => ('  ' + l).trimEnd())],
}

for (const [hostName, host] of Object.entries(hosts)) {
  for (const [bodyName, body] of Object.entries(bodies)) {
    test(`a column-zero line folds into a note holding ${bodyName} in ${hostName}`, () => {
      const out = html([...host(body), 'after', '', 'r[^b]'])
      assert.ok(noteHolds(out, 'after'), out)
    })
  }
}

test('a past-column line keeps the following lazy line in a marker-line note (carve#3920)', () => {
  const out = html(['- [^n]: a', 'b', '      x', 'c', '', 'r[^n]'])
  assert.match(out, /<li><\/li>/)
  assert.match(out, /<p>a\nb\nx\nc<a href="#fnref1"/)
})

test('a marker below a hosted note opens in the item, not the note', () => {
  const out = html(['- body', '', '  [^g]: n', '   - item', '', 'r[^g]'])
  assert.match(out, /<li>body\n    <ul>\n      <li>item<\/li>/)
})

test('a lone plus on a note marker line still attaches a column-zero block', () => {
  const out = html(['[^a]: +', '- a list', '', 'see[^a]'])
  assert.match(out, /^<ul>\n  <li>a list<\/li>/)
})

// A note's first-block `+` takes a non-list block at document column zero or
// at its own marker column; any other column refuses it, and the `+` stays
// text the follower folds into (CARVE-P9-067, carve#3928).
const noteBody = (out) => out.slice(out.indexOf('<li id="fn1">'))
for (const [name, lines, attached] of [
  ['an item, follower at column zero', ['- x', '  [^b]: +', 'after'], true],
  ['an item, follower at the marker column', ['- x', '  [^b]: +', '  after'], true],
  ['an item, follower at column one', ['- x', '  [^b]: +', ' after'], false],
  ['a quote, follower at column zero', ['> [^b]: +', 'after'], true],
  ['a quote, follower at the marker column', ['> [^b]: +', '  after'], true],
  ['a quote, follower at column one', ['> [^b]: +', ' after'], false],
  ['a quote, heading at column zero', ['> [^b]: +', '# after'], true],
  ['an ordered item, follower at column zero', ['1. x', '   [^b]: +', 'after'], true],
  ['a description, follower at column zero', [':: t', ': [^b]: +', 'after'], true],
]) {
  test(`a note's first-block plus in ${name} ${attached ? 'attaches' : 'is refused'}`, () => {
    const out = html([...lines, '', 'r[^b]'])
    assert.equal(/<p>\+/.test(noteBody(out)), !attached, out)
    assert.match(noteBody(out), /after/)
  })
}

test('a stacked note plus takes a column-zero follower and refuses column one', () => {
  assert.doesNotMatch(noteBody(html(['- [^b]: +', 'after', '', 'r[^b]'])), /<p>\+/)
  assert.match(noteBody(html(['- [^b]: +', ' after', '', 'r[^b]'])), /<p>\+\nafter/)
})
