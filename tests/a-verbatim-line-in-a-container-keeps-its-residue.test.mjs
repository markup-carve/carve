// CARVE-P11-016: keep container code-line residue (markup-carve/carve#2420).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const oracle = (source) => renderDoc(parse(source)).trim()
const code = (prefix, width, fence = '```') =>
  [prefix + fence, prefix + 'a', ' '.repeat(width), prefix + 'b', prefix + fence, ''].join('\n')

for (const [name, source, content] of [
  ['column zero, two spaces', code('', 2), 'a\n  \nb\n'],
  ['block quote, two residual spaces', '> ```\n> a\n>   \n> b\n> ```\n', 'a\n  \nb\n'],
  ['list item, four spaces', '- item\n\n' + code('  ', 4), 'a\n  \nb\n'],
  ['list item, two spaces', '- item\n\n' + code('  ', 2), 'a\n\nb\n'],
  ['list item, one space', '- item\n\n' + code('  ', 1), 'a\n\nb\n'],
  ['over-indented list fence, four spaces', '- item\n\n' + code('    ', 4), 'a\n\nb\n'],
  ['over-indented list fence, six spaces', '- item\n\n' + code('    ', 6), 'a\n  \nb\n'],
  ['over-indented list fence, two spaces', '- item\n\n' + code('    ', 2), 'a\n\nb\n'],
  ['over-indented nested fence, six spaces', '- - item\n\n' + code('      ', 6), 'a\n\nb\n'],
  ['nested item, six spaces', '- - item\n\n' + code('    ', 6), 'a\n  \nb\n'],
  ['quoted item, four spaces after the quote marker', '> - item\n>\n>   ```\n>   a\n>     \n>   b\n>   ```\n', 'a\n  \nb\n'],
  ['list item, tilde fence', '- item\n\n' + code('  ', 4, '~~~'), 'a\n  \nb\n'],
  ['footnote, six spaces', 'x[^1]\n\n[^1]: note\n\n' + code('    ', 6), 'a\n  \nb\n'],
  ['description, five spaces', ':: term\n:  description\n\n' + code('   ', 5), 'a\n  \nb\n'],
]) {
  test(name, () => {
    const html = oracle(source)
    assert.equal(html.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/)?.[1], content)
  })
}

for (const [name, body] of [
  ['colon container', ['::: box', 'a', '    ', 'b', ':::']],
  ['admonition', ['::: note', 'a', '    ', 'b', ':::']],
  ['comment fence', ['%%%', '```', '    ', '%%%']],
  ['paragraph', ['a', '    ', 'b']],
  ['line block', ['| a', '    ', '| b']],
]) {
  test(`${name} keeps treating whitespace as a blank`, () => {
    const source = '- item\n\n' + body.map((line) => '  ' + line).join('\n') + '\n'
    assert.equal(oracle(source), oracle(source.replace(/^ +$/gm, '')))
  })
}
