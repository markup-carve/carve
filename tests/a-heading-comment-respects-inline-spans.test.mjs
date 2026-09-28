import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, Refuse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

for (const level of [1, 2, 3, 4, 5, 6]) {
  test(`heading level ${level} keeps code content and derives its id from it`, () => {
    const source = `${'#'.repeat(level)} a \`x %% b\` c\n`
    assert.equal(parse(source).blocks[0].text, 'a `x %% b` c')
    assert.equal(html(source), `<section id="a-x-b-c">\n  <h${level}>a <code>x %% b</code> c</h${level}>\n</section>`)
  })
}

for (const [name, text, expected] of [
  ['wider code delimiter', 'a ``x ` %% b`` c', 'a <code>x ` %% b</code> c'],
  ['unclosed code', 'a `x %% b', 'a <code>x %% b</code>'],
  ['raw HTML', 'a `x %% b`{=html} c', 'a x %% b c'],
  ['literal', 'a !`x %% b` c', 'a x %% b c'],
  ['math', 'a $`x %% b` c', 'a <span class="math inline" role="math">\\(x %% b\\)</span> c'],
  ['bounded emphasis comment', 'a {*b %% c*} d', 'a <strong>b</strong> d'],
  ['bounded link comment', 'a [x %% y](/u) z', 'a <a href="/u">x</a> z'],
  ['link label', 'a [`x %% b`](/u) c', 'a <a href="/u"><code>x %% b</code></a> c'],
  ['outside comment', 'a `x %% b` c %% hidden', 'a <code>x %% b</code> c'],
  ['tab in code', 'a `x\t%% b` c', 'a <code>x\t%% b</code> c'],
]) {
  test(`heading comments respect ${name}`, () => {
    assert.ok(html(`# ${text}\n`).includes(`<h1>${expected}</h1>`))
  })
}

test('heading comments retain their host boundaries', () => {
  for (const text of ['a %% hidden', 'a\t%% hidden']) {
    assert.equal(html(`# ${text}\n`), '<section id="a">\n  <h1>a</h1>\n</section>')
  }
  assert.equal(html('# %% hidden\n'), '<section id="s">\n  <h1></h1>\n</section>')
  assert.match(html('# a \\%% b\n'), /<h1>a %% b<\/h1>/)
})

test('a heading inside a container uses the preserved text for its own id', () => {
  assert.equal(html('> # a `x %% b` c\n'),
    '<blockquote>\n  <h1 id="a-x-b-c">a <code>x %% b</code> c</h1>\n</blockquote>')
})

for (const [host, source] of [
  ['paragraph', 'a `x %% b` c\n'],
  ['definition term', ':: a `x %% b` c\n: desc\n'],
  ['table cell', '| a `x %% b` c |\n'],
  ['figure caption', '![alt](u)\n^ a `x %% b` c\n'],
  ['div title', '::: note [a `x %% b` c]\nbody\n:::\n'],
]) {
  test(`${host} also preserves the code span`, () => {
    assert.ok(html(source).includes('a <code>x %% b</code> c'), html(source))
  })
}

test('discarded heading comments do not trigger inline parser limits', () => {
  for (const payload of ['`'.repeat(9), '['.repeat(201), '['.repeat(2000)]) {
    for (const prefix of ['a %% ', 'a\t%% ']) {
      assert.equal(html(`# ${prefix}${payload}\n`), '<section id="a">\n  <h1>a</h1>\n</section>')
    }
    assert.equal(html(`# %% ${payload}\n`), '<section id="s">\n  <h1></h1>\n</section>')
  }
})

test('live heading content still refuses beyond inline parser limits', () => {
  for (const text of ['`'.repeat(9) + 'x %% y', '['.repeat(2000) + 'x %% y']) {
    assert.throws(() => html(`# ${text}\n`), Refuse)
  }
})
