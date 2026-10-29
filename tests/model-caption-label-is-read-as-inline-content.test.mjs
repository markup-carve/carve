import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const ref = (src) => /See (<a [\s\S]*?<\/a>)\./.exec(html(src))[1]

test('a crossref shows the rendered label, not its source (carve#4081 shape 12)', () => {
  assert.equal(ref('{#tbl-r}\n||\n^ \\{ #: Stock\nSee </#tbl-r>.\n'), '<a href="#tbl-r">{ 1</a>')
  assert.equal(ref('{#t}\n||\n^ *Fig* #: S\n\nSee </#t>.\n'), '<a href="#t"><strong>Fig</strong> 1</a>')
  assert.equal(ref('{#t}\n||\n^ a&b #: S\n\nSee </#t>.\n'), '<a href="#t">a&amp;b 1</a>')
  assert.equal(ref('{#t}\n||\n^ a<b #: S\n\nSee </#t>.\n'), '<a href="#t">a&lt;b 1</a>')
})

test('a link in the label is flattened in the crossref text', () => {
  assert.equal(ref('{#t}\n||\n^ [x](u) #: S\n\nSee </#t>.\n'), '<a href="#t">x 1</a>')
})

test('a footnote reference in the label is not cloned', () => {
  assert.equal(ref('{#t}\n||\n^ x[^1] #: S\n\nSee </#t>.\n\n[^1]: n\n'), '<a href="#t">x 1</a>')
})

test('captions whose labels have the same plain text share one counter (CARVE-P2-022)', () => {
  for (const [a, b] of [['*Fig*', 'Fig'], ['\\{', '{'], ['`c`', 'c'], ['a\\*b', 'a*b']]) {
    assert.match(html(`||\n^ ${a} #: x\n\n||\n^ ${b} #: y\n`), / 2: y<\/caption>/, `${a} / ${b}`)
  }
})

test('labels with different plain text keep separate counters', () => {
  assert.match(html('||\n^ Fig #: x\n\n||\n^ Fig ure #: y\n'), / 1: y<\/caption>/)
})

test('a reference link in the label keeps its text in the crossref', () => {
  assert.equal(ref('{#t}\n||\n^ [x][u] #: S\n\nSee </#t>.\n\n[u]: http://e\n'), '<a href="#t">x 1</a>')
  assert.equal(ref('{#t}\n||\n^ ![x][u] #: S\n\nSee </#t>.\n\n[u]: a.png\n'), '<a href="#t"><img src="a.png" alt="x"> 1</a>')
})
