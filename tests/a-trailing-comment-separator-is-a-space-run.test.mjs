// CARVE-P9-041 and carve#3013: only a space run separates a trailing comment; tabs are content.
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
  test(`only the whole space run separates a trailing comment in a ${host}`, () => {
    for (const [separator, expected] of [[' ', 'a'], ['  ', 'a'], ['\t ', 'a\t'], ['\t', 'a\t%% hidden'], ['\t\t', 'a\t\t%% hidden'], [' \t', 'a \t%% hidden']]) {
      const [source, element] = build(`a${separator}%% hidden`)
      assert.ok(html(source).includes(element(expected)), `${JSON.stringify(separator)}: ${html(source)}`)
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

  test(`a ${host} keeps a doubled percent that no space precedes`, () => {
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

test('a heading reads the same separator and run-start rules', () => {
  assert.equal(html('# a\t%% hidden\n'), '<section id="a-hidden">\n  <h1>a\t%% hidden</h1>\n</section>')
  assert.equal(html('# a\t %% hidden\n'), '<section id="a">\n  <h1>a\t</h1>\n</section>')
  for (const separator of ['\t\t', ' \t']) {
    assert.equal(html(`# a${separator}%% hidden\n`), `<section id="a-hidden">\n  <h1>a${separator}%% hidden</h1>\n</section>`)
  }
  assert.equal(html('# a  %% hidden\n'), '<section id="a">\n  <h1>a</h1>\n</section>')
  assert.equal(html('# %% hidden\n'), '<section id="s">\n  <h1></h1>\n</section>')
})

// The `%%%` fence is a LINE form (PART 2), so a mid-run `%%%` is a `%%` marker
// whose third percent is the first character of the consumed remainder. The
// heading path used to refuse it while every other host consumed it.
test('a third percent is comment text, not a refusal', () => {
  assert.equal(html('# a %%% b\n'), '<section id="a">\n  <h1>a</h1>\n</section>')
  assert.equal(html('# %%% b\n'), '<section id="s">\n  <h1></h1>\n</section>')
  assert.ok(html(':: a %%% b\n: d\n').includes('<dt>a</dt>'))
})

test('a comment does not reach past its own line', () => {
  assert.equal(html('a %% hidden\nnext\n'), '<p>a\nnext</p>')
})

// The shared space run prevents quadratic rescans while tabs remain ordinary inline text.
test('the plain-whitespace token consumes the same run the separator does', () => {
  const grammar = readFileSync(new URL('../resources/carve-core.ohm', import.meta.url), 'utf8')
  const rule = (name) => {
    const m = grammar.match(new RegExp(`^\\s*${name}\\s*(<[^>]*>)?\\s*=(.*)$`, 'm'))
    assert.ok(m, `no ${name} rule in resources/carve-core.ohm`)
    return m[2].trim()
  }
  assert.equal(rule('sepRun'), '" "+')
  assert.equal(rule('inlineSpace'), 'sepRun | "\\t"+')
  for (const name of ['spComment', 'fSpComment', 'biSpComment']) {
    assert.match(rule(name), /^sepRun /, `${name} must take the shared separator run`)
  }
})
