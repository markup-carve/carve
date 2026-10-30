import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))
const notes = (source) => (html(source).match(/<section role="doc-endnotes"[\s\S]*<\/section>/) ?? ['none'])[0]

// CARVE-P9-067 (carve#3966): a quote's `+` attaches an unclosed fence with no
// separator line in its payload, as the fence written in the quote reads.
for (const [plus, direct] of [['> +\n', '> '], ['> > +\n', '> > ']]) {
  for (const fence of ['```', '``` x', '~~~', '````']) {
    for (const payload of [[], ['y'], ['y', 'z']]) {
      test(`"${plus.trim()}" then an unclosed "${fence}" with ${payload.length} payload lines`, () => {
        const attached = plus + [fence, ...payload].join('\n') + '\n'
        const written = [fence, ...payload].map((line) => direct + line).join('\n') + '\n'
        assert.equal(html(attached), html(written))
      })
    }
  }
}

// carve#3959 shape 2: a note's `+` moves its whole attached fence, so the
// payload and the closer stay the fence's at every nesting depth. An
// unprefixed fence does not reach a note in a quote (carve#4097).
for (const host of ['', '- a\n  ', '- a\n  - x\n    ', '> ']) {
  for (const [open, close] of [['```', '```'], ['~~~', '~~~'], ['``` x', '```']]) {
    test(`${JSON.stringify(host)}[^b]: + then a closed "${open}"`, () => {
      const source = `${host}[^b]: +\n${open}\nc\n${close}\n\nr[^b]\n`
      const out = notes(source)
      if (host === '> ') {
        assert.match(out, /<p>\+<a href/)
        assert.match(html(source), /<\/blockquote>\n<pre><code[^>]*>c\n<\/code><\/pre>/)
      } else assert.match(out, /<pre><code[^>]*>c\n<\/code><\/pre>/)
      assert.doesNotMatch(out, /\u0000/)
    })
  }
}

// carve#3959 shape 3, §10 I2: a list item interrupts the one-line paragraph a
// note's refused `+` forms, in a quote as at document level.
for (const host of ['> ', '> > ', '> - x\n>   ', '- > ']) {
  for (const marker of ['- after', '* after', '1. after', '    1. after', ' * after']) {
    test(`${JSON.stringify(host)}[^b]: + then ${JSON.stringify(marker)}`, () => {
      const out = html(`${host}[^b]: +\n${marker}\n\nr[^b]\n`)
      assert.match(notes(`${host}[^b]: +\n${marker}\n\nr[^b]\n`), /<p>\+<a href/)
      assert.match(out, /<li>after<\/li>/)
    })
  }
}

// carve#3959 shape 1, CARVE-P0-014: a note fence whose closer lies past a
// below-column line opens in an item host as it does at document level.
for (const [head, col] of [['- a', 2], ['1. a', 3]]) {
  for (const [open, close] of [['```', '```'], ['~~~', '~~~'], ['``` x', '```']]) {
    for (const below of ['c', '# h']) {
      test(`"${head}" hosting [^1] with "${open}" past ${JSON.stringify(below)}`, () => {
        const at = (k, line) => ' '.repeat(k) + line
        const item = [head, at(col, '[^1]: q'), at(col + 2, open), at(col + 2, 'p'), below, at(col + 2, close), '', 'x[^1]'].join('\n') + '\n'
        const doc = ['[^1]: q', at(2, open), at(2, 'p'), below, at(2, close), '', 'x[^1]'].join('\n') + '\n'
        assert.equal(notes(item), notes(doc))
      })
    }
  }
}

test('carve#3966', () => {
  assert.equal(html('> +\n``` x\n'), '<blockquote>\n  <pre><code class="language-x"></code></pre>\n</blockquote>')
})
