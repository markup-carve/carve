import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

// Math content is a code span's verbatim text (PART 9 §18), so PART 9R R3
// does not scan it, as it does not scan code.
test('an abbreviation term in inline math stays text', () => {
  assert.equal(html('*[A]: a\n\n$`A`\n'),
    '<p><span class="math inline" role="math">\\(A\\)</span></p>')
})

test('an abbreviation term in display math with attributes stays text', () => {
  assert.equal(html('*[A]: a\n\n$$`A`{#m .c}\n'),
    '<p><span id="m" class="math display c" role="math">\\[A\\]</span></p>')
})

test('the same term outside the math span still expands', () => {
  assert.equal(html('*[A]: a\n\n$`x A y` A\n'),
    '<p><span class="math inline" role="math">\\(x A y\\)</span> <abbr title="a">A</abbr></p>')
})

test('an authored span with the math classes still expands', () => {
  assert.equal(html('*[A]: a\n\n[A]{.math .inline}\n'),
    '<p><span class="math inline"><abbr title="a">A</abbr></span></p>')
  assert.equal(html('*[A]: a\n\n[A]{data-class="math inline"}\n'),
    '<p><span data-class="math inline"><abbr title="a">A</abbr></span></p>')
})
