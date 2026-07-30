/**
 * Corpus-coverage guard for the docs Playground extension set.
 *
 * carve-js ships a growing set of extension factories. The docs Playground (and
 * the build-time vite-plugin-carve render) only loads the subset listed in
 * docs/.vitepress/carve-extensions.js. To stop a newly added carve-js extension
 * from being silently missed when the carve-js pin is bumped, that file classifies
 * EVERY exported extension factory as either ENABLED (shown) or EXCLUDED (off,
 * with a reason). `unclassifiedExtensions()` returns any factory that is neither.
 *
 * This test fails the moment an unclassified extension appears, telling the
 * maintainer to file it. It mirrors the spec-corpus coverage guards: a new
 * capability cannot land without an explicit decision recorded for it.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  unclassifiedExtensions,
  carveExtensions,
} from '../docs/.vitepress/carve-extensions.js'

test('every carve-js extension is classified as ENABLED or EXCLUDED', () => {
  const unclassified = unclassifiedExtensions()
  assert.deepEqual(
    unclassified,
    [],
    `Unclassified carve-js extension(s): ${unclassified.join(', ')}.\n` +
      `A new extension factory landed in the pinned carve-js build. Add each name to\n` +
      `either ENABLED (show it in the Playground demo) or EXCLUDED (with a short\n` +
      `reason) in docs/.vitepress/carve-extensions.js.`,
  )
})

test('carveExtensions() builds the enabled set without throwing', () => {
  let exts
  assert.doesNotThrow(() => {
    exts = carveExtensions()
  }, 'one of the ENABLED extensions threw while constructing')
  assert.ok(Array.isArray(exts) && exts.length > 0, 'expected a non-empty extension array')
  for (const ext of exts) {
    assert.equal(typeof ext.name, 'string', 'each enabled extension must expose a string name')
  }
})
