/*
 * PART 9 §21 grants a trailing `%%` marker three properties the oracle's inline
 * layer used to withhold while its heading path granted all three: a tab
 * separates, the whole separating run is consumed, and a `%%` that starts the
 * inline run needs no separator. A leaf host is the discriminator - a
 * definition term, a table cell, a figure caption, a div label and a link
 * label each begin their run mid-line, where no `%%` line at the block layer
 * can stand in (carve#2552).
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

/** Each host, as a function from its inline run to the source and the expected element. */
const hosts = [
  ['paragraph', (run) => [`${run}\n`, (text) => `<p>${text}</p>`]],
  ['definition term', (run) => [`:: ${run}\n: d\n`, (text) => `<dt>${text}</dt>`]],
  ['table cell', (run) => [`| ${run} | b |\n|---|---|\n`, (text) => `<th scope="col">${text}</th>`]],
  ['figure caption', (run) => [`![alt](u)\n^ ${run}\n`, (text) => `<figcaption>${text}</figcaption>`]],
  ['div label', (run) => [`::: note [${run}]\nbody\n:::\n`, (text) => `<p class="div-label">${text}</p>`]],
]

for (const [host, build] of hosts) {
  test(`a tab separates a trailing comment in a ${host}`, () => {
    const [source, element] = build('a\t%% hidden')
    assert.ok(html(source).includes(element('a')), html(source))
  })

  test(`the whole separating run goes with a trailing comment in a ${host}`, () => {
    for (const separator of ['  ', ' \t', '\t ', '\t\t']) {
      const [source, element] = build(`a${separator}%% hidden`)
      assert.ok(html(source).includes(element('a')), `${JSON.stringify(separator)}: ${html(source)}`)
    }
  })

  test(`a comment starting the inline run of a ${host} needs no separator`, () => {
    const [source, element] = build('%% hidden')
    // A paragraph's run starts at a line start, so the block layer's `%%` line
    // claims it first and there is no paragraph left to hold an empty run.
    if (host === 'paragraph') {
      assert.equal(html(source), '')
      return
    }
    assert.ok(html(source).includes(element('')), html(source))
  })

  test(`a ${host} keeps a doubled percent that no whitespace precedes`, () => {
    const [source, element] = build('a%%b and 50%% stay')
    assert.ok(html(source).includes(element('a%%b and 50%% stay')), html(source))
  })

  test(`a ${host} keeps an escaped marker`, () => {
    const [source, element] = build('a \\%% b')
    assert.ok(html(source).includes(element('a %% b')), html(source))
  })

  // The opacity #2547 established, re-asserted per host: widening the separator
  // must not reach inside a verbatim run.
  test(`a code span in a ${host} still passes a tabbed marker through`, () => {
    const [source, element] = build('a `x\t%% b` c')
    assert.ok(html(source).includes(element('a <code>x\t%% b</code> c')), html(source))
  })
}

test('a heading reads the same three properties', () => {
  assert.equal(html('# a\t%% hidden\n'), '<section id="a">\n  <h1>a</h1>\n</section>')
  assert.equal(html('# a  %% hidden\n'), '<section id="a">\n  <h1>a</h1>\n</section>')
  assert.equal(html('# %% hidden\n'), '<section id="s">\n  <h1></h1>\n</section>')
})

// The `%%%` fence is a LINE form (PART 2), so a mid-run `%%%` is a `%%` marker
// whose third percent is the first character of the consumed remainder. The
// heading path used to refuse it while every other host consumed it.
test('a third percent is comment text, not a refusal', () => {
  assert.equal(html('# a\t%%% b\n'), '<section id="a">\n  <h1>a</h1>\n</section>')
  assert.equal(html('# %%% b\n'), '<section id="s">\n  <h1></h1>\n</section>')
  assert.ok(html(':: a\t%%% b\n: d\n').includes('<dt>a</dt>'))
})

test('a comment does not reach past its own line', () => {
  assert.equal(html('a %% hidden\nnext\n'), '<p>a\nnext</p>')
})

/*
 * The separator and the plain-whitespace token must be the SAME run rule. With
 * `spComment` taking a run and `inlineSpace` taking one character, a whitespace
 * run that no `%%` follows is re-scanned from one character further in at every
 * retry, which is quadratic on ordinary prose. A timing assertion would measure
 * the machine's load instead, so this reads the grammar.
 */
test('the plain-whitespace token consumes the same run the separator does', () => {
  const grammar = readFileSync(new URL('../resources/carve-core.ohm', import.meta.url), 'utf8')
  const rule = (name) => {
    const m = grammar.match(new RegExp(`^\\s*${name}\\s*(<[^>]*>)?\\s*=(.*)$`, 'm'))
    assert.ok(m, `no ${name} rule in resources/carve-core.ohm`)
    return m[2].trim()
  }
  assert.equal(rule('sepRun'), '(" " | "\\t")+')
  assert.equal(rule('inlineSpace'), 'sepRun')
  for (const name of ['spComment', 'fSpComment', 'biSpComment']) {
    assert.match(rule(name), /^sepRun /, `${name} must take the shared separator run`)
  }
})
