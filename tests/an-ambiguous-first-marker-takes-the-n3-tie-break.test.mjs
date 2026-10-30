import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const lists = (src) => [...renderDoc(parse(src)).matchAll(/<ol( type="(\w)")?[^>]*>/g)].map((m) => m[2] ?? '1')

const roman = (t) => /^(?:[ivxlcdm]+|[IVXLCDM]+)$/.test(t)
const value = (t) => {
  const v = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }
  const s = t.toLowerCase()
  let n = 0
  for (let k = 0; k < s.length; k++) n += v[s[k]] < (v[s[k + 1]] ?? 0) ? -v[s[k]] : v[s[k]]
  return n
}
const letter = (t) => /^[a-z]$/i.test(t)
const typeOf = (t, r) => r ? (t === t.toLowerCase() ? 'i' : 'I') : (t === t.toLowerCase() ? 'a' : 'A')
// PART 9 §11 N3, written out independently of the model.
const firstType = (a, b) => {
  if (!(roman(a) && letter(a))) return roman(a) ? typeOf(a, true) : typeOf(a, false)
  const sameCase = (a === a.toLowerCase()) === (b === b.toLowerCase())
  if (sameCase && roman(b) && value(b) === value(a) + 1) return typeOf(a, true)
  if (sameCase && letter(b) && b.toLowerCase().charCodeAt(0) === a.toLowerCase().charCodeAt(0) + 1) return typeOf(a, false)
  return typeOf(a, a.toLowerCase() === 'i')
}
const fits = (t, type) => type === 'i' || type === 'I'
  ? roman(t) && typeOf(t, true) === type
  : letter(t) && typeOf(t, false) === type

const tokens = ['i', 'ii', 'iv', 'v', 'vi', 'x', 'xi', 'c', 'ci', 'd', 'l', 'm', 'a', 'b', 'j', 'w', 'y', 'I', 'II', 'J', 'A', 'V', 'W']

test('the first marker takes the N3 tie-break and the next joins only inside that dialect (carve#4351)', () => {
  let n = 0
  for (const a of tokens) {
    for (const b of tokens) {
      const type = firstType(a, b)
      const want = fits(b, type) ? [type] : [type, firstType(b, '')]
      for (const src of [`${a}. x\n${b}. y\n`, `> ${a}) x\n>\n> ${b}) y\n`, `- p\n\n  ${a}. x\n  ${b}. y\n`]) {
        assert.deepEqual(lists(src), want, JSON.stringify(src))
        n++
      }
    }
  }
  assert.equal(n, 1587)
})

test('the shapes the issue names', () => {
  assert.deepEqual(lists('i. x\nb. y\n'), ['i', 'a'])
  assert.deepEqual(lists('v. x\nii. y\n'), ['a', 'i'])
  assert.deepEqual(lists('i. x\nj. y\n'), ['a'])
  assert.deepEqual(lists('v. x\nvi. y\n'), ['i'])
  assert.deepEqual(lists('i. x\n'), ['i'])
  assert.deepEqual(lists('c. x\n'), ['a'])
})
