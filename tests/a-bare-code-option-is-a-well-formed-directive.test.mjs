/*
 * I1c: `@code` may stand without a value, so `include_options` makes the
 * `:value` part optional. Which keys may omit it is semantics (a bare `@shift`
 * is a malformed option, I7); recognition only sees the shape.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanDirective } from '../scripts/spec/include-directive.mjs'

test('a bare @code and a valued @code:lang are both recognized', () => {
  assert.deepEqual(scanDirective('{{ a.js @code }}', 0).options, [['code', null]])
  assert.deepEqual(scanDirective('{{ src/server.js@region:start @code:js }}', 0).options, [
    ['region', 'start'],
    ['code', 'js'],
  ])
  assert.deepEqual(scanDirective('{{ a.cs @code:c# }}', 0).options, [['code', 'c#']])
})

test('a bare option is followed by the next option or the padding', () => {
  assert.deepEqual(scanDirective('{{ a.js @code@lines:1-2 }}', 0).options, [
    ['code', null],
    ['lines', '1-2'],
  ])
  assert.equal(scanDirective('{{ a.js @code}}', 0), null)
})
