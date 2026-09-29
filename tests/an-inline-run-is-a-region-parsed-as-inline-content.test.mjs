/*
 * PART 9 §21 decides a `%%` at a run start from a DEFINITION of what opens an
 * inline run, where it used to list five example hosts. The list was decidable
 * only for what it named; the definition has to be decidable for what it
 * excludes too, so the exclusions are measured beside the admissions
 * (carve#2564).
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

/** A region parsed as `inline_content` in its own right: the `%%` is a marker at its start. */
const runs = [
  ['heading text', '# %% c\n', '<h1></h1>'],
  ['definition term', ':: %% c\n: d\n', '<dt></dt>'],
  ['table cell', '| %% c | b |\n|---|---|\n', '<th scope="col"></th>'],
  ['figure caption', '![alt](u)\n^ %% c\n', '<figcaption></figcaption>'],
  ['admonition header', '::: note "%% c"\nbody\n:::\n', 'class="admonition-title" id="adm-1"></p>'],
  ['div label', '::: note [%% c]\nbody\n:::\n', '<p class="div-label"></p>'],
  ['link label', '[%% c](/u)\n', '<a href="/u"></a>'],
  ['span label', '[%% c]{.x}\n', '<span class="x"></span>'],
]

for (const [host, source, empty] of runs) {
  test(`a ${host} is an inline run, so a leading %% marks a comment`, () => {
    assert.ok(html(source).includes(empty), html(source))
  })
}

/* A paragraph's run starts at a line start, where PART 2's `%%` line gets there first. */
test('a paragraph never reaches the run-start case', () => {
  assert.equal(html('a\n\n%% c\n').trim(), '<p>a</p>')
})

/*
 * Markup INSIDE a run opens no run, so the first content character of an
 * emphasis span is not a run start. Both spellings, since the forced form is
 * the one that can carry a `%%` with no preceding character at all.
 */
for (const [spelling, source] of [['bare', '*%% c*\n'], ['forced', '{*%% c*}\n']]) {
  test(`a ${spelling} emphasis span opens no run of its own`, () => {
    assert.ok(html(source).includes('<strong>%% c</strong>'), html(source))
  })
}

/*
 * A slot the grammar declares literal holds no run, so neither half of the
 * rule reaches it - not the run start, and not the preceding whitespace.
 */
const literal = [
  ['alt text at a run start', '![%% c](/u)\n', 'alt="%% c"'],
  ['alt text after whitespace', '![a %% c](/u)\n', 'alt="a %% c"'],
  ['a link title', '[a](/u "b %% c")\n', 'title="b %% c"'],
  ['an attribute value', '[a]{title="b %% c"}\n', 'title="b %% c"'],
]

for (const [slot, source, kept] of literal) {
  test(`${slot} is literal, so no %% is a marker there`, () => {
    assert.ok(html(source).includes(kept), html(source))
  })
}

/*
 * The run is also what BOUNDS the comment: a run with an explicit closer ends
 * there before the line break does. Without that bound the comment would eat
 * the closer, the construct would never complete, and everything after it on
 * the line would go with it (markup-carve/carve-rs#2160).
 */
test('a run closer ends the comment before the line break does', () => {
  assert.ok(html('[a %% h](/u) t\n').includes('<a href="/u">a</a> t'), html('[a %% h](/u) t\n'))
  assert.ok(html('::: note [a\t%% h]\nbody\n:::\n').includes('<p class="div-label">a</p>'))
})
