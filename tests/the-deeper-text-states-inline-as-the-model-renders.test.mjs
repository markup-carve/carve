import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, '')

const pinned = [
  ['a trailing comment is cut before the inline passes (PART 8)', '*a %% c* d\n', '<p>*a</p>'],
  ['a destination takes trailing spaces only after a title (CARVE-P3)', '[t](/u )\n', '<p>[t](/u )</p>'],
  ['a title takes trailing spaces (CARVE-P3)', '[t](/u "T"  )\n', '<p><a href="/u" title="T">t</a></p>'],
  ['an inline literal takes an attribute run (§9 R3)', '!`x`{.c}\n', '<p><span class="c">x</span></p>'],
  ['a symbol takes an attribute run (§9 R3)', ':a:{.x}\n', '<p><span class="x">:a:</span></p>'],
  ['a citation definition needs the extension', '[@a]: /u\n', '<p>[<span class="mention"><strong>@a</strong></span>]: /u</p>'],
  ['an admonition title is inline content (§12)', '::: note "T *b*"\nx\n:::\n', '<aside class="admonition note" aria-labelledby="adm-1"><p class="admonition-title" id="adm-1">T <strong>b</strong></p><p>x</p></aside>'],
  ['a code fence title is literal (§21)', '```js "T *b*"\nx\n```\n', '<pre title="T *b*"><code class="language-js">x</code></pre>'],
  ['LRM stays in the id and the text (§26)', '# a‎b\n', '<section id="a‎b"><h1>a‎b</h1></section>'],
  ['RLM stays in the id and the text (§26)', '# a‏b\n', '<section id="a‏b"><h1>a‏b</h1></section>'],
  ['ALM stays in the id and the text (§26)', '# a؜b\n', '<section id="a؜b"><h1>a؜b</h1></section>'],
  ['a destination keeps a bidi control (§26)', '[a](/u‮b)\n', '<p><a href="/u‮b">a</a></p>'],
  ['a braced comment is a comment (§21)', 'a {% x %} b\n', '<p>a  b</p>'],
  ['a colon-bearing id is inline content (§14)', '{#a:b}\n', '<p>{<span class="tag"><strong>#a</strong></span>:b}</p>'],
  ['an unresolved note reference consumes its attribute run (PART 9R R2)', 'a[^nope]{.c}\n', '<p>a[^nope]</p>'],
  ['an extension ends at its first ] (PART 3)', ':foo[a `b] c`\n', '<p><span class="ext-foo">a <code>b</code></span> c<code></code></p>'],
  ['a hyphen run reads source neighbors (CARVE-P3-021)', '{% c %}--x\n', '<p>–x</p>'],
  ['a quote reads emitted neighbors (CARVE-P3-023)', '{% c %}"x"\n', '<p>“x”</p>'],
  ['an arrow does not start inside a longer run (CARVE-P3-022)', 'a--->b\n', '<p>a—&gt;b</p>'],
  ['a flag-shaped run keeps its arrow out (CARVE-P3-022)', 'a ---> b\n', '<p>a ---&gt; b</p>'],
  ['= has no run rule (CARVE-P3-022)', 'a ===> b\n', '<p>a =⇒ b</p>'],
  ['the retain exception is the block start (CARVE-P3-023 R3)', "*'word*\n", '<p><strong>’word</strong></p>'],
  ['the retain exception holds at the block start (CARVE-P3-023 R3)', "'word\n", '<p>‘word</p>'],
  ['an unattributed symbol is text for direction (CARVE-P3-023)', ':a:"q"\n', '<p>:a:“q”</p>'],
  ['an attributed symbol closes the quote (CARVE-P3-023)', ':a:{.x}"q"\n', '<p><span class="x">:a:</span>”q”</p>'],
  ['an opening underscore is start of content (§7)', '_@a_\n', '<p><u><span class="mention"><strong>@a</strong></span></u></p>'],
  ['a closing underscore guards a tag (§7)', '_a_#b\n', '<p><u>a</u>#b</p>'],
  ['a braced-comment paragraph renders empty (§21)', '{% c %}\n', '<p></p>'],
  ['a braced-comment paragraph takes pending attributes (§21)', '{.k}\n{% c %}\n', '<p class="k"></p>'],
  ['a backslash ending the document is a hard break (§9)', 'a\\', '<p>a<br></p>'],
  ['a backslash ending a trimmed cell is a hard break (§9)', '| a\\ |\n', '<table><tbody><tr><td>a<br></td></tr></tbody></table>'],
]

for (const [name, source, expected] of pinned) {
  test(name, () => assert.equal(html(source), expected))
}
