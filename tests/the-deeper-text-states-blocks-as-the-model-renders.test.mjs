import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, '')
const raw = (source) => renderDoc(parse(source))

const pinned = [
  ['two attribute-shaped words on a marker are li-attributes', '-{not attrs} text\n', '<ul><li not="" attrs="">text</li></ul>'],
  ['an invalid attribute payload is no marker', '-{???} text\n', '<p>-{???} text</p>'],
  ['a marker at the sub-list marker column merges (CARVE-P2-014)', '- - A\n    - N\n  - B\n', '<ul><li><ul><li>A<ul><li>N</li></ul></li><li>B</li></ul></li></ul>'],
  ['a post-blank block at the nested content column stays in the nested item (CARVE-P2-014)', '- - A\n\n    para\n', '<ul><li><ul><li><p>A</p><p>para</p></li></ul></li></ul>'],
  ['items at different indents in one owner are one list (§11 N1)', '  - a\n- b\n', '<ul><li>a</li><li>b</li></ul>'],
  ['the opener recovery drops a tab-separated title (PART 2)', '::: note\t"T"\nb\n:::\n', '<aside class="admonition note" aria-label="Note"><p>b</p></aside>'],
  ['a blank class value stays as authored (CARVE-P4)', '{class=" "}\np\n', '<p class=" ">p</p>'],
  ['a definition beside a paragraph defines (CARVE-P9R-002)', 'a\n[r]: /u\n\n[x][r]\n', '<p>a</p><p><a href="/u">x</a></p>'],
  ['a caption with no placeholder draws no number (PART 9R R5)', '{#i}\n```js\nx\n```\n^ cap\n\n</#i>\n', '<figure id="i"><pre><code class="language-js">x</code></pre><figcaption>cap</figcaption></figure><p>&lt;/#i&gt;</p>'],
  ['a caption placeholder gives label and number (PART 9R R4)', '{#i}\n```js\nx\n```\n^ Eq #: cap\n\n</#i>\n', '<figure id="i"><pre><code class="language-js">x</code></pre><figcaption>Eq 1: cap</figcaption></figure><p><a href="#i">Eq 1</a></p>'],
  ['an authored href on a link is ignored (§25)', '[a](/u){href=/v}\n', '<p><a href="/u">a</a></p>'],
  ['an authored src on an image is ignored (§25)', '![a](/u){src=/v}\n', '<img src="/u" alt="a">'],
  ['the style check removes Unicode whitespace (CARVE-P7-003)', '{style="u rl(x)"}\np\n', '<p style="">p</p>'],
  ['an indented + continues a row (§5 T6)', '| a |\n + b |\n', '<table><tbody><tr><td>a b</td></tr></tbody></table>'],
  ['a quoted | still cuts a cell (§5 T1)', '| *x*{k="a|b"} |\n', '<table><tbody><tr><td><strong>x</strong>{k=“a</td><td>b”}</td></tr></tbody></table>'],
  ['a next sibling of neither form leaves the marker lone (§11 N3)', 'v.  a\nvii.  b\n', '<ol type="a" start="22"><li>a</li></ol><ol type="i" start="7"><li>b</li></ol>'],
  ['a roman value is its subtractive sum (§11 N2)', 'vx.  a\n', '<ol type="i" start="5"><li>a</li></ol>'],
  ['a non-canonical roman run still sums (§11 N2)', 'iiii.  a\n', '<ol type="i" start="4"><li>a</li></ol>'],
  ['style substrings match case-insensitively (§25)', '*x*{style="URL(x)"}\n', '<p><strong style="">x</strong></p>'],
  ['a label key on math source is an ordinary attribute (PART 9R R5a)', '$$`x`{#e label="Eq."}\n', '<p><span class="math display" id="e" label="Eq." role="math">\\[x\\]</span></p>'],
  ['a fence title has no table slot (§4)', '{table}\n```csv "T" [l]\na,b\n```\n', '<table><thead><tr><th scope="col">a</th><th scope="col">b</th></tr></thead></table>'],
  ['a header-rows value that is no count is absent (§4)', '{table header-rows=x}\n```csv\na\nb\n```\n', '<table><thead><tr><th scope="col">a</th></tr></thead><tbody><tr><td>b</td></tr></tbody></table>'],
  ['a count past the rows gives one body at row scope (§4)', '{table header-rows=5}\n```csv\na\nb\n```\n', '<table><tbody><tr><th scope="row">a</th></tr><tr><th scope="row">b</th></tr></tbody></table>'],
  ['an align declaration appends after a trimmed style', '{style=" color:red  " align=right}\np\n', '<p style="color:red; text-align: right;">p</p>'],
  ['an align key matches case-insensitively', '{ALIGN=center}\np\n', '<p style="text-align: center;">p</p>'],
  ['a reserved include key is literal (I7)', '{{ a.txt @code @foo:1 }}\n', '<p>{{ a.txt @code @foo:1 }}</p>'],
  ['a plain div keeps an authored label (CARVE-P9-072)', '{aria-label="Q"}\n::: footnotes "T"\nx\n:::\n', '<div class="footnotes" aria-label="Q"><p class="admonition-title">T</p><p>x</p></div>'],
  ['a line block class follows the authored ones (corpus 421)', '{.x}\n::: |\na\n:::\n', '<div class="x line-block"><p>a</p></div>'],
  ['a raw format name is case sensitive', '`x`{=HTML}\n', '<p></p>'],
  ['a table panel keeps its attributes on the table', '::: figure\n{.c}\n| a |\n:::\n', '<figure class="carve-figure-group"><figure class="carve-figure-panel"><table class="c"><tbody><tr><td>a</td></tr></tbody></table></figure></figure>'],
]

for (const [name, source, expected] of pinned) {
  test(name, () => assert.equal(html(source), expected))
}

test('a straddling tab gives its unconsumed columns back as spaces (§24 C5)', () => {
  assert.match(raw('- ```\n\tx\n  ```\n'), /<code> {2}x\n/)
})

test('a zero-line raw block leaves one empty line at the top level (CARVE-P10-012)', () => {
  assert.equal(raw('a\n\n```=html\n```\n\nb\n').trim(), '<p>a</p>\n\n<p>b</p>')
})

test('a zero-line raw block leaves an indented line in a nested body (CARVE-P10-012)', () => {
  assert.match(raw('- ```=html\n  ```\n  b\n'), /<li>\n {4}\n {4}b\n/)
})

test('an endnote title counts after later body blocks (§12)', () => {
  const out = html('[^f]\n\n[^f]: x\n    ::: note "A"\n    y\n    :::\n\n::: note "B"\nz\n:::\n')
  assert.match(out, /id="adm-1">B</)
})
