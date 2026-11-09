import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// Every cell of resources/spec/plus-ownership.crv, built and read by the spec model.
const TABLE = readFileSync(new URL('../resources/spec/plus-ownership.crv', import.meta.url), 'utf8')
const TOKEN = 'zq'

const HOSTS = ['item', 'note', 'dd', 'quote']
const FORMS = ['marker', 'own', 'stacked']
const BLOCKS = ['unclosed fence', 'closed fence', 'paragraph', 'table', 'attribute', 'brace']
const FOLLOWERS = ['content', 'marker', 'col 0', 'refused `+`', 'shifted fence',
  'deep content', 'quote content', 'marker column', 'off-column `+`', 'content+1 fence']
const SPAN_BLOCKS = new Set(['paragraph', 'attribute', 'brace'])

const split = (v) => v.split(',').map((s) => s.trim())
const axis = (v, all) => (v === 'any' ? all : split(v).map((x) => {
  assert.ok(all.includes(x), `table value ${x} is not one of ${all.join(', ')}`)
  return x
}))

function readRows() {
  const rows = []
  for (const line of TABLE.split('\n')) {
    if (!/^\| [A-Z]\d{2,3} /.test(line) || /^\| X/.test(line)) continue
    const c = line.split('|').slice(1, -1).map((s) => s.trim())
    assert.equal(c.length, 9, `row ${c[0]} has ${c.length} cells`)
    rows.push({
      id: c[0],
      hosts: axis(c[1], HOSTS),
      forms: axis(c[2], FORMS),
      blocks: axis(c[3], BLOCKS),
      followers: axis(c[4], FOLLOWERS),
      blanks: c[5] === 'any' ? [false, true] : [c[5] === 'yes'],
      contexts: c[6] === 'any' ? ['plain', 'span'] : [c[6]],
      owner: c[7],
    })
  }
  return rows
}

function blockLines(block, ctx) {
  const lead = ctx === 'span' ? ['`o'] : []
  return {
    'unclosed fence': ['```', 'a'],
    'closed fence': ['```', 'a', '```'],
    paragraph: [...lead, 'a'],
    table: ['| a |', '| b |'],
    attribute: [...lead, '{#i', ' .y}'],
    brace: [...lead, '{.x', '.y}'],
  }[block]
}

export function cellSource({ host, form, block, follower, blank, ctx }) {
  if (host === 'quote') follower = ({
    'deep content': 'content', 'quote content': 'marker',
    'marker column': 'col 0', 'off-column `+`': 'refused `+`',
    'content+1 fence': 'shifted fence',
  })[follower] ?? follower
  const m = form === 'stacked' ? 2 : 0
  const pad = ' '.repeat(m)
  const quote = host === 'quote'
  const lead = { item: '- ', note: '[^a]: ', dd: ': ', quote: '> ' }[host]
  const lines = host === 'note' ? ['see[^a]', ''] : []
  if (host === 'dd') lines.push((m ? '- ' : '') + ':: t')
  const opener = m ? (host === 'dd' ? pad : '- ') : ''
  if (form === 'own') lines.push(opener + lead + 'p', pad + '+')
  else lines.push(opener + lead + '+')
  const inHost = (t, extra = '') => (quote ? pad + '> ' + extra + t : pad + extra + t)
  // A quote's `+` attaches the block at its marker column. Prefixing these
  // lines with `>` instead creates a nested quote, which tests another cell.
  for (const t of blockLines(block, ctx)) lines.push(pad + t)
  if (blank) lines.push('')
  const content = quote ? inHost(TOKEN, '  ') : pad + '  ' + TOKEN
  if (follower === 'content') lines.push(content)
  else if (follower === 'marker') lines.push(inHost(TOKEN))
  else if (follower === 'col 0') lines.push(TOKEN)
  else if (follower === 'refused `+`') lines.push(quote ? pad + '> +' : pad + '+', content)
  else lines.push(quote ? pad + '>  ```' : pad + ' ```', content)
  return lines.join('\n')
}

const VOID = new Set(['hr', 'br', 'input', 'img'])
const BLOCK_TAG = /<\/?(p|li|dd|dt|dl|ul|ol|pre|blockquote|table|section|div|h\d)[ >]/g

// The token's owner in the rendered HTML: B block, H host, P parent item, D document,
// Pc / Dc a new fence there, ~ inside an inline code span.
export function ownerCode(cell, html) {
  const at = html.indexOf(TOKEN)
  if (at < 0) return 'gone'
  const before = html.slice(0, at)
  const stack = []
  let closedQuotes = 0
  for (const [, close, tag, attrs] of before.matchAll(/<(\/?)([a-z0-9]+)([^>]*)>/g)) {
    if (VOID.has(tag)) continue
    if (close) {
      if (tag === 'blockquote') closedQuotes++
      const k = stack.findLastIndex((s) => s.tag === tag)
      if (k >= 0) stack.splice(k)
    } else stack.push({ tag, attrs })
  }
  const kinds = ['doc']
  for (const { tag, attrs } of stack) {
    if (tag === 'blockquote') kinds.push('quote')
    else if (tag === 'li') kinds.push(/id="fn/.test(attrs) ? 'footnote' : 'item')
    else if (tag === 'dd') kinds.push('dd')
    else if (tag === 'pre') kinds.push('code')
  }
  const fn = kinds.lastIndexOf('footnote')
  const path = (fn > 0 ? ['doc', ...kinds.slice(fn)] : kinds).join('/')
  const span = stack.some((s) => s.tag === 'code') && !stack.some((s) => s.tag === 'pre') ? '~' : ''
  const outer = cell.form === 'stacked' ? 'doc/item' : 'doc'
  const hostPath = cell.host === 'note' ? 'doc/footnote' : `${outer}/${cell.host === 'dd' ? 'dd' : cell.host}`
  if (cell.host === 'quote' && closedQuotes > 0 && path.includes('/quote')) return cell.form === 'stacked' ? 'P' : 'D'
  let lastBlock = -1
  for (const mb of before.matchAll(BLOCK_TAG)) lastBlock = mb.index
  const blockTag = lastBlock >= 0 ? before.slice(lastBlock, before.indexOf('>', lastBlock) + 1) : ''
  const seg = before.slice(lastBlock >= 0 ? before.indexOf('>', lastBlock) + 1 : 0)
  const sameText = (/(^|\n|>)\s*(a|`o|<code>o|\{\.x|\.y\})(\n|<)/.test(seg) || /\{\.x|<code>o/.test(seg)) && !/\n +$/.test(seg)
  if (path.startsWith(hostPath + '/')) return 'B' + span
  if (path === hostPath) return (sameText || /id="i"/.test(blockTag) ? 'B' : 'H') + span
  if (path === 'doc/item/code' && cell.form === 'stacked') return 'Pc'
  if (path === 'doc/code') return 'Dc'
  if (path === 'doc/item' && cell.form === 'stacked') return 'P' + span
  if (path === 'doc') return 'D' + span
  return '?' + path
}

function expected(rows, cell) {
  const row = rows.find((r) => r.hosts.includes(cell.host) && r.forms.includes(cell.form) &&
    r.blocks.includes(cell.block) && r.followers.includes(cell.follower) &&
    r.blanks.includes(cell.blank) && r.contexts.includes(cell.ctx))
  assert.ok(row, `no table row covers ${key(cell)}`)
  const stacked = cell.form === 'stacked'
  const o = row.owner
  if (o.startsWith('as the plain row')) return expected(rows, { ...cell, ctx: 'plain' })
  if (o.startsWith('undecided')) return { id: row.id, code: null }
  const code = o === 'Block (span)' ? 'B~'
    : o === 'Block' || o.startsWith('Block, Document') ? (o.startsWith('Block, Document') && stacked && cell.follower === 'col 0' ? 'D' : 'B')
      : o.startsWith('Block for column-0') ? (stacked ? 'D' : 'B')
        : o === 'Host' ? 'H'
          : o === 'Host (span)' ? 'H~'
          : o === 'Parent' ? (stacked ? 'P' : 'D')
            : o === 'Parent, in a new fence' ? (stacked ? 'Pc' : 'Dc')
              : o === 'Document' ? 'D'
                : assert.fail(`row ${row.id}: unknown owner ${o}`)
  return { id: row.id, code }
}

const key = (c) => [c.host, c.form, c.block, c.follower, c.blank ? 'blank' : '-', c.ctx].join(' / ')

function* cells() {
  for (const host of HOSTS) for (const form of FORMS) for (const block of BLOCKS)
    for (const follower of (host === 'quote' ? FOLLOWERS.slice(5) : FOLLOWERS.slice(0, 5)))
      for (const blank of [false, true]) for (const ctx of ['plain', 'span']) {
      if (ctx === 'span' && !SPAN_BLOCKS.has(block)) continue
      yield { host, form, block, follower, blank, ctx }
    }
}

test('the ownership table covers every cell once its axes are walked', () => {
  const rows = readRows()
  assert.ok(rows.length > 20)
  let n = 0
  for (const cell of cells()) {
    expected(rows, cell)
    n++
  }
  assert.equal(n, 1080)
})

test('the spec model gives every decided cell the owner the table names', () => {
  const rows = readRows()
  const wrong = []
  const sources = new Set()
  for (const cell of cells()) {
    const { id, code } = expected(rows, cell)
    if (code === null) continue
    const source = cellSource(cell)
    sources.add(source)
    const got = ownerCode(cell, renderDoc(parse(source)))
    const k = key(cell)
    if (got !== code) wrong.push(`${k}: row ${id} wants ${code}, model gives ${got}`)
    // The alternative bullet has the same marker and body columns. It probes
    // sibling list syntax without changing the cell's attachment geometry.
    if (cell.host === 'item') {
      const alternate = source.replace(/^-/, '*')
      sources.add(alternate)
      const alt = ownerCode(cell, renderDoc(parse(alternate)))
      if (alt !== code) wrong.push(`${k}: row ${id} wants ${code}, * item gives ${alt}`)
    }
  }
  assert.ok(sources.size >= 1000, `${sources.size} distinct generated sources`)
  assert.deepEqual(wrong, [], wrong.join('\n'))
})

test('the root and quoted-host boundary controls render their named owner', () => {
  const rows = TABLE.split('\n').filter(line => /^\| X\d\d /.test(line))
  assert.equal(rows.length, 6)
  const decode = value => value.slice(1, -1).replaceAll('\\n', '\n')
  for (const line of rows) {
    const cells = line.split('|').slice(1, -1).map(value => value.trim())
    assert.equal(cells.length, 10, cells[0])
    const source = decode(cells[8])
    const fragment = decode(cells[9])
    assert.ok(renderDoc(parse(source)).includes(fragment), `${cells[0]}: ${source}`)
  }
})
