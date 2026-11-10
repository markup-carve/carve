import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('R3 reads adjacent rendered characters across eligible inline nodes', () => {
  const wrappers = [
    (s) => `{*${s}*}`,
    (s) => `{/${s}/}`,
    (s) => `[${s}]{.x}`,
    (s) => `[${s}](u)`,
  ]
  const hosts = [(s) => s, (s) => `> ${s}`, (s) => `# ${s}`, (s) => `- ${s}`]
  let count = 0
  for (const host of hosts) for (const wrap of wrappers) {
    for (const left of ['w', 'α', '2', ' ']) for (const right of ['x', 'β', '3', '!']) {
      for (const depth of [1, 2, 3, 4]) {
        const term = Array.from({ length: depth }).reduce((s) => wrap(s), 'HTML')
        const src = `${host(`${left}${term}${right}`)}\n\n*[HTML]: t\n`
        const out = html(src)
        assert.equal(out.includes('<abbr title="t">HTML</abbr>'), left === ' ' && right === '!', src)
        count++
      }
    }
  }
  assert.equal(count, 1024)
})

test('an unwrapped nested link has the same word boundary as emphasis', () => {
  assert.equal(html('[w[HTML](u)]()\n\n*[HTML]: t\n'), '<p><a href="">wHTML</a></p>')
  assert.equal(html('w{*HTML*}\n\n*[HTML]: t\n'), '<p>w<strong>HTML</strong></p>')
})

test('authored link roles do not make authored text opaque', () => {
  for (const role of ['doc-noteref', 'doc-backlink']) {
    assert.equal(html(`[HTML](u){role=${role}}\n\n*[HTML]: t\n`),
      `<p><a href="u" role="${role}"><abbr title="t">HTML</abbr></a></p>`)
  }
})

test('earlier abbreviation markup does not change a later boundary', () => {
  assert.equal(html('HTML{*HTML*}\n\n*[HTML]: t\n'), '<p>HTML<strong>HTML</strong></p>')
  assert.equal(html('HTML {*HTML*}\n\n*[HTML]: t\n'),
    '<p><abbr title="t">HTML</abbr> <strong><abbr title="t">HTML</abbr></strong></p>')
})
