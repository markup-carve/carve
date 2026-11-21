// Upgrade 0.1 leaves 0.2 source alone and still upgrades 0.1 source.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { upgradeVerdict } from '../docs/.vitepress/upgrade-check.js'

// The tools bundle decodes HTML entities through the DOM, as it does in the browser.
globalThis.document ??= new JSDOM('').window.document
const { upgrade } = await import('../docs/.vitepress/engine-tools.js')

const demo = readFileSync(new URL('../docs/.vitepress/examples/demo.crv', import.meta.url), 'utf8')
const verdict = (source) => upgradeVerdict(source, upgrade(source, { edits: true }))

test('the 0.2 demo reads as 0.2 although the upgrade would escape its headings', () => {
  assert.notEqual(upgrade(demo).output, demo)
  assert.equal(verdict(demo), 'already-0.2')
})

test('the 0.1 demo of the 0.1 playground upgrades', () => {
  const demo01 = readFileSync(new URL('fixtures/playground-upgrade/demo-0.1.crv', import.meta.url), 'utf8')
  assert.equal(verdict(demo01), 'upgrade')
})

test('0.2 headings read as 0.2', () => {
  assert.equal(verdict('= Title\n\n== Section\n\nplain\n'), 'already-0.2')
})

test('0.1 source upgrades, also when it holds escapes too', () => {
  assert.equal(verdict('# Title\n\nSome *bold* and _em_ text.\n'), 'upgrade')
  assert.equal(verdict('= Title\n\nSome _em_ text.\n'), 'upgrade')
  assert.equal(verdict('A ~strike~ and =mark= word.\n'), 'upgrade')
})

test('source the upgrade does not change is unchanged', () => {
  assert.equal(verdict('Hello world.\n'), 'unchanged')
})

test('records without edits are not read as 0.2', () => {
  assert.equal(upgradeVerdict('a', { output: 'b', records: [{ entry: 'U-101', class: 'escape' }] }), 'upgrade')
  assert.equal(upgradeVerdict('a', { output: 'b', records: [{ entry: 'U-015', class: 'report' }], edits: [{ entry: 'U-015' }] }), 'upgrade')
})
