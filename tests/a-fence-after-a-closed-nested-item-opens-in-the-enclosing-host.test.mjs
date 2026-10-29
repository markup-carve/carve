import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')

const cases = [
  [
    'a closed fence below an open sublist opens in the outer item',
    '- a\n    - child\n    ```\n    code\n    ```\nafter\n',
    '<ul><li>a<ul><li>child</li></ul><pre><code>code</code></pre></li></ul><p>after</p>',
    'code\n',
  ],
  [
    'a quoted closed fence below an open sublist opens in the outer item',
    '> - a\n>     - child\n>     ```\n>     code\n>     ```\nafter\n',
    '<blockquote><ul><li>a<ul><li>child</li></ul><pre><code>code</code></pre></li></ul></blockquote><p>after</p>',
    'code\n',
  ],
  [
    // A valid opener opens without a closer (carve#4018).
    'an unclosed fence below an open sublist opens in the outer item',
    '- a\n    - child\n    ```\n    code\nafter\n',
    '<ul><li>a<ul><li>child</li></ul><pre><code>code</code></pre></li></ul><p>after</p>',
  ],
  [
    'a fence after a closed nested line block opens in its box',
    '> - ::: box\n>   - ::: |\n>     ```\n>     :::\n>    ```\n>    :::bad\n>    :::\n- tail\n',
    '<blockquote><ul><li><div class="box"><ul><li><div class="line-block"><p><code></code></p></div></li></ul><pre><code>:::bad :::</code></pre></div></li></ul></blockquote><ul><li>tail</li></ul>',
    ':::bad\n:::\n',
  ],
  [
    'a closed payload fence stays with the line block',
    '> 1. ::: box\n>    - ::: |\n>      ```\n>      x\n>      ```\n>      :::\n>     ```\n>     - x\n> ```\n',
    '<blockquote><ol><li><div class="box"><ul><li><div class="line-block"><p><code>x</code></p></div></li></ul><pre><code>- x</code></pre></div></li></ol><pre><code></code></pre></blockquote>',
  ],
  [
    'a footnote definition past a box column is hoisted',
    '- ::: box\n    [^n]: note\n  :::\n\nref[^n]\n',
    '<ul><li><div class="box"></div></li></ul><p>ref<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p><section role="doc-endnotes" aria-label="Footnotes"><hr><ol><li id="fn1"><p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p></li></ol></section>',
  ],
  [
    'a fence after a wider nested item opens in its box',
    '> - ::: box\n>   -   ::: |\n>       ```\n>       :::\n>     ```\n>     :::\n>     :::bad\n>     :::\n- tail\n',
    '<blockquote><ul><li><div class="box"><ul><li><div class="line-block"><p><code></code></p></div></li></ul><pre><code>::: :::bad :::</code></pre></div></li></ul></blockquote><ul><li>tail</li></ul>',
    ':::\n:::bad\n:::\n',
  ],
  [
    'an unclosed fence under a sublist takes the outer item until the quote ends',
    '> - a\n>     - child\n>     ```\n>\n>       ```\n>   ~~~\nafter\n',
    '<blockquote><ul><li>a<ul><li>child</li></ul><pre><code>``` ~~~</code></pre></li></ul></blockquote><p>after</p>',
  ],
  [
    'a box column run is payload of a fence opened after a closed line block',
    '- ::: box\n  - ::: |\n    x\n    :::\n   ```\n  :::\n',
    '<ul><li><div class="box"><ul><li><div class="line-block"><p>x</p></div></li></ul><pre><code>:::</code></pre></div></li></ul>',
  ],
  [
    'a footnote at the box column stays hoisted',
    '- ::: box\n  [^n]: note\n  :::\n\nref[^n]\n',
    '<ul><li><div class="box"></div></li></ul><p>ref<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p><section role="doc-endnotes" aria-label="Footnotes"><hr><ol><li id="fn1"><p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p></li></ol></section>',
  ],
  [
    'an open child paragraph keeps a lazy line',
    '> - a\n>     - child\nafter\n',
    '<blockquote><ul><li>a<ul><li>child after</li></ul></li></ul></blockquote>',
  ],
  [
    'a bare closer past a box column closes the box',
    '- ::: box\n  text\n   :::\nafter\n',
    '<ul><li><div class="box"><p>text</p></div></li></ul><p>after</p>',
  ],
  [
    // An unclosed fence runs to its container's end, past the host's closer (carve#4018).
    'an unclosed fence at a note block start takes the note closer',
    '::: note\n```\nx\n:::\nafter\n',
    '<aside class="admonition note" aria-label="Note"><pre><code>x ::: after</code></pre></aside>',
  ],
  [
    'an unclosed fence at a box block start ends with the item',
    '- ::: box\n  ```\n  x\n  :::\nafter\n',
    '<ul><li><div class="box"><pre><code>x :::</code></pre></div></li></ul><p>after</p>',
  ],
  [
    'a line block payload has no closer after its list ends',
    '- ::: |\n  ```\n  :::\n\n  y\n- b\n',
    '<ul><li><div class="line-block"><p><code></code></p></div><p>y</p></li><li><p>b</p></li></ul>',
  ],
  [
    'a later fence cannot close a prior list payload',
    '- ::: |\n  ```\n  :::\n\n  y\n- b\n\npara\n\n  ```\n',
    '<ul><li><div class="line-block"><p><code></code></p></div><p>y</p></li><li><p>b</p></li></ul><p>para</p><pre><code></code></pre>',
  ],
  [
    'a bare closer beyond the box column is unclosed code',
    '- ::: box\n   ```\n   :::bad\n   :::\n',
    '<ul><li><div class="box"><pre><code>:::bad :::</code></pre></div></li></ul>',
    ':::bad\n:::\n',
  ],
  [
    'a quoted bare closer beyond the box column is unclosed code',
    '> - ::: box\n>    ```\n>    :::bad\n>    :::\n',
    '<blockquote><ul><li><div class="box"><pre><code>:::bad :::</code></pre></div></li></ul></blockquote>',
    ':::bad\n:::\n',
  ],
  [
    'a bare closer at the box column is unclosed code',
    '- ::: box\n  ```\n  x\n  :::\nafter\n',
    '<ul><li><div class="box"><pre><code>x :::</code></pre></div></li></ul><p>after</p>',
    'x\n:::\n',
  ],
  [
    'a deeper bare run is unclosed code',
    '- ::: box\n    ```\n    :::\n  :::\n',
    '<ul><li><div class="box"><pre><code>::: :::</code></pre></div></li></ul>',
    ':::\n:::\n',
  ],
]

for (const [name, source, expected, codeText] of cases) {
  test(name, () => {
    assert.equal(html(source), expected)
    if (codeText !== undefined) assert.ok(renderDoc(parse(source)).includes(`<pre><code>${codeText}</code></pre>`))
  })
}
