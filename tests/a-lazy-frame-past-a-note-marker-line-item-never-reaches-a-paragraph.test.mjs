/*
 * The walk frames a lazy line at the column of the deepest item it tracks. When
 * a note's marker-line item has already refused a `+`, the paragraph holding
 * that line sits in the note, so the frame arrives behind leftover indentation.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))
const note = (html) => html.slice(html.indexOf('<li id="fn1">'))

test('a lazy line after a refused + folds into the note paragraph without its frame', () => {
  const html = render('[^n]: - +\n  +\nafter\n\nr[^n]\n')
  assert.match(note(html), /<ul>\s*<li><\/li>\s*<\/ul>\s*<p>\+\nafter</)
})

test('a line under a + that left the note folds into the document paragraph without its frame', () => {
  const html = render('[^n]: - +\n +\n p\n\nr[^n]\n')
  assert.match(html, /^<p>\+\np<\/p>/)
})

test('no frame reaches the output in any host, leaf, column or quote depth', () => {
  const leaves = ['- +', '1. +', '- ```', '- - +', '- [ ] +']
  const followers = ['+', '+\np', '+\n- y', '+\n> q']
  const tails = ['after', '  after', '\nafter']
  const quotes = ['', '> ', '> > ']
  let count = 0
  for (const leaf of leaves) {
    for (const follower of followers) {
      for (let column = 0; column <= 4; column++) {
        for (const tail of tails) {
          for (const quote of quotes) {
            const body = follower.split('\n').map((line) => ' '.repeat(column) + line)
            const lines = [`[^n]: ${leaf}`, ...body, ...tail.split('\n')]
            const source = `${lines.map((line) => quote + line).join('\n')}\n\nr[^n]\n`
            assert.doesNotMatch(render(source), /[\u0000\u0002]/, JSON.stringify(source))
            count++
          }
        }
      }
    }
  }
  assert.equal(count, 900)
})
