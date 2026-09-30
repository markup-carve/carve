import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compareCharacterSlots } from '../scripts/grammar-character-check.mjs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const ebnf = read('resources/grammar.ebnf')
const source = read('resources/carve-core.ohm')
const slots = JSON.parse(read('resources/grammar-character-slots.json'))

test('mapped quoted slots admit the production character and escape sets', () => {
  assert.equal(slots.length, 4)
  assert.deepEqual(compareCharacterSlots(ebnf, source, slots), [])
})

test('narrowing title escapes to their closing quote fails the character check', () => {
  const changed = source.replace(/(titleQEsc\s*=\s*"\\\\") punctChar/, '$1 "\\\""')
  assert.notEqual(changed, source)
  assert.ok(compareCharacterSlots(ebnf, changed, slots).length > 0)
})

test('removing the quoted-value newline bound fails the character check', () => {
  const changed = source.replace(/(qChar\s*=.*) ~newline/, '$1')
  assert.notEqual(changed, source)
  assert.ok(compareCharacterSlots(ebnf, changed, slots).length > 0)
})

test('admitting an unguarded backslash before the closing quote fails the check', () => {
  const changed = ebnf.replace(/(quoted_value =[^\n]*character - '"') - '\\'/, '$1')
  assert.notEqual(changed, ebnf)
  const differences = compareCharacterSlots(changed, source, slots)
  assert.ok(differences.some((d) => d.input === '\\' && d.suffix === ''))
})
