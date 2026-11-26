// The playground shows ANSI export as styled spans, never as raw escapes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ansiToHtml } from '../docs/.vitepress/ansi-html.js'

test('SGR runs become spans and reset closes them', () => {
  assert.equal(ansiToHtml('\x1b[1m\x1b[95mHi\x1b[0m done'), '<span class="ansi-bold ansi-fg-bright-magenta">Hi</span> done')
})

test('text is escaped and no escape byte survives', () => {
  const html = ansiToHtml('<b>\x1b[4mx\x1b[24m\x1b]8;;https://e.x\x1b\\link\x1b]8;;\x1b\\\x1b[2K')
  assert.equal(html, '&lt;b&gt;<span class="ansi-underline">x</span>link')
  assert.ok(!html.includes('\x1b'))
})

test('256-color arguments are not read as codes', () => {
  assert.equal(ansiToHtml('\x1b[38;5;1mx'), 'x')
})
