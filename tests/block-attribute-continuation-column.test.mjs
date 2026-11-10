import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

const cases = [
  ['indented token', '{.a\n  #x}\npara', '<p class="a" id="x">para</p>'],
  ['indented closing brace', '{.a\n  }\npara', '<p class="a">para</p>'],
  ['column-zero token', '{.a\n#x}\npara', '<p>{.a\n#x}\npara</p>'],
  ['column-zero closing brace', '{.a\n}\npara', '<p>{.a\n}\npara</p>'],
  ['column-zero comment continuation', '{% x\ny %}\n# b', '<p>{% x\ny %}\n# b</p>'],
  ['indented comment continuation', '{% x\n  y %}\n# b', '<section id="b">\n  <h1>b</h1>\n</section>'],
  ['closer at the list opener column', '- item\n\n  {.a\n  #x}\n  para', '<ul>\n  <li><p>item</p>\n    <p>{.a\n#x}\npara</p>\n  </li>\n</ul>'],
  ['attached list attribute with deeper closer', '- +\n{.a\n  }\npara', '<ul>\n  <li><p class="a">para</p></li>\n</ul>'],
  ['attached list attribute with shallow closer', '- +\n{.a\n}\npara', '<ul>\n  <li>{.a\n}\npara</li>\n</ul>'],
  ['attached quote attribute with deeper closer', '> +\n{.a\n  }\npara', '<blockquote><p class="a">para</p></blockquote>'],
  ['attached quote attribute with shallow closer', '> +\n{.a\n}\npara', '<blockquote><p>{.a\n}\npara</p></blockquote>'],
  ['attached attribute with quoted brace before continuation', '- +\n{k="}"\n  .a}\npara', '<ul>\n  <li><p k="}" class="a">para</p></li>\n</ul>'],
  ['a hard break before a refused run keeps one newline', 'foo\\\n{.a\n#x}\ntail', '<p>foo<br>\n{.a\n#x}\ntail</p>'],
  ['a tight description keeps a refused comment', ':: t\n: d\n  {% x\n  y %}\n  z', '<dl>\n  <dt>t</dt>\n  <dd>d\n{% x\ny %}\nz</dd>\n</dl>'],
  ['a tight description keeps a refused attribute', ':: t\n: d\n  {.a\n  }\n  z', '<dl>\n  <dt>t</dt>\n  <dd>d\n{.a\n}\nz</dd>\n</dl>'],
  ['a brace run inside a multiline code span stays inline', '`abc\n{% x\ny %}\ndef`', '<p><code>abc\n{% x\ny %}\ndef</code></p>'],
  ['an escaped code opener does not shield a brace run', 'a \\`b\n{.c\n#x}\ntail', '<p>a `b\n{.c\n#x}\ntail</p>'],
  ['a brace line inside an inline comment stays inline', 'a {% x\n{% y\nz %} b', '<p>a  b</p>'],
  ['padded attribute opener with shallow closer', '{ .a\n}\n# b', '<p>{ .a\n}\n# b</p>'],
  ['glued second block with shallow closer', '{.a}{.b\n }\npara', '<p>{.a}{.b\n}\npara</p>'],
  ['glued second block with deep closer', '{.a}{.b\n     }\npara', '<p class="a b">para</p>'],
  ['glued shallow closer keeps a following heading in prose', '{.a}{.b\n    }\n# h', '<p>{.a}{.b\n}\n# h</p>'],
  ['bare value brace does not hide a refused run', '{.c\nk=a{b}\n# h', '<p>{.c\nk=a{b}\n# h</p>'],
  ['a later fence interrupts after the first refused follower', '{.a\n}\ntext\n```\ncode\n```', '<p>{.a\n}\ntext</p>\n<pre><code>code\n</code></pre>'],
  ['an immediate fence-shaped follower keeps its closer in prose', '{.a\n}\n~~~\ny\n~~~', '<p>{.a\n}\n~~~\ny\n~~~</p>'],
  ['indented marker attribute stays invisible after plus', '  - a\n  +\n  {.c}\n# h\n', '<ul>\n  <li>a</li>\n</ul>\n<section id="h">\n  <h1 class="c">h</h1>\n</section>'],
  ['glued second block in a quote uses its own opener', '>   {.a\n>    }{.b\n>       }\n> text', '<blockquote><p class="a b">text</p></blockquote>'],
  ['bare brace opener with shallow continuation', '{\n.a}\n# b', '<p>{\n.a}\n# b</p>'],
  ['emphasis spans a literal refused run', 'a *foo\n{.a\n}\nbar*', '<p>a <strong>foo\n{.a\n}\nbar</strong></p>'],
  ['hard-break container keeps a refused comment', '::: ' + '\\' + '\n  {% x\n  y %}\n  # h\n  :::', '<div class="hardbreaks">\n  <p>{% x<br>\ny %}<br>\n# h</p>\n</div>'],
  ['even backslashes keep a code opener active', 'a \\\\`x\n{% x\ny %}\nend`', '<p>a \\<code>x\n{% x\ny %}\nend</code></p>'],
]

const superseded = new Set([
  'column-zero token',
  'column-zero comment continuation',
  'closer at the list opener column',
  'a hard break before a refused run keeps one newline',
  'an escaped code opener does not shield a brace run',
  'padded attribute opener with shallow closer',
  'glued shallow closer keeps a following heading in prose',
  'bare value brace does not hide a refused run',
  'an immediate fence-shaped follower keeps its closer in prose',
  'bare brace opener with shallow continuation',
  'hard-break container keeps a refused comment',
])

for (const [name, source, expected] of cases) {
  test(`block brace continuation: ${name} (#5080)`, () => {
    const oracle = name === 'glued shallow closer keeps a following heading in prose'
      ? source.replace('{.b', '\\{.b') : source.replace('{', '\\{')
    assert.equal(html(source), superseded.has(name) ? html(oracle) : expected)
  })
}

test('inline comment continuation remains valid', () => {
  assert.equal(html('a {% x\ny %} b'), '<p>a  b</p>')
})
