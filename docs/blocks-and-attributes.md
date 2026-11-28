---
description: Where an attribute attaches on a block versus an inline element, and why the two differ.
---

# Blocks and Attributes

Carve has two kinds of element, and an attribute attaches to each kind in a different place. Once this rule is clear, most attribute questions answer themselves.

| Kind | Where the `{…}` goes |
| --- | --- |
| Block element | on its own line, directly above the block |
| Inline element | glued to the end of the element, with no space |
| List item or table cell | glued to the item marker or the cell pipe |

This follows djot: block attributes lead the block, inline attributes trail the span. A block never takes a trailing attribute on its own line.

## Block elements

A block starts on its own line and is separated from its neighbors by structure: a blank line, a marker or a fence.

- Paragraph
- Heading: `= …` to `====== …`, or `# …` to `###### …`
- Block quote: `> …`, or the same block fenced as `::: >`
- List: bullet `-` or `*`, ordered `1.`, `1)`, letters and Roman numerals, task items such as `- [ ]`, and their list items
- Description list: a term line `:: …` and a description line `: …`
- Code block: a backtick fence
- Div, admonition, line block and hard-break block: a colon fence `::: …`
- Table: pipe rows, with `|=` header cells
- Thematic break: `***`
- Frontmatter: a `---` block on line 1
- Comment block: `%%%`
- Link, footnote and abbreviation definitions
- Caption: a `^ …` line below an image, table, code block, quote, math block or figure group

A heading, a quote, a list or an attribute line directly after paragraph text becomes part of that paragraph. Put a blank line before it. A list item needs content on its marker line.

### Task items

Task states are `[ ]` and `[_]` (open), `[/]` (in progress), `[!]` (blocked), `[x]` or `[X]` (done), `[-]` (dropped), `[>]` (deferred) and `[?]` (uncertain). Only done is checked. Every state other than the plain open box is written as `data-task-state` on the `<li>`, so a stylesheet can tell them apart.

::: compare
```crv
- [ ] open
- [/] in progress
- [!] blocked
- [x] done
- [-] dropped
- [>] deferred
- [?] uncertain
```
```html
<ul class="task-list">
  <li class="task" style="list-style: none"><input type="checkbox" disabled aria-label="open"> open</li>
  <li data-task-state="/" class="task" style="list-style: none"><input type="checkbox" disabled aria-label="in progress"> in progress</li>
  <li data-task-state="!" class="task" style="list-style: none"><input type="checkbox" disabled aria-label="blocked"> blocked</li>
  <li data-task-state="x" class="task" style="list-style: none"><input type="checkbox" checked disabled aria-label="done"> done</li>
  <li data-task-state="-" class="task" style="list-style: none"><input type="checkbox" disabled aria-label="dropped"> dropped</li>
  <li data-task-state="&gt;" class="task" style="list-style: none"><input type="checkbox" disabled aria-label="deferred"> deferred</li>
  <li data-task-state="?" class="task" style="list-style: none"><input type="checkbox" disabled aria-label="uncertain"> uncertain</li>
</ul>
```
:::

### Attributing a block {#attribute-placement}

Put the attribute block on the line directly above the block:

::: compare
```crv
{#install .featured}
== Setup

{.callout}
::: note
Read this first.
:::
```
```html
<section id="install">
  <h2 class="featured">Setup</h2>
  <aside class="admonition note callout" aria-label="Note">
    <p>Read this first.</p>
  </aside>
</section>
```
:::

On a top-level heading the id moves to the `<section>` around it, and every other attribute stays on the `<h*>`. This applies whether the id was written as `{#install}` or generated from the heading text. The id names the region a `#fragment` URL targets, and that region is the section. `.featured` describes the heading the author wrote it on, so a class meant for the whole region belongs on a div instead. A heading inside a container (a quote, a div, a list item) gets no section, so there its id stays on the `<h*>` with the rest. Section wrapping is a render option, on by default; with it off, every heading keeps its own id.

The same rule holds for every block: paragraphs, headings, quotes, lists, description lists, code blocks, divs and admonitions, line blocks, hard-break blocks, tables, thematic breaks, definitions and comment blocks. All of them take their attributes on the line above. A caption is the one block that takes no attribute line: its attributes go on the line above the block it captions.

The attribute line must touch the block. In 0.1 an attribute line floated forward across blank lines; in 0.2 a blank line ends the attachment, and the attribute line becomes paragraph text that shows up in the page. `carve lint` reports it as `unattached-block-attribute`:

<!-- carve-sample {"lint":"shows an attribute line cut off by a blank line"} -->
::: compare
```crv
{#install}

== Setup
```
```html
<p>{#install}</p>
<section id="Setup">
  <h2>Setup</h2>
</section>
```
:::

An attribute block sits on one line. 0.1 let a block wrap onto indented lines; 0.2 does not, and a brace block that runs over a line break is text. To spread attributes out, glue several blocks together or stack attribute lines. Both merge into one set: classes add up, and a later id or key replaces an earlier one.

<!-- carve-sample {"lint":"the pinned lint reports block-opener-without-blank-line on the second of two stacked attribute lines","fmtSkip":"shows the split spelling that fmt merges into one block"} -->
::: compare
```crv
{#intro}{.lead}
{data-level=2}
A paragraph with three attribute blocks.
```
```html
<p id="intro" class="lead" data-level="2">A paragraph with three attribute blocks.</p>
```
:::

`carve fmt` writes the merged set back as one block in a fixed order: the id, the classes, the language, then the keys.

A brace block alone on a list item's marker line is an attribute line for the item's first block, here the paragraph:

::: compare
```crv
- {.note}
  A paragraph inside the item.
```
```html
<ul>
  <li><p class="note">A paragraph inside the item.</p></li>
</ul>
```
:::

A trailing `{…}` on a heading line is not an attribute block. It stays in the heading text, and `carve lint` reports `heading-trailing-attribute`. Move it to the line above:

<!-- carve-sample {"lint":"shows a trailing brace block on a heading"} -->
::: compare
```crv
== Setup {.featured}
```
```html
<section id="Setup-featured">
  <h2>Setup {.featured}</h2>
</section>
```
:::

### Captions

A caption line `^ …` directly below a block captions it. The attribute line, the block and the caption line belong together, so no blank line stands between them:

::: compare
```crv
{#harbor .wide}
![Boats in the harbor](harbor.jpg)
^ The harbor at dawn.
```
```html
<figure id="harbor" class="wide">
  <img src="harbor.jpg" alt="Boats in the harbor">
  <figcaption>The harbor at dawn.</figcaption>
</figure>
```
:::

The three lines make one `<figure>`: the image goes inside it, the caption becomes its `<figcaption>`, and the id and class sit on the figure. A caption attaches to an image, a table, a code block, a quote, a math block or a figure group. On a quote it names the source:

::: compare
```crv
> Measure twice, cut once.
^ A carpenter's proverb
```
```html
<figure>
  <blockquote><p>Measure twice, cut once.</p></blockquote>
  <figcaption>A carpenter’s proverb</figcaption>
</figure>
```
:::

A blank line breaks the group apart. An attribute line with a blank line below it attaches to nothing, and a caption line after a blank line has no block above it. Both then render as paragraph text. `carve lint` reports them as `unattached-block-attribute` and `unattached-caption`:

<!-- carve-sample {"lint":"shows an attribute line and a caption cut off by blank lines","fmtSkip":"fmt escapes the orphaned caret"} -->
::: compare
```crv
{#harbor .wide}

![Boats in the harbor](harbor.jpg)

^ The harbor at dawn.
```
```html
<p>{#harbor .wide}</p>
<img src="harbor.jpg" alt="Boats in the harbor">
<p>^ The harbor at dawn.</p>
```
:::

A caption continues on lines indented past its `^`. An unindented line below it starts the next block.

### Code blocks: line numbers, titles and highlighting

A code block takes its attributes on the line above the fence, and they go onto the rendered `<pre>`. The fence line holds only structured metadata, in this order: the language, glued to the backticks, an optional quoted header and an optional bracketed label.

::: compare
````crv
{.line-numbers data-line-start=42}
```php "src/app.php" [Backend]
$x = compute();
return $x;
```
````
```html
<pre title="src/app.php" class="line-numbers" data-line-start="42"><code class="language-php">$x = compute();
return $x;
</code></pre>
```
:::

- `.line-numbers` asks the host for a line-number gutter. Numbering is 1-based, as in editors, diffs and compiler messages.
- `data-line-start=42` moves the start, so the gutter begins at 42. Use it for an excerpt from a larger file.
- `"src/app.php"` is the header. The core writes it as `title` on the `<pre>`, and hosts often show it as a file name above the block.
- `[Backend]` is a grouping label. The core writes nothing for it on a code block; the code-group extension uses it as the tab name.

If the attribute line also sets `title`, that attribute wins over the quoted header:

::: compare
````crv
{title="shown title"}
```php "fallback title"
echo "ok";
```
````
```html
<pre title="shown title"><code class="language-php">echo "ok";
</code></pre>
```
:::

The fence line takes nothing else. A brace block or a line range after the language, as in `` ```js {1,3} ``, is not Carve syntax. The fence still opens with that language, the extra words are dropped, and `carve lint` reports `fence-title-syntax`:

<!-- carve-sample {"lint":"shows a line range on the fence line","fmtSkip":"fmt drops the invalid fence metadata"} -->
::: compare
````crv
```js {1,3}
const a = 1;
```
````
```html
<pre><code class="language-js">const a = 1;
</code></pre>
```
:::

The same applies to a header without quotes, or a label before the header. Put attributes on the line above, like any other block.

#### Line options

Line numbers and highlighted lines are attributes on the line above the fence:

::: compare
````crv
{.line-numbers data-line-start=42 data-highlight=1,3-5}
```php "src/app.php"
$a = 1;
$b = 2;
```
````
```html
<pre title="src/app.php" class="line-numbers" data-line-start="42" data-highlight="1,3-5"><code class="language-php">$a = 1;
$b = 2;
</code></pre>
```
:::

- `.line-numbers` asks for a line-number gutter.
- `data-line-start` is the number of the first line. It is a decimal number of at least 1 without a leading zero; without it the gutter starts at 1.
- `data-highlight` lists the lines to highlight: line numbers and `a-b` ranges, separated by commas without spaces. The lines are counted from the first line of the block, not from `data-line-start`.

The renderer writes these keys as it writes any attribute, and does not check them. A host or highlighter reads them from the `<pre>`. On a block with a caption they stay on the `<pre>`, while its other attributes go on the `<figure>` around it. `carve fmt` and the HTML importer keep them.

A code include does not set the start for you. With `@lines:4-5`, write the first selected line yourself:

```crv
{.line-numbers data-line-start=4}
{{ src/server.js @code:js @lines:4-5 }}
```

`data-line-start=auto` is not a value: it is written to the `<pre>` as the text `auto`, and a host starts the gutter at 1.

Common highlighters name these options differently. A host adapter maps them:

| Highlighter | Reads |
| --- | --- |
| Prism | `data-start` and `data-line` on `<pre>` |
| reveal.js | `data-line-numbers` on `<code>` |
| Pygments, pymdownx | `linenums` and `hl_lines` |
| Torchlight | `lineNumbersStart` |
| Shiki | a transformer that reads the node's `attrs` |

A host that highlights through `codeBlockRenderer` finds them in the node's `attrs`, also for a block with a caption.

How highlighting, diff and focus marks look is up to the host, not Carve syntax. Torchlight reads annotations inside the code, so the signal lives in the code body and the fence line stays `lang "header" [label]`:

````crv
```php
$safe = clean($in);   // [tl! highlight]
$old  = legacy();     // [tl! --]
$new  = modern();     // [tl! ++]
```
````

#### Language-aware instructional diffs

When a short code sample should keep its language highlighting while marking added and removed lines, put the `.diff` class above the language fence:

::: compare
````crv
{.diff}
```js
  let fileIcon = document.querySelector("li.file-entry > span.icon");
- fileIcon.classList.remove("icon-file-text");
+ fileIcon.classList.add("icon-file-text");
```
````
```html
<pre class="diff"><code class="language-js">  let fileIcon = document.querySelector("li.file-entry &gt; span.icon");
- fileIcon.classList.remove("icon-file-text");
+ fileIcon.classList.add("icon-file-text");
</code></pre>
```
:::

The two signals stay independent: `js` names the language of the code, while `.diff` asks the host to present each line's leading `+`, `-` or space as a diff marker. Core HTML keeps both on `<pre class="diff"><code class="language-js">`; drawing the markers is the host's job. When the fence has a `^` caption, the figure takes the attribute line, so the class moves to it:

::: compare
````crv
{.diff}
```js
- oldName();
+ newName();
```
^ Renamed call
````
```html
<figure class="diff">
  <pre><code class="language-js">- oldName();
+ newName();
</code></pre>
  <figcaption>Renamed call</figcaption>
</figure>
```
:::

A host has to check both shapes. Sites using Shiki can use the browser-safe transformer and baseline CSS from [`@markup-carve/carve-grammars`](https://github.com/markup-carve/carve-grammars):

```js
import { diffCodeTransformer } from '@markup-carve/carve-grammars/shiki/diff'
import '@markup-carve/carve-grammars/shiki/carve.css'
```

For each code block whose `<pre>`, or the `<figure>` directly around it, has the `diff` class, create a fresh transformer and pass it with the fence language:

```js
const language = [...code.classList]
  .find((name) => name.startsWith('language-'))
  ?.slice('language-'.length)

const isDiff = pre.classList.contains('diff')
  || pre.parentElement?.matches('figure.diff')

const transformers = isDiff
  ? [diffCodeTransformer()]
  : []

const highlighted = highlighter.codeToHtml(code.textContent, {
  lang: language,
  theme: 'github-light',
  transformers,
})
```

The transformer removes the first marker character before language tokenization, then restores it as a `.diff-marker` span and gives added and removed lines the classes `diff add` and `diff remove`. The baseline CSS colors that span and the line background; it does not draw a second marker. This is meant for instructional code changes. Use a regular `diff` fence for a complete patch with file headers, hunk headers or other patch metadata.

### Container fences: titles and labels

A `:::` fence line takes the same two metadata parts as a code fence, after the type word and in the same order: an optional quoted `"header"` and an optional bracketed `[label]`. This is the one-line way to title an admonition:

::: compare
```crv
::: note "Custom Title"
The quoted header becomes the admonition title.
:::

::: tip "Pro Tip" [Build]
Header and label together: header first, label second.
:::
```
```html
<aside class="admonition note" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1">Custom Title</p>
  <p>The quoted header becomes the admonition title.</p>
</aside>
<aside class="admonition tip" aria-labelledby="adm-2">
  <p class="admonition-title" id="adm-2">Pro Tip</p>
  <p class="div-label">Build</p>
  <p>Header and label together: header first, label second.</p>
</aside>
```
:::

Two strictness rules:

- The header must use straight double quotes. A bare title (`::: note Custom Title`), typographic quotes or a brace block after the type word are not metadata. The container still opens, the extra words are dropped, and `carve lint` reports `fence-title-syntax` (or `fence-opener-fallback` for a glued brace block such as `::: note{.x}`). A type word glued to the colons (`:::note`) opens nothing, and the line stays paragraph text.
- The quoted header is the only thing that produces the visible `<p class="admonition-title">`. A `title` key on the attribute line above is an ordinary HTML `title` attribute (a hover tooltip), as on any block.

<!-- carve-sample {"lint":"shows a title without quotes","fmtSkip":"fmt drops the bare words"} -->
::: compare
```crv
::: note Custom Title
The bare words are dropped.
:::
```
```html
<aside class="admonition note" aria-label="Note">
  <p>The bare words are dropped.</p>
</aside>
```
:::

::: compare
```crv
{title="Hover text"}
::: note
A tooltip, not a visible title.
:::
```
```html
<aside class="admonition note" title="Hover text" aria-label="Note">
  <p>A tooltip, not a visible title.</p>
</aside>
```
:::

#### Title or label

Both parts can end up visible, so the difference is their role, not their visibility:

| | `"Title"` (header) | `[Label]` (grouping label) |
| --- | --- | --- |
| Role | caption of the block's content | name of the block among its siblings |
| Standalone admonition or div | `<p class="admonition-title">` | `<p class="div-label">`, so the text never vanishes |
| Tabs extension | the tab name; a tab needs one | ignored as a name |
| Code-group extension | the panel name when the code block has no label | the panel name |
| Details extension | the `<summary>` | ignored |

This changed in 0.2: a tab takes its name only from its quoted title. A bracket label, a `label` attribute or a first heading inside the tab no longer names it, and the tabs extension claims a `tabs` div only when every `tab` in it has a quoted title. See [Extensions](./extensions.md) for the tabs, code-group and details output.

### Figure groups

One container kind is reserved: a bare `::: figure` opener, with no title and no label, is a figure group. Its captioned children become panels, and a `^` caption after the closing fence captions the whole group. It is the one `:::` closer that takes a caption.

::: compare
```crv
::: figure
![Before](before.png)
^ Before

![After](after.png)
^ After
:::
^ The same room before and after.
```
```html
<figure class="carve-figure-group">
  <figure class="carve-figure-panel">
    <img src="before.png" alt="Before">
    <figcaption>Before</figcaption>
  </figure>
  <figure class="carve-figure-panel">
    <img src="after.png" alt="After">
    <figcaption>After</figcaption>
  </figure>
  <figcaption>The same room before and after.</figcaption>
</figure>
```
:::

Give the opener a quoted title or a `[label]` and it is no longer a group but a plain div with the class `figure`, and `carve lint` reports `figure-group-opener-metadata`. The group has no title slot; its caption carries that information.

<!-- carve-sample {"lint":"shows a figure opener with a title","fmtSkip":"fmt rewrites the opener as a plain div with the class"} -->
::: compare
```crv
::: figure "Room"
![Before](before.png)
:::
```
```html
<div class="figure">
  <p class="admonition-title">Room</p>
  <img src="before.png" alt="Before">
</div>
```
:::

### The block quote has two spellings

`>` on every line, or a colon fence whose type is a bare `>`:

::: compare
```crv
::: >
Notes from the meeting:

- ship the parser
- then the renderer
:::
^ Minutes, week 12
```
```html
<figure>
  <blockquote>
    <p>Notes from the meeting:</p>
    <ul>
      <li>ship the parser</li>
      <li>then the renderer</li>
    </ul>
  </blockquote>
  <figcaption>Minutes, week 12</figcaption>
</figure>
```
:::

Both give the same tree and the same HTML. The fence is useful when the quote holds structure that would need a `>` on every line: a list, a code block, a table, a nested quote. A quote's lazy continuation only adds plain paragraph text, never new block structure.

Three things follow from the two spellings being one node:

- `carve fmt` writes back whichever spelling you used. It never converts one into the other.
- The fence nests at constant width. `::: >` inside `::: >` needs no longer fence, because a typed opener never closes anything and only a bare `:::` of the same length closes. To quote a block again, add an opener above and a closer below; nothing inside changes.
- It takes a `^` caption on its closing fence, and a captioned quote is a `<figure>` with either spelling.

The separator is a space: `:::>` opens nothing and stays paragraph text, as `:::|` does.

### Fences and raw content

A backtick fence makes a code block. A colon fence makes a container. A raw fence, such as `` ```=html ``, is explicit and needs the host to allow raw HTML; without that the HTML renderer writes its content as an escaped code block. A fence with no closer runs to the end of the document and is reported as `unclosed-code-fence` or `unclosed-container-fence`.

### Tables

A table takes its attributes on the line above, and a caption below it becomes the `<caption>`. Header cells start with `|=`. A cell's own attributes, including its alignment, go in a brace block glued to the pipe that opens it:

::: compare
```crv
{#stock .data}
|= Item |={>} Count |
|{.fruit} Apples | 3 |
| Pears | 4 |
^ Stock on hand
```
```html
<table id="stock" class="data">
  <caption>Stock on hand</caption>
  <thead>
    <tr><th scope="col">Item</th><th scope="col" style="text-align: right;">Count</th></tr>
  </thead>
  <tbody>
    <tr><td class="fruit">Apples</td><td style="text-align: right;">3</td></tr>
    <tr><td>Pears</td><td style="text-align: right;">4</td></tr>
  </tbody>
</table>
```
:::

An alignment mark on a header cell, such as `|={>}`, aligns its whole column. A few keys on the table's attribute line are read as structure instead of being written out; see [consumed structural keys](#consumed-structural-keys) below.

### Keeping line breaks: `::: |` and `::: \` {#keeping-line-breaks}

Lines next to each other in a paragraph join into one running paragraph, as in Markdown. Two containers keep each line on its own line instead. A `\` at the end of a single line does the same for that one line.

::: compare
```crv
::: |
Roses are red,
    violets are blue.

- not a list
:::
```
```html
<div class="line-block">
  <p>Roses are red,<br>
&nbsp;&nbsp;&nbsp;&nbsp;violets are blue.</p>
  <p>- not a list</p>
</div>
```
:::

<!-- carve-sample {"fmtSkip":"shows that leading spaces are dropped; fmt removes them from the source"} -->
::: compare
```crv
::: \
Roses are red,
    violets are blue.

- a real list
- second
:::
```
```html
<div class="hardbreaks">
  <p>Roses are red,<br>
violets are blue.</p>
  <ul>
    <li>a real list</li>
    <li>second</li>
  </ul>
</div>
```
:::

| | `::: \|` line block | `::: \` hard breaks |
| --- | --- | --- |
| For | verse, lyrics, addresses: text whose layout is the content | ordinary content where a few line breaks should show |
| Each line break | becomes `<br>` | becomes `<br>`, in paragraphs directly inside |
| Leading spaces | kept (`&nbsp;`) | dropped, as in any paragraph |
| Blank line | starts a new stanza | starts a new block |
| Lists, fences, tables inside | plain text: the stanza is the only structure | work normally, without hard breaks of their own |

In a line block, a `\` alone on a line gives an empty verse line, because a blank line would start a new stanza instead:

::: compare
```crv
::: |
First line
\
Third line
:::
```
```html
<div class="line-block">
  <p>First line<br>
<br>
Third line</p>
</div>
```
:::

## Inline elements

An inline element lives inside a line of text.

- Emphasis `/…/`, strong `*…*`, underline `{_…_}`
- Strikethrough `{~…~}`, highlight `{=…=}`, subscript `{,…,}`, superscript `{^…^}`
- Inline code `` `…` ``, inline literal `` !`…` `` (verbatim text, no code styling)
- Link `[…](…)`, reference link `[…][…]`, image `![…](…)`
- Span `[…]{…}`, autolink `<…>`, footnote reference `[^…]`, inline footnote `^[…]`
- Math `` $`…` ``, symbol `:name:`, mention `@name`, tag `#name`

In 0.2 a bare `_`, `~` or `=` is plain text. Underline, strikethrough and highlight always use the braced form.

### Attributing an inline

Glue the attribute block to the end of the element, with no space:

::: compare
```crv
A [keyword]{#kw .term} and *bold text*{.lead} and `code`{.lang-js}.
```
```html
<p>A <span id="kw" class="term">keyword</span> and <strong class="lead">bold text</strong> and <code class="lang-js">code</code>.</p>
```
:::

A space before the `{…}` breaks the attachment. The braces are then literal text, and `carve lint` reports `unattached-inline-attribute`:

<!-- carve-sample {"lint":"shows a space between the span and its attribute block"} -->
::: compare
```crv
A [keyword] {.term} with a space.
```
```html
<p>A [keyword] {.term} with a space.</p>
```
:::

A bracket pair with an attribute block glued to it is a span. An attribute block also attaches to a link, an image, an autolink, a code span, a math span, a footnote reference, a symbol and every closed emphasis, strong or braced span.

## Attribute syntax

The same `{…}` block is used in both positions:

::: compare
```crv
[text]{#the-id .class-a .class-b key="a value" boolean}
```
```html
<p><span id="the-id" class="class-a class-b" key="a value" boolean="">text</span></p>
```
:::

- `#id` sets the element id. When a block or a merged run holds several ids, the last one wins.
- `.class` adds a class, and can repeat.
- `key=value` or `key="value"` sets any other attribute. Quote a value that holds a space, a quote, a backslash, a pipe or a closing brace; single or double quotes both work.
- `boolean`: a bare word without `#`, `.` or `=` is an attribute with an empty value. `{open}` and `{open=""}` are the same and both render `open=""`; `carve fmt` writes the bare form. A bare name may not start with `_`, because `{_x_}` is an underline: a bare `{_foo}` stays text, and an underscore attribute keeps its value (`{_k=""}`). An id, a class or a key with a value may start with `_`.
- `:tag` sets the natural language of the content (see below).

Keys compare without regard to letter case, and a key named `id` or `class` folds into the id or the classes: `carve fmt` writes `{class="a b" ID=z}` as `{#z .a .b}`. One part that fits none of these shapes makes the whole brace block plain text.

<!-- carve-sample {"fmtSkip":"shows both spellings of an empty value"} -->
::: compare
```crv
[a]{open} [b]{open=""} [c]{_k=""}
```
```html
<p><span open="">a</span> <span open="">b</span> <span _k="">c</span></p>
```
:::

### Language: `{:fr}`

`{:tag}` sets the language of what it attaches to, and renders as the `lang` attribute. It works anywhere an attribute block does and needs no extension:

::: compare
```crv
The title is [Le Bon Usage]{:fr}.

{:de}
> Das ist ein deutschsprachiger Absatz.
```
```html
<p>The title is <span lang="fr">Le Bon Usage</span>.</p>
<blockquote lang="de"><p>Das ist ein deutschsprachiger Absatz.</p></blockquote>
```
:::

Any BCP 47 tag works, including script, region and private-use subtags: `{:de-CH}`, `{:sr-Latn-RS}`, `{:x-acme}`. The tag is kept exactly as written, case included.

The empty form `{:}` says the language is explicitly unknown, which is different from leaving it off. Without it the content inherits the surrounding language; `{:}` stops that inheritance:

::: compare
```crv
{:de}
> Der Titel ist [unbekannt]{:}.
```
```html
<blockquote lang="de"><p>Der Titel ist <span lang="">unbekannt</span>.</p></blockquote>
```
:::

::: tip Direction is separate
A language tag never sets writing direction. Direction follows the script, and a tag need not name one, so set it explicitly where it matters: `[…]{:ar dir=rtl}`. HTML's `dir="auto"` is available too.
:::

The language part is not a key. When a block holds both `:tag` and a `lang` key, the language part decides, in either order, and the `lang` key is not written:

<!-- carve-sample {"fmtSkip":"shows both orders; fmt moves the language part before the keys"} -->
::: compare
```crv
[a]{:fr lang=de} and [b]{lang=de :fr}
```
```html
<p><span lang="fr">a</span> and <span lang="fr">b</span></p>
```
:::

`carve fmt` keeps a `lang=fr` key as written; it does not rewrite it to `{:fr}`. Both render the same `lang` attribute.

A tag that is not well formed leaves the whole block as literal text: `{:en_US}`, `{:-en}` and `{:français}` stay visible in the output. The sigil takes no space after it: `{: fr}` is the empty language plus a separate boolean attribute `fr`.

::: compare
```crv
[a]{:en_US} and [b]{: fr}
```
```html
<p>[a]{:en_US} and <span lang="" fr="">b</span></p>
```
:::

### Semantic spans: `{kbd}`, `{abbr="…"}`, `{time="…"}`

On an inline span, three lower-case attribute names are consumed and become the HTML element of the same name: `abbr`, `time` and `kbd`.

::: compare
```crv
Press [Tab]{kbd} to indent.
```
```html
<p>Press <kbd>Tab</kbd> to indent.</p>
```
:::

Two of them keep what you wrote: an `abbr` value becomes `title`, and a `time` value becomes `datetime`. A value on `kbd` only picks the element.

::: compare
```crv
[HTML]{abbr="HyperText Markup Language"} shipped in [1993]{time=1993}.
```
```html
<p><abbr title="HyperText Markup Language">HTML</abbr> shipped in <time datetime="1993">1993</time>.</p>
```
:::

Several at once nest in a fixed order, `abbr` innermost, then `time`, then `kbd`, whatever order you typed them in:

::: compare
```crv
[x]{kbd abbr=Example time=2026}
```
```html
<p><kbd><time datetime="2026"><abbr title="Example">x</abbr></time></kbd></p>
```
:::

Anything else rides the outermost element. A consumed name renames the span rather than wrapping it, so an id or class lands on the element you wrote it on:

::: compare
```crv
[Tab]{#k .key kbd}
```
```html
<p><kbd id="k" class="key">Tab</kbd></p>
```
:::

Three things worth knowing:

- The `<span>` remains only when no name was consumed. `[x]{onclick="…"}` is still `<span>x</span>`: hardening removes attributes, never the element you wrote.
- The scope is exactly an ordinary span. The same names on a code span, link, image or attribute line are ordinary attributes, so `` `c`{kbd} `` is `<code kbd="">c</code>`, not a `<kbd>`, and `carve lint` reports `semantic-attribute-outside-span`.
- Only HTML changes. The tree keeps an ordinary span with the authored attributes, plain-text and terminal output show the content, and `carve fmt` writes the span back with its attributes, so `[Tab]{kbd}` formats to itself. The names match in lower case only: `{KBD}` is an ordinary attribute.

#### Why only three

A name is reserved only where Carve has no other inline spelling for that element, and only where it belongs in the core: it carries data the author would otherwise lose (`abbr`, `time`), or it is common enough that needing an extension would make no sense (`kbd`).

- `code` and `mark` need no name: `` `x` `` writes `<code>` and `{=x=}` writes `<mark>`.
- `samp`, `var`, `cite` and `dfn` belong to the [semantic span extension](./extensions.md), with the same spelling and rules, off until a host enables it. Until then they stay ordinary attributes.
- An abbreviation definition (`*[HTML]: HyperText Markup Language`) also writes `<abbr>`, through a different mechanism: it expands every occurrence in the document, while `[HTML]{abbr="…"}` marks one occurrence with its own title, and can mark a term no definition declares.

The `:name[content]` form is generic inline extension syntax. Without an extension that claims the name, `:kbd[Tab]` renders as `<span class="ext-kbd">Tab</span>`; write `[Tab]{kbd}` instead.

::: compare
```crv
[output]{samp} and :kbd[Tab]
```
```html
<p><span samp="">output</span> and <span class="ext-kbd">Tab</span></p>
```
:::

## Consumed structural keys

A few names on a block attribute line are read as structure and consumed: they change what the block renders as, and they are not written back out as an HTML attribute. The spelling is the ordinary one; these are the names that mean something to the block below them.

| Key | On | What it does |
| --- | --- | --- |
| `start=N` | an ordered list | sets the number of the first item |
| `header-rows=N`, `footer-rows=N` | a table | the leading or trailing rows become `<thead>` or `<tfoot>` |
| `body-rows`, `body-header-rows`, `body-header-cols` | a table | body partitions, intermediate header rows and row-header columns |
| `aligns`, `valigns`, `widths` | a table | per-column alignment and width, as comma-separated lists by position |
| `table` | a code fence whose language is `csv` or `tsv` | the fence becomes a table, its records the rows; see [CSV and TSV data](/cheatsheet#csv-and-tsv-data) |
| `align=left\|right\|center` | a paragraph, div, heading, line block or hard-break block | writes the CSS `text-align` declaration instead of the legacy HTML attribute |

Everything else on that line is an ordinary attribute and reaches the output as one, and so does a consumed name on another element or with an invalid value. `{align=justify}` before a paragraph stays `<p align="justify">`.

The table keys keep their 0.1 meaning with two changes: a list with one invalid entry now has no effect at all, and `header-rows` on a pipe table sets only which rows form the head, without turning their cells into header cells (mark those with `|=`). `carve upgrade` rewrites `header-rows` on a pipe table to `|=` header cells and reports it as `deprecated-table-attribute`.

::: compare
```crv
{aligns=left,right widths=30,70}
| Apples | 3 |
| Pears | 4 |
```
```html
<table>
  <colgroup>
    <col style="width: 30%;">
    <col style="width: 70%;">
  </colgroup>
  <tbody>
    <tr><td style="text-align: left;">Apples</td><td style="text-align: right;">3</td></tr>
    <tr><td style="text-align: left;">Pears</td><td style="text-align: right;">4</td></tr>
  </tbody>
</table>
```
:::

::: compare
````crv
{table}
```csv
name,qty
apples,3
```
````
```html
<table>
  <thead>
    <tr><th scope="col">name</th><th scope="col">qty</th></tr>
  </thead>
  <tbody>
    <tr><td>apples</td><td>3</td></tr>
  </tbody>
</table>
```
:::

### `{start=…}`: the first number of an ordered list

A valid `start` sets the number of the first item, as a first marker of `5.` would. Where both are written, the attribute decides. `carve fmt` moves the number into the markers:

<!-- carve-sample {"fmtSkip":"fmt writes the start into the markers"} -->
::: compare
```crv
{start=5}
1. five
2. six
```
```html
<ol start="5">
  <li>five</li>
  <li>six</li>
</ol>
```
:::

### `{align=…}`: text alignment uses the CSS declaration

On a paragraph, div, heading (`h1` to `h6`), line block or hard-break block, `align=left`, `right` or `center` means text alignment. The HTML renderer consumes the key and writes `style="text-align: VALUE;"`:

::: compare
```crv
{align=right}
Aligned text.
```
```html
<p style="text-align: right;">Aligned text.</p>
```
:::

If the element already has a `style`, the declaration is appended to that one attribute rather than producing a duplicate:

::: compare
```crv
{align=center style="color: teal"}
== Centered
```
```html
<section id="Centered">
  <h2 style="color: teal; text-align: center;">Centered</h2>
</section>
```
:::

The element is part of the rule. On a table the legacy `align` attribute means the placement of the table, not the alignment of its cell text, so rewriting it to `text-align` would change the document. A table therefore keeps `align` as an ordinary attribute, as does every element outside the text-block set, and every value other than `left`, `right` and `center`:

::: compare
```crv
{align=justify}
A paragraph.

{align=center}
| a | b |
```
```html
<p align="justify">A paragraph.</p>
<table align="center">
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```
:::

### `{loose}` is gone

0.1 had a `{loose}` key for the looseness a blank line could not spell. 0.2 removed it: a list is loose only when a blank line stands between two of its items, and `loose` is an ordinary attribute with no effect on spacing. `carve upgrade` removes the key and reports the lists whose output changes.

::: compare
```crv
{loose}
- Note text.
```
```html
<ul loose="">
  <li>Note text.</li>
</ul>
```
:::

A blank line between two items makes the list loose, and every paragraph in it gets `<p>`:

::: compare
```crv
- First

- Second
```
```html
<ul>
  <li><p>First</p></li>
  <li><p>Second</p></li>
</ul>
```
:::

A blank line inside one item does not, so a one-item list is always tight. The item's first paragraph stays bare, and later blocks get their own elements:

::: compare
```crv
- alpha

  beta
```
```html
<ul>
  <li>alpha
    <p>beta</p>
  </li>
</ul>
```
:::

A description gets `<p>` elements once it holds more than one block. A blank line between two entries does not change a description list:

::: compare
```crv
:: Term
: First paragraph.

  Second paragraph.
```
```html
<dl>
  <dt>Term</dt>
  <dd>
    <p>First paragraph.</p>
    <p>Second paragraph.</p>
  </dd>
</dl>
```
:::

## The one outlier: list items

Every block takes its attributes on the line above, and every inline element takes them glued after, with one exception: a list item's attribute block abuts its marker.

An attribute line above a list attaches to the list, not to an item:

::: compare
```crv
{.steps}
- a
- b
```
```html
<ul class="steps">
  <li>a</li>
  <li>b</li>
</ul>
```
:::

To attribute one `<li>`, glue the attribute block to the marker with no space, then the marker's required space:

::: compare
```crv
-{#first .done} finished item
- ordinary item
-{.c} [ ] open task
```
```html
<ul class="task-list">
  <li id="first" class="done">finished item</li>
  <li>ordinary item</li>
  <li class="task c" style="list-style: none"><input type="checkbox" disabled aria-label="open task"> open task</li>
</ul>
```
:::

Whitespace decides:

- `-{.c} text`: the `{.c}` abuts the marker, so it is part of the marker and attributes the `<li>`.
- `- {.c} text`: a space before `{`, so `{.c}` is item content and stays literal text, and `carve lint` reports `block-marker-as-text`.

<!-- carve-sample {"lint":"shows a space between the marker and the brace block"} -->
::: compare
```crv
- {.c} text
```
```html
<ul>
  <li>{.c} text</li>
</ul>
```
:::

This is a Carve addition (djot cannot attribute list items) and the only way to reach the `<li>` element itself. For a task item the block abuts the marker before the box: `-{.c} [ ] text`. Table cells follow the same pattern: `|{.hot} a |` puts the class on that cell.

A description mark and a term mark take no glued brace block: `:{.c}` and `::{.c}` are not marks, so the line is text. Attribute a description list from the line above it.

The `:::` type word that picks an admonition or a div, as in `::: note`, is about block type, not attributes; a div takes its attributes on the line above like any block. See [Examples: admonitions](/examples/extensions#admonitions).

## Quick reference

````text
{#id .class}          <- block: the line BEFORE the block
== Heading

text [span]{.c}       <- inline: glued AFTER, no space

[phrase]{:fr}         <- language: renders lang="fr"

[Tab]{kbd}            <- semantic span: <kbd>Tab</kbd>

-{#item} list item    <- list item: abuts the marker, no space

|{.c} cell |          <- table cell: abuts the pipe

{.x}                  <- code block: the line BEFORE the fence
```lang
code
```
````

**Specification (external):** [attribute lines](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#attribute-lines) (C2-B-090 to C2-B-106), [task items](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#task-items), [tightness](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#tightness), [fences](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#fences-divs-and-comment-blocks), [fence openers and titles](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#the-fence-opener-and-titles), [sigil divs](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#sigil-divs), [captions](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#captions), [tables](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#tables), [inline attribute blocks](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md#attribute-blocks), [HTML attributes](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#attributes) (C2-H-009 to C2-H-015), [headings and sections](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#paragraphs-headings-and-sections), [code and raw content](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#code-and-raw-content) (C2-H-206, C2-H-211 to C2-H-213), [inline elements](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#inline-elements) (C2-H-075, C2-H-076), [standard extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#standard-extension-tabs) (C2-X-039 to C2-X-066).
