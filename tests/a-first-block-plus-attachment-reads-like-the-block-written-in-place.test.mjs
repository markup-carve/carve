import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))
const notes = (source) => (html(source).match(/<section role="doc-endnotes"[\s\S]*<\/section>/) ?? ['none'])[0]

// CARVE-P9-067 (carve#3966): a quote's `+` attaches an unclosed fence with no
// separator line in its payload, as the fence written in the quote reads. The
// follower carries the prefixes of the quotes around the host (carve#4409).
for (const [plus, direct, carried] of [['> +\n', '> ', ''], ['> > +\n', '> > ', '> ']]) {
  for (const fence of ['```', '``` x', '~~~', '````']) {
    for (const payload of [[], ['y'], ['y', 'z']]) {
      test(`"${plus.trim()}" then an unclosed "${fence}" with ${payload.length} payload lines`, () => {
        const attached = plus + [fence, ...payload].map((line) => carried + line).join('\n') + '\n'
        const written = [fence, ...payload].map((line) => direct + line).join('\n') + '\n'
        assert.equal(html(attached), html(written))
      })
    }
  }
}

test('a fence without the outer quote prefix is refused by "> > +"', () => {
  assert.equal(html('> > +\n```\ny\n'), html('> > Z\n```\ny\n').replace('Z', '+'))
})

// carve#3959 shape 2: a note's `+` moves its whole attached fence, so the
// payload and the closer stay the fence's at every nesting depth. An
// unprefixed fence does not reach a note in a quote (carve#4097).
for (const [host, pad] of [['', ''], ['- a\n  ', '  '], ['- a\n  - x\n    ', '    '], ['> ', '']]) {
  for (const [open, close] of [['```', '```'], ['~~~', '~~~'], ['``` x', '```']]) {
    test(`${JSON.stringify(host)}[^b]: + then a closed "${open}"`, () => {
      const source = `${host}[^b]: +\n${pad}${open}\n${pad}c\n${pad}${close}\n\nr[^b]\n`
      const out = notes(source)
      if (host === '> ') {
        assert.match(out, /<p>\+<a href/)
        assert.match(html(source), /<\/blockquote>\n<pre><code[^>]*>c\n<\/code><\/pre>/)
      } else assert.match(out, /<pre><code[^>]*>c\n<\/code><\/pre>/)
      assert.doesNotMatch(out, /\u0000/)
    })
  }
}

test('a fence off the marker column of a hosted note is refused', () => {
  const source = '- a\n  [^b]: +\n```\nc\n```\n\nr[^b]\n'
  assert.match(notes(source), /<p>\+<a href/)
  assert.match(html(source), /<\/ul>\n<pre><code>c\n<\/code><\/pre>/)
})

test('a prefixed fence reaches a note in a quote', () => {
  assert.match(notes('> [^b]: +\n> ```\n> c\n> ```\n\nr[^b]\n'), /<pre><code>c\n<\/code><\/pre>/)
})

// A note's refused `+` is a letter, so a marker line below it reads as it does
// below any letter.
for (const host of ['> ', '> > ', '> - x\n>   ', '- > ']) {
  for (const marker of ['- after', '* after', '1. after', '    1. after', ' * after']) {
    test(`${JSON.stringify(host)}[^b]: + then ${JSON.stringify(marker)}`, () => {
      const source = (end) => `${host}[^b]: ${end}\n${marker}\n\nr[^b]\n`
      assert.equal(html(source('+')), html(source('Z')).replace('Z', '+'))
    })
  }
}

test('a list carrying the quote prefix is the block of a note in that quote', () => {
  assert.match(notes('> [^b]: +\n> - after\n\nr[^b]\n'), /<ul>\s*<li>after<\/li>\s*<\/ul>/)
})

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
