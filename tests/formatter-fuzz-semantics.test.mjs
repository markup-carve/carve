import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatterRoundTripFailures } from '../scripts/lib/formatter-roundtrip.mjs'

const engines = ['js', 'rs', 'php']
const all = value => Object.fromEntries(engines.map(engine => [engine, value]))
const isError = value => value.startsWith('ERROR:')

test('identical formatter outputs still fail when all writers change the content', () => {
  const findings = formatterRoundTripFailures('original', all('corrupted'), text => all(text), isError)
  assert.equal(findings.length, 9)
  assert.deepEqual(findings[0], { writer: 'js', reader: 'js', before: 'original', after: 'corrupted' })
})

test('different canonical spellings can preserve every reader`s content', () => {
  assert.deepEqual(formatterRoundTripFailures('original', { js: 'a', rs: 'b', php: 'c' }, () => all('same HTML'), isError), [])
})

test('a reader regression is attributed to the writer and reader pair', () => {
  const findings = formatterRoundTripFailures('original', all('formatted'), text => ({
    js: 'same', rs: text === 'original' ? 'same' : 'changed', php: 'same',
  }), isError)
  assert.deepEqual(findings.map(({ writer, reader }) => [writer, reader]), engines.map(writer => [writer, 'rs']))
})

test('reader crashes cannot masquerade as unchanged content', () => {
  assert.equal(formatterRoundTripFailures('original', all('formatted'), () => all('ERROR: failed'), isError).length, 9)
})
