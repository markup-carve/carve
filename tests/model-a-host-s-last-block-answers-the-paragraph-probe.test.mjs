import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

for (const body of [
  ':: t\n  : # H\n    # I', ':: t\n  : | a |\n    | b |', ':: t\n  : ---\n    ---', ':: t\n  : > # a\n    > # b',
  ':::\n  - {.x}', '- # H\n    # I', '- :::\n    :::',
]) {
  test(`a line below ${JSON.stringify(body)} in a note leaves the note`, () => {
    assert.match(render(`[^n]: ${body}\nz\n\n[^n]\n`), /^<p>z<\/p>/)
  })
}

for (const body of [':: t\n  : x\n    y', '- a\n    b', '- :::\n    x']) {
  test(`a line below the paragraph of ${JSON.stringify(body)} in a note stays in it`, () => {
    assert.doesNotMatch(render(`[^n]: ${body}\nz\n\n[^n]\n`), /^<p>z<\/p>/)
  })
}

for (const chain of ['- :::\n    :::', '- :::\n    x\n    :::', '- [ ] > :::\n    > :::', '- ```\n    ```']) {
  for (const pad of ['', ' ']) {
    test(`a ${JSON.stringify(pad)} line below ${JSON.stringify(chain)} in a description leaves it`, () => {
      assert.match(render(`:: t\n: ${chain}\n${pad}q\n`), /<\/dl>\n<p>q<\/p>/)
    })
  }
}

test('a framed lazy line keeps the paragraph it folds into', () => {
  const html = render('1. :: t\n   : > [^n]: a\n     >   b\n   p\n\n[^n]\n')
  assert.ok(!html.includes('\u0000'))
  assert.match(html, /<p>a\nb\np/)
})

for (const host of ['[^n]: - ', '- [^n]: - ', '[^n]: 1. ', '[^n]: - - ']) {
  test(`a separator below the term of ${JSON.stringify(host)} stays term text`, () => {
    assert.match(render(`${host}:: t\n: p\n\n[^n]\n`), /<dt>t\n: p<\/dt>/)
  })
}

test('a quoted note keeps the same reading', () => {
  assert.match(render('> [^n]: - :: t\n> : p\n\n[^n]\n'), /<dt>t\n: p<\/dt>/)
})

test('a marker folded into a paragraph is no host', () => {
  assert.match(render(':: t\n:  d\n-     {.k}\n- tail\n'), /<dd>d\n- {5}\{\.k\}\n- tail<\/dd>/)
})
