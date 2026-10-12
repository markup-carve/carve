import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFragment } from 'parse5'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))
const hosts = [
  { name: 'item', prefix: ['-  x'], column: 3, sibling: '-  follower', tag: 'li' },
  { name: 'description', prefix: [':: t', ':  x'], column: 3, sibling: ':  follower', tag: 'dd' },
  { name: 'note', prefix: ['[^n]: x'], column: 2, sibling: '[^m]: follower', tag: 'li' },
]
const find = (node, predicate) => predicate(node) ? node :
  (node.childNodes ?? []).map(child => find(child, predicate)).find(Boolean)
const text = (node) => node.nodeName === '#text' ? node.value :
  (node.childNodes ?? []).map(text).join('')
const inside = (out, host) => {
  const element = find(parseFragment(out), node => node.tagName === host.tag &&
    (host.name !== 'note' || node.attrs.some(attr => attr.name === 'id' && attr.value === 'fn1')))
  assert.ok(element, `${host.name} is missing:\n${out}`)
  return text(element).includes('follower')
}
const source = (host, body, depth) => {
  const lines = [...host.prefix, ...body]
  if (host.name === 'note') lines.push('', '[^n] [^m]')
  return lines.map(line => depth ? `> ${line}` : line).join('\n') + '\n'
}

for (const depth of [0, 1]) {
  for (const column of [0, 1, 2]) {
    const pad = host => ' '.repeat(Math.min(column, host.column - 1))
    const cases = [
      ['a low comment retains a plain follower', host => [`${pad(host)}%% c`, ' follower'], true],
      ['a blank clears retention', host => [`${pad(host)}%% c`, '', ' follower'], false],
      ['a comment at the body column grants none', host => [
        `${' '.repeat(host.column)}%% c`, 'follower'], false],
      ['a comment above the body column grants none', host => [
        `${' '.repeat(host.column + 1)}%% c`, 'follower'], false],
      ['an interrupting opener leaves the body', host => [`${pad(host)}%% c`, '# follower'], false],
      ['a sibling marker is recognized first', host => [`${pad(host)}%% c`, host.sibling], false],
      ['an unmatched run is a line comment', host => [`${pad(host)}%%%`, ' follower'], true],
      ['a matched span hides its payload', host => [
        `${pad(host)}%%%`, 'SECRET_PAYLOAD', `${pad(host)}%%%`, ' follower'], column !== 0],
    ]
    for (const [limit, body, expected] of cases) {
      test(`${limit}, comment column ${column}, quote depth ${depth}`, () => {
        const outputs = hosts.map(host => html(source(host, body(host), depth)))
        const kept = hosts.map((host, index) => inside(outputs[index], host))
        assert.equal(kept[0], expected, `item control:\n${outputs[0]}`)
        for (let index = 1; index < hosts.length; index++) {
          assert.equal(kept[index], kept[0], `${hosts[index].name} disagrees with item:\n${outputs[index]}`)
        }
        if (limit === 'a matched span hides its payload') {
          for (const out of outputs) {
            assert.ok(!out.includes('SECRET_PAYLOAD'), out)
            assert.ok(!out.includes('%%%'), out)
          }
        }
      })
    }
  }
}

test('a description retains text after a low comment', () => {
  assert.equal(html(':: t\n: d\n %% c\n text\n'),
    '<dl>\n  <dt>t</dt>\n  <dd>\n    <p>d</p>\n    <p>text</p>\n  </dd>\n</dl>')
})

test('a note retains text after a low comment', () => {
  assert.equal(html('[^n]: body\n %% c\n text\n\n[^n]\n'),
    '<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>\n' +
    '<section role="doc-endnotes" aria-label="Footnotes">\n  <hr>\n  <ol>\n' +
    '    <li id="fn1">\n      <p>body</p>\n      <p>text<a href="#fnref1" ' +
    'role="doc-backlink" aria-label="Back to reference">↩</a></p>\n    </li>\n  </ol>\n</section>')
})

test('a retained list marker is paragraph text in all three hosts', () => {
  assert.ok(!html('[^n]: x\n %% c\n - follower\n\n[^n]\n').includes('<ul>'))
  assert.ok(!html(':: t\n: x\n %% c\n - follower\n').includes('<ul>'))
  assert.equal((html('- x\n %% c\n - follower\n').match(/<ul>/g) ?? []).length, 1)
})

test('retention does not rescan the body it has already collected', () => {
  // Each comment reads only the lines since the last one, so doubling the
  // input may not quadruple the work. A full rescan took minutes here.
  const time = (src) => { const t = process.hrtime.bigint(); parse(src); return Number(process.hrtime.bigint() - t) / 1e6 }
  for (const head of ['[^n]: x\n', ':: t\n: x\n']) {
    assert.ok(time(head + ' %% c\n x\n'.repeat(3000)) < 5000, head)
  }
})
