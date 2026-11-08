import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))
const note = (source, n) => new RegExp(`<li id="fn${n}">\\n([\\s\\S]*?)<a href="#fnref${n}"`).exec(html(source))?.[1].trim()

// Ruled A on carve#5542: an earlier `+` note does not change what the later note's own `+` takes.
test('a later note plus takes the line below it at any column past an earlier plus (carve#5542)', () => {
  for (const pre of ['', '  ', '> ']) {
    const lead = pre === '  ' ? '- h\n' : ''
    for (const follower of ['para', ' para']) {
      const src = `${lead}${pre}[^m]: +\n${pre}[^n]: +\n${pre}${follower}\n\nsee[^n][^m]\n`
      assert.equal(note(src, 1), '<p>para', src)
      assert.equal(note(src, 2), '<p>', src)
    }
  }
  assert.equal(note('[^m]: +\n[^n]: +\n- x\n\nsee[^n][^m]\n', 1), '<ul>\n        <li>x</li>\n      </ul>\n      <p>')
})

test('the later note keeps its indented continuation past an earlier plus (carve#5542)', () => {
  for (const follower of ['para', ' para']) {
    assert.equal(note(`[^m]: +\n[^n]: +\n${follower}\n  - x\n\nsee[^n][^m]\n`, 1), '<p>para</p>\n      <ul>\n        <li>x</li>\n      </ul>\n      <p>')
    assert.equal(note(`[^m]: +\n[^n]: +\n${follower}\n\n  next\n\nsee[^n][^m]\n`, 1), '<p>para</p>\n      <p>next')
    assert.equal(note(`[^m]: +\n[^n]: +\n${follower}\n\n  next\n\nsee[^n][^m]\n`, 2), '<p>')
  }
})

test('blocks the later note plus does not take keep their reading (carve#5542)', () => {
  // A blank refuses the later `+`; a list or an attribute line below its body column is not lazy text.
  assert.match(html('[^m]: +\n[^n]: +\n\n para\n\nsee[^n][^m]\n'), /^<p>para<\/p>/)
  assert.match(html('[^m]: +\n[^n]: +\n - x\n\nsee[^n][^m]\n'), /^<ul>\n  <li>x<\/li>\n<\/ul>/)
  assert.match(html('[^m]: +\n[^n]: +\n {.c}\n para\n\nsee[^n][^m]\n'), /^<p class="c">para<\/p>/)
  // A losing duplicate's `+` takes nothing (carve#5474).
  assert.match(html('[^a]: +\n[^a]: +\n flush\n\nsee[^a]\n'), /^<p>flush<\/p>/)
})
