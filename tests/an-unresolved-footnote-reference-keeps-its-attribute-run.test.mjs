// carve#4816 (ruling A): an unresolved `[^label]` keeps its attribute run as text, like a link.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('both unresolved forms keep the run', () => {
  assert.equal(html('x[^n]{.c} and [t][m]{.c}\n'), '<p>x[^n]{.c} and [t][m]{.c}</p>')
})

test('the run is the source, escaped and not reparsed', () => {
  assert.equal(html('x[^n]{a="<b>"}{.c}\n'), '<p>x[^n]{a="&lt;b&gt;"}{.c}</p>')
  assert.equal(html('x[^n]{a="*b*" title="--"}\n'), '<p>x[^n]{a="*b*" title="--"}</p>')
})

test('every inline position keeps it', () => {
  assert.equal(html('[a[^n]{.c}](u)\n'), '<p><a href="u">a[^n]{.c}</a></p>')
  assert.match(html('| x[^n]{.c} |\n'), /<td>x\[\^n\]\{\.c\}<\/td>/)
  assert.match(html('# x[^n]{.c}\n'), /<h1>x\[\^n\]\{\.c\}<\/h1>/)
})

test('a resolved reference still takes the run as attributes', () => {
  assert.match(html('x[^1]{.c}\n\n[^1]: b\n'), /role="doc-noteref" class="c"><sup>1<\/sup>/)
})

test('an id in the kept run reserves nothing', () => {
  assert.match(html('x[^n]{#i}\n\n## i\n'), /<p>x\[\^n\]\{#i\}<\/p>\s*<section id="i">/)
})
