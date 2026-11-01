/*
 * A mention or tag name holds at least one ASCII letter (carve#4809). A marker
 * whose name run has none stays text, and such a `#` is no caption placeholder
 * (carve#4642).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const tag = (name) => `<span class="tag"><strong>#${name}</strong></span>`

test('the ruling reproduction', () => {
  assert.equal(
    html('See issue #123, #1 priority and #fff.\n'),
    `<p>See issue #123, #1 priority and ${tag('fff')}.</p>`,
  )
})

for (const [src, out] of [
  ['#1.2', '#1.2'],
  ['#1-2', '#1-2'],
  ['#-1', '#-1'],
  ['#_1', '#_1'],
  ['#1.', '#1.'],
  ['#1#a', '#1#a'],
  ['#123{.k}', '#123{.k}'],
  ['#v2', tag('v2')],
  ['#1a', tag('1a')],
  ['#1.a.', `${tag('1.a')}.`],
  ['#-a', tag('-a')],
]) {
  test(`${src} renders ${out}`, () => {
    assert.equal(html(`${src}\n`), `<p>${out}</p>`)
  })
}

test('the superseding ruling reproduction', () => {
  assert.equal(
    html('| a |\n^ Figure #1 q\n\nPaid @5 today and see #123\n'),
    '<table>\n  <caption>Figure #1 q</caption>\n  <tbody>\n    <tr><td>a</td></tr>\n  </tbody>\n</table>\n<p>Paid @5 today and see #123</p>',
  )
})

for (const src of ['@5', '@1.2', '@1-2', '@-1', '@_1', '@_', '@1.', '@1@a']) {
  test(`${src} is text`, () => {
    assert.equal(html(`${src}\n`), `<p>${src}</p>`)
  })
}

for (const name of ['a1', '1a', '-a', '1.a']) {
  test(`@${name} is a mention`, () => {
    assert.equal(html(`@${name}\n`), `<p><span class="mention"><strong>@${name}</strong></span></p>`)
  })
}

for (const [cap, out] of [
  ['#1', '#1'],
  ['#-1', '#-1'],
  ['#_', '#_'],
  ['#', '1'],
  ['#:', '1:'],
  ['#.', '1.'],
  ['#1 #', '#1 1'],
]) {
  test(`the caption \`^ Fig ${cap}\` reads ${out}`, () => {
    assert.ok(html(`![p](p.png)\n^ Fig ${cap}\n`).includes(`<figcaption>Fig ${out}</figcaption>`))
  })
}

test('a name cut back to digits by a closing underline is text', () => {
  assert.equal(html('_x #1_ y\n'), '<p><u>x #1</u> y</p>')
  assert.equal(html('_x @1_ y\n'), '<p><u>x @1</u> y</p>')
  assert.equal(html('_x #1_.a y\n'), '<p><u>x #1</u>.a y</p>')
  assert.equal(html('_x @1_-a y\n'), '<p><u>x @1</u>-a y</p>')
})
