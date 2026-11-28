---
description: How Carve reads syntax that could otherwise have more than one interpretation.
---

# Syntax edge cases

> **Non-normative.** This page is an authoring guide. The 0.2 block and inline chapters of the specification are normative; the 0.1 grammar in `resources/grammar.ebnf` does not describe 0.2.

Some characters have more than one job in Carve. This page shows what ambiguous-looking source means in practice, with the HTML the 0.2 reference engine writes for it. Each example on this page was rendered by the same engine the docs site uses. Examples that show a trap are written the way an author might type them, so some of them are not in the canonical form `carve fmt` writes.

## How the scan decides

Two passes read a document. The block pass settles every line first: which container owns it, and whether it opens, continues or closes a block. No block decision depends on inline content. The inline pass then reads each content (a paragraph, a heading, a cell) in one left-to-right scan with four steps in a fixed order:

1. **Atoms.** A backslash escape, a code span (also with its `!`, `$` or `$$` prefix), an autolink, a cross-reference, a valid attribute block, a comment, a link tail, a mention, a tag and a symbol. An atom is taken whole, and nothing inside it is read as markup.
2. **Brackets.** `[`, `]` and what is glued to the closing bracket decide links, images, spans and references. A bracket construct is settled before emphasis pairs, so a delimiter inside it pairs only inside it.
3. **Delimiters.** Bare `/` and `*`, and the braced forms such as `{_u_}` and `{^2^}`, pair on one stack.
4. **Attachment.** A glued attribute block attaches to the construct before it.

Smart typography reads only the text that is left after these steps, and never reads inside an atom.

## Slash emphasis and file paths

Slashes are common in paths and URLs. Carve 0.2 has two bare delimiters, `/` for emphasis and `*` for strong text, and both follow the same boundary rules:

- A delimiter **opens** when the character before it is not a word character and the character after it is not whitespace. So `(/x/)` and `a./b/` open, while `a/b/c` and `snake_/case/` do not.
- A delimiter **closes** when the character before it is not whitespace and the character after it is not a word character. So `x /a/b y` stays literal: the candidate closer is followed by `b`.
- A run of two or more of the same bare delimiter is text, so `//x//` and `**x**` render as typed.
- A bare span whose content holds its own delimiter between two word characters does not form. `/usr/local/` and `*a*b*` stay literal, while `/etc/` is a one-word span and renders as emphasis.

::: compare
```crv
Use /italic/ for emphasis. The /etc/ folder and /usr/local/ and the/path/here and / spaced /.

The config is in `/etc/nginx/nginx.conf`, or as plain text !`/etc/nginx_foo/`.
```
```html
<p>Use <em>italic</em> for emphasis. The <em>etc</em> folder and /usr/local/ and the/path/here and / spaced /.</p>
<p>The config is in <code>/etc/nginx/nginx.conf</code>, or as plain text /etc/nginx_foo/.</p>
```
:::

| Input | Output | Reason |
|-------|--------|--------|
| `/italic/` | `<em>italic</em>` | Valid emphasis |
| `/etc/` | `<em>etc</em>` | One word between the slashes |
| `/usr/local/` | `/usr/local/` | The span holds its own `/` between two word characters |
| `` `/etc/nginx/` `` | `<code>/etc/nginx/</code>` | Code span, recommended for paths |
| `` !`/etc/nginx/` `` | `/etc/nginx/` | Literal-text span: no markup, no code styling |
| `the/path/here` | `the/path/here` | A word character before the opener |
| `/ spaced /` | `/ spaced /` | Whitespace after the opener |

A path with no inner slash, such as `/tmp/`, still reads as emphasis in 0.2. A code span avoids that.

::: compare
```crv
cd /tmp/ && ls /var/

cd `/tmp/` && ls `/var/`
```
```html
<p>cd <em>tmp</em> &amp;&amp; ls <em>var</em></p>
<p>cd <code>/tmp/</code> &amp;&amp; ls <code>/var/</code></p>
```
:::

**Best practice:** write paths, URLs and file names in backticks, since they are technical content. When the path should read as ordinary prose rather than monospace code, use the literal-text span `` !`…` ``. It suppresses all markup inside the span but writes plain text with no `<code>` element.

Bare delimiters never open inside a word. For intended emphasis inside a word, use the braced form, for example `foo{*bar*}baz`:

::: compare
```crv
foo*bar*baz and foo{*bar*}baz, snake_case and a/b/c, (/x/) and a./b/
```
```html
<p>foo*bar*baz and foo<strong>bar</strong>baz, snake_case and a/b/c, (<em>x</em>) and a.<em>b</em></p>
```
:::

## The caret `^`

The caret has four meanings:

| Context | Meaning | Example |
|---------|---------|---------|
| Braced inline | Superscript | `x{^2^}` |
| Inline footnote opener | Note | `^[content]` |
| Table cell | Rowspan | `\| ^ \|` |
| Line start below a block | Caption | `^ Figure 1` |

The rules:

1. **Caption:** a line of `^`, one or more spaces and content, directly below an image, table, code block, quote, math block or figure group, with no blank line between them.
2. **Rowspan:** `^` as the only content of a table cell, with optional spaces around it.
3. **Superscript:** only the braced `{^text^}`. A bare `^` is text, unless it opens an inline footnote `^[…]`.

::: compare
```crv
x{^2^} + y{^2^} = z{^2^}, but x^2^ and "the answer is ^ 42" stay text.

|= Category |= Item |
| Fruit | Apple |
| ^ | Pear |
| Value | ^2^ |

![Photo](img.jpg)
^ Figure 1: a caption
```
```html
<p>x<sup>2</sup> + y<sup>2</sup> = z<sup>2</sup>, but x^2^ and “the answer is ^ 42” stay text.</p>
<table>
  <thead>
    <tr><th scope="col">Category</th><th scope="col">Item</th></tr>
  </thead>
  <tbody>
    <tr><td rowspan="2">Fruit</td><td>Apple</td></tr>
    <tr><td>Pear</td></tr>
    <tr><td>Value</td><td>^2^</td></tr>
  </tbody>
</table>
<figure>
  <img src="img.jpg" alt="Photo">
  <figcaption>Figure 1: a caption</figcaption>
</figure>
```
:::

The cell `^2^` is text: it is not a rowspan because the caret is not alone, and it is not superscript because there is no bare superscript. Superscript in a cell is the braced `| {^2^} |`.

## The less-than sign `<`

| Context | Meaning | Example |
|---------|---------|---------|
| Table cell | Colspan | `\| < \|` |
| Inline | Smart typography | `<--` becomes ← |
| Autolinks | URL or email wrapper | `<https://...>` |

The rules:

1. **Colspan:** `<` as the only content of a table cell.
2. **Autolink:** `<`, a URL (a scheme, a colon and URL characters) or an email address, and `>`.
3. **Smart typography:** the runs `<--`, `<-->`, `<==`, `<=>` and `<=`, longest match first.
4. **Literal:** everything else.

::: compare
```crv
|= Header |= < |
| a | b |

<https://example.com> and <user@example.com>, the arrow points <-- that way, a <= b, and if (x < 5) stays text.
```
```html
<table>
  <thead>
    <tr><th colspan="2" scope="col">Header</th></tr>
  </thead>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
<p><a href="https://example.com">https://example.com</a> and <a href="mailto:user@example.com">user@example.com</a>, the arrow points ← that way, a ≤ b, and if (x &lt; 5) stays text.</p>
```
:::

A colspan mark needs a cell to its left in the same row. In the first cell there is nothing to join, so the mark stays text and `table-span-marker-blocked` reports it with a hint to write `\<`:

<!-- carve-sample {"lint":"shows table-span-marker-blocked","fmtSkip":"fmt escapes the blocked mark as \\<"} -->
::: compare
```crv
|= a |= b |
| < | x |
```
```html
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col">b</th></tr>
  </thead>
  <tbody>
    <tr><td>&lt;</td><td>x</td></tr>
  </tbody>
</table>
```
:::

## The star `*`

| Context | Meaning | Example |
|---------|---------|---------|
| Inline | Strong | `*strong*` |
| Line start | List item | `* item` |
| After `*[` at line start | Abbreviation | `*[HTML]: ...` |
| A line of three or more stars | Thematic break | `***` |

The rules:

1. **List:** `*` at the start of a line, followed by a space and content.
2. **Abbreviation:** `*[label]: expansion` at the start of a line, with a label of ASCII letters and digits.
3. **Thematic break:** a line of three or more stars and nothing else. `* * *` is not a break: it reads as nested list markers.
4. **Strong:** `*text*` under the boundary rules of the slash.
5. **Literal:** a star between spaces, or an escaped `\*`.

::: compare
```crv
* A list item

*Strong text* and 5 * 3 = 15.

*[HTML]: HyperText Markup Language

The HTML spec.

***
```
```html
<ul>
  <li>A list item</li>
</ul>
<p><strong>Strong text</strong> and 5 * 3 = 15.</p>
<p>The <abbr title="HyperText Markup Language">HTML</abbr> spec.</p>
<hr>
```
:::

A line that starts with a star and no space is strong text, not a list item. An opener without a closer never becomes strong text, and lint reports it:

<!-- carve-sample {"lint":"shows unclosed-inline-emphasis"} -->
::: compare
```crv
*This whole line is strong*

*This has no closing star
```
```html
<p><strong>This whole line is strong</strong></p>
<p>*This has no closing star</p>
```
:::

## Mention boundaries

Where does a mention end? The rules:

1. A mention starts with `@` at the start of the content or after a character that is not a letter or a number.
2. The name is one or more runs of ASCII letters, digits, `_` and `-`, joined by single dots, and holds at least one letter.
3. A trailing dot or hyphen is text behind the name, so a sentence can end after a mention.

::: compare
```crv
@john @john-doe @john_doe @john.doe, then @john. and @john's and @john! but email@domain.com, @5 and #123 are text, and #release-1.0 is one tag.
```
```html
<p><span class="mention"><strong>@john</strong></span> <span class="mention"><strong>@john-doe</strong></span> <span class="mention"><strong>@john_doe</strong></span> <span class="mention"><strong>@john.doe</strong></span>, then <span class="mention"><strong>@john</strong></span>. and <span class="mention"><strong>@john</strong></span>’s and <span class="mention"><strong>@john</strong></span>! but email@domain.com, @5 and #123 are text, and <span class="tag"><strong>#release-1.0</strong></span> is one tag.</p>
```
:::

| Input | Mention | Remainder |
|-------|---------|-----------|
| `@john` | `@john` | - |
| `@john-doe` | `@john-doe` | - |
| `@john_doe` | `@john_doe` | - |
| `@john.doe` | `@john.doe` | - |
| `@john.` | `@john` | `.` |
| `@john's` | `@john` | `'s` |
| `@john!` | `@john` | `!` |
| `email@domain.com` | - | not a mention: a letter stands before `@` |

The same name rule applies to `#tags`, so `#release-1.0` is one tag. A name needs a letter, so `@5` and `#123` are text. A name glued to a letter outside ASCII is no mention or tag at all: `@josé` and `#größe` stay text.

## Tags and headings

| Context | Meaning | Example |
|---------|---------|---------|
| Line start | Heading | `= Heading` or `# Heading` |
| Inline | Tag | `#project-x` |

The rules:

1. **Heading:** `=` or `#` (one to six) at the start of a line, followed by a space and text. `carve fmt` writes the `=` form.
2. **Tag:** `#` at the start of the content or after a character that is not a letter or a number, followed by a name with at least one ASCII letter.

<!-- carve-sample {"fmtSkip":"shows the # heading marker; fmt rewrites it to ="} -->
::: compare
```crv
# Heading 1

Check out #project-x. Issue #123 is text, version #v2 is a tag.

#notaheading
```
```html
<section id="Heading-1">
  <h1>Heading 1</h1>
  <p>Check out <span class="tag"><strong>#project-x</strong></span>. Issue #123 is text, version <span class="tag"><strong>#v2</strong></span> is a tag.</p>
  <p><span class="tag"><strong>#notaheading</strong></span></p>
</section>
```
:::

## Abbreviation `*[` and strong text

`*[` could start strong text with a link inside it. An abbreviation definition is a line that starts with `*[`, an ASCII label, `]:`, one space and the expansion. Anywhere else, `*[` is a star followed by a bracket:

::: compare
```crv
*[HTML]: HyperText Markup Language

*[link text](https://example.com)* more text, and see *[the docs](https://example.com) for more* info about HTML.
```
```html
<p><strong><a href="https://example.com">link text</a></strong> more text, and see <strong><a href="https://example.com">the docs</a> for more</strong> info about <abbr title="HyperText Markup Language">HTML</abbr>.</p>
```
:::

## Nested emphasis

Carve 0.2 nests a kind in itself. A closer pairs with the nearest open entry of its kind, so `/a /b/ c/` is emphasis inside emphasis. In 0.1 bare same-kind nesting was invalid; 0.2 changed this rule (C2-I-051).

<!-- carve-sample {"fmtSkip":"shows bare same-kind nesting; fmt writes the inner span braced"} -->
::: compare
```crv
/This /does/ nest/

/a /b/ c

*a /b* c/

/This *does* nest/ and *strong with /emphasis/ inside*
```
```html
<p><em>This <em>does</em> nest</em></p>
<p>/a <em>b</em> c</p>
<p><strong>a /b</strong> c/</p>
<p><em>This <strong>does</strong> nest</em> and <strong>strong with <em>emphasis</em> inside</strong></p>
```
:::

The second paragraph has no closer for the first slash, so only `/b/` forms. In the third, the strong span closes first, and the emphasis opener above it on the stack becomes text. Different kinds nest in the order written, and there is no combined token for strong emphasis: `/*both*/` is emphasis around strong text. Lint flags that spelling because it looks like a C comment:

<!-- carve-sample {"lint":"shows comment-shaped-emphasis"} -->
::: compare
```crv
/*both*/ and */both/*
```
```html
<p><em><strong>both</strong></em> and <strong><em>both</em></strong></p>
```
:::

The braced forms make the boundaries explicit and also nest in themselves. See [explicit same-kind emphasis nesting](./nested-braced-emphasis.md) for details.

::: compare
```crv
{/outer {/inner/} outer/} and {*a {*b*} c*}
```
```html
<p><em>outer <em>inner</em> outer</em> and <strong>a <strong>b</strong> c</strong></p>
```
:::

## A brace at inline position

At an opening brace the scan takes the first form that matches: a valid attribute block, then a braced comment `{% ... %}`, then an editorial comment `{# ... #}`, then a braced delimiter such as `{*`. A valid attribute block attaches only when it is glued to a construct, such as a span, a link or a code span. Glued to a bare word, it attaches to nothing and stays text, and lint reports it. An invalid attribute candidate goes on through the remaining brace rules, so in `{.c *x*}` the brace is text and `*x*` is strong.

<!-- carve-sample {"lint":"shows unattached-inline-attribute"} -->
::: compare
```crv
[word]{.c} and word{.c}, foo{*bar*}baz, {.c *x*} and a{% hidden %}b
```
```html
<p><span class="c">word</span> and word{.c}, foo<strong>bar</strong>baz, {.c <strong>x</strong>} and ab</p>
```
:::

## Table cells with special characters

A table row needs its closing pipe. Inside a row:

1. A code span protects its content, pipes included.
2. A backslash escapes a pipe: `\|`.
3. A link does **not** protect a pipe. Cells are split before inline content is read, so a pipe inside link text splits the cell. Escape it as `\|`.

::: compare
```crv
|= Command |= Description |
| `ls | grep foo` | Filter output |
| Price | $50 \| $100 |
```
```html
<table>
  <thead>
    <tr><th scope="col">Command</th><th scope="col">Description</th></tr>
  </thead>
  <tbody>
    <tr><td><code>ls | grep foo</code></td><td>Filter output</td></tr>
    <tr><td>Price</td><td>$50 | $100</td></tr>
  </tbody>
</table>
```
:::

::: compare
```crv
| [a | b](https://example.com) | x |
```
```html
<table>
  <tbody>
    <tr><td>[a</td><td>b](https://example.com)</td><td>x</td></tr>
  </tbody>
</table>
```
:::

`|=` marks a header cell only when a space or a brace prefix follows it. A glued letter makes the cell plain text, and the next `|=` in the row is then a row header:

<!-- carve-sample {"fmtSkip":"shows the glued |=; fmt writes it as | ="} -->
::: compare
```crv
|=Name |= Qty |
| a | 1 |
```
```html
<table>
  <tbody>
    <tr><td>=Name</td><th scope="row">Qty</th></tr>
    <tr><td>a</td><td>1</td></tr>
  </tbody>
</table>
```
:::

Span marks (`<` and `^`) join cells backward. A span mark that has nothing to join stays text, as the colspan example above shows.

## Comments (`%%` and `%%%`)

**Line comments:**

- `%%` starts a comment at the start of a line or after whitespace, also after text on the same line: `Visible. %% this tail is a comment` keeps only `Visible.`
- The comment runs to the end of the line and never crosses a line break.
- Without whitespace before it, `%%` is text, so `50%%` is safe.
- `\%%` (an escaped first percent sign) is text.
- A line that holds nothing but a line comment is not seen by block structure, whatever its indent. It does not end a paragraph, close a list item or count as a blank line.

**Block comments:**

- A run of three or more `%` at the start of a line opens a comment block. Text after the opener run becomes the first line of the hidden body, so `%%% TODO` opens a comment.
- The closer is a bare run of at least the opener's length. A run followed by text, such as `%%% end`, is content of the body and does not close it.
- The body can hold anything but its own closer. Use a longer run to nest: `%%%%` can hold `%%%`.
- A `%%%` block has no info string. Raw output is a code fence with an `=FORMAT` info string, such as ```` ```=html ````, so `%%% html` is a comment and its body stays hidden.
- An unclosed comment block runs to the end of its container and hides everything up to there. `unclosed-comment-fence` reports it as an error.

<!-- carve-sample {"fmtSkip":"keeps the comment line below the quote marker; fmt adds the > mark"} -->
::: compare
```crv
%% This is a comment

Text with 50%% is not a comment.

Visible text. %% trailing comment, consumed to end of line

%%%
Block comment with %% inside is fine.
%%%

> A quoted paragraph.
%% Below the quote's marker, and still a comment.
```
```html
<p>Text with 50%% is not a comment.</p>
<p>Visible text.</p>
<blockquote><p>A quoted paragraph.</p></blockquote>
```
:::

A comment-only line inside a list item closes nothing, so the paragraph goes on below it. Here `y` at column 0 is a lazy line of the item's paragraph:

<!-- carve-sample {"fmtSkip":"shows comment lines at other columns; fmt indents them to the content column"} -->
::: compare
```crv
- a
    %% c
  more
- x
%% z
y
```
```html
<ul>
  <li>a
more</li>
  <li>x
y</li>
</ul>
```
:::

<!-- carve-sample {"fmtSkip":"shows text after the opener run; fmt moves it to the first body line"} -->
::: compare
```crv
%%%% notes
%%%
inner
%%%
%%%%

shown
```
```html
<p>shown</p>
```
:::

<!-- carve-sample {"fmtSkip":"shows text after the opener and closer runs"} -->
::: compare
```crv
%%% TODO
hidden
%%% end
still hidden
%%%

after
```
```html
<p>after</p>
```
:::

<!-- carve-sample {"lint":"shows unclosed-comment-fence","fmtSkip":"fmt adds the missing closer"} -->
::: compare
```crv
Before.

%%%
never closed

Also hidden.
```
```html
<p>Before.</p>
```
:::

Inside a code block, a raw block or a comment block, `%%` and `%%%` are text.

## Code overrides everything

The content of code spans and code blocks is never read for Carve syntax. A code span is an atom, and a code block body is opaque.

::: compare
````crv
```python
# This is not a Carve heading
*this* is not strong
```

Inline `*not strong*` and `/not/emphasis/` are literal.
````
```html
<pre><code class="language-python"># This is not a Carve heading
*this* is not strong
</code></pre>
<p>Inline <code>*not strong*</code> and <code>/not/emphasis/</code> are literal.</p>
```
:::

A fence opener is decided on its own line and interrupts a paragraph whether or not a closer follows. An unclosed code fence, div or comment block stays a block, runs to the end of its container and reports an error; it does not turn back into paragraph text.

<!-- carve-sample {"lint":"shows unclosed-code-fence","fmtSkip":"fmt adds the blank line and the missing closer"} -->
::: compare
````crv
Text
```
an unclosed fence runs to the end
````
```html
<p>Text</p>
<pre><code>an unclosed fence runs to the end
</code></pre>
```
:::

## Caption timing

When does `^` become a caption rather than text? The rules:

1. A caption line is `^` at the start of a line, one or more spaces and content.
2. It must stand **directly** below an image, table, code block (a captioned code block is a numbered listing), quote, display math block (a numbered equation) or figure group, with no blank line between, and in the same container.
3. A caption continues only on lines indented past its `^`. An unindented line starts the next block.

<!-- carve-sample {"lint":"shows unattached-caption","fmtSkip":"fmt escapes the unattached caret"} -->
::: compare
```crv
![Photo](img.jpg)
^ This is a caption

![Photo](img.jpg)

^ Not a caption: a blank line separates it

|= A |
| 1 |
^ A table caption
  that continues on an indented line
```
```html
<figure>
  <img src="img.jpg" alt="Photo">
  <figcaption>This is a caption</figcaption>
</figure>
<img src="img.jpg" alt="Photo">
<p>^ Not a caption: a blank line separates it</p>
<table>
  <caption>A table caption
that continues on an indented line</caption>
  <thead>
    <tr><th scope="col">A</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td></tr>
  </tbody>
</table>
```
:::

An image followed by more text is a paragraph, not an image block, so it has no caption:

<!-- carve-sample {"lint":"shows unattached-caption","fmtSkip":"fmt escapes the unattached caret"} -->
::: compare
```crv
![Photo](img.jpg)
Some other text
^ Not a caption: the paragraph is more than an image
```
```html
<p><img src="img.jpg" alt="Photo">
Some other text
^ Not a caption: the paragraph is more than an image</p>
```
:::

## The plus sign `+`

`+` is not a Carve bullet (unlike Markdown and Djot). Carve bullets are `-` and `*`. In 0.2 the plus sign has one block role left: a line that starts with `+` and ends with a pipe, directly below a table row, is a table continuation row. Every other line that starts with `+` is text.

<!-- carve-sample {"lint":"shows the old + continuation line as text","fmtSkip":"keeps the 0.1 + line as typed"} -->
::: compare
```crv
- item
+
> note

| Cell |
+ cont |

+ not a bullet
```
```html
<ul>
  <li>item
+
&gt; note</li>
</ul>
<table>
  <tbody>
    <tr><td>Cell cont</td></tr>
  </tbody>
</table>
<p>+ not a bullet</p>
```
:::

The continuation row joins `cont` to the cell above. To attach a block to a list item, indent it to the item's content column after a blank line; `npx carve upgrade` writes this for a 0.1 `+` line:

::: compare
```crv
- item

  > note
```
```html
<ul>
  <li>item
    <blockquote><p>note</p></blockquote>
  </li>
</ul>
```
:::

## Escaping

A backslash escapes any ASCII punctuation character. An escaped opener cannot open, so its closer stays text too and needs no backslash of its own. Inside a code span the backslash is text:

::: compare
```crv
\*literal stars* and \/not emphasis/ and \@not-a-mention and \#not-a-tag

\^ not a caption marker

`\*still has backslash\*`
```
```html
<p>*literal stars* and /not emphasis/ and @not-a-mention and #not-a-tag</p>
<p>^ not a caption marker</p>
<p><code>\*still has backslash\*</code></p>
```
:::

## Smart typography

| Pattern | Output | Notes |
|---------|--------|-------|
| `--` | – (en dash) | Any run of two or more hyphens becomes dashes, also in `run --verbose`. Write flags in a code span or escape one hyphen: `-\-verbose`. |
| `---` | em dash (U+2014) | A line of only `---` is not a thematic break in 0.2. |
| `...` | … (ellipsis) | |
| `-->` | → | |
| `<--` | ← | Needs its exact run; a longer hyphen run is a dash run. |
| `<-->` | ↔ | |
| `==>` | ⇒ | |
| `<==` | ⇐ | Longest match first, so `<==` is the arrow and a bare `<=` stays ≤. |
| `<=>` | ⇔ | Same rule. `<==>` is `<==` then `>`, and renders `⇐>`. |
| `<=`, `>=`, `!=` | ≤, ≥, ≠ | |
| `->`, `<-`, `=>` | text | The single forms are not replaced. |

::: compare
```crv
a -- b, wait..., a --> b, a <-- b, a ==> b, a <== b, a <=> b, a <==> b, a <= b, a -> b, a => b, run --verbose, run `--verbose`
```
```html
<p>a – b, wait…, a → b, a ← b, a ⇒ b, a ⇐ b, a ⇔ b, a ⇐&gt; b, a ≤ b, a -&gt; b, a =&gt; b, run –verbose, run <code>--verbose</code></p>
```
:::

A straight quote is curled from its two neighbors alone; quotes do not pair. Where the guess is wrong, type the curly character.

## Empty and whitespace-only elements

Emphasis and the braced forms need content between their delimiters. An empty table cell is valid.

::: compare
```crv
** and // and {^^} and {**}

| |
```
```html
<p>** and // and {^^} and {**}</p>
<table>
  <tbody>
    <tr><td></td></tr>
  </tbody>
</table>
```
:::

## Paragraph interruption

An open paragraph takes every following line that is not blank as a lazy line, whatever it looks like, unless the line is one of six interrupters:

1. a fence line (backticks, colons or percent signs that open or close a fence, div or comment block);
2. a list marker that continues an open list, or opens a nested list inside an item;
3. a description or term mark at an open description list's column;
4. a caption line, when the paragraph so far is exactly one image or one display math line;
5. a table row;
6. a thematic break (`***`).

So a heading, a quote, an attribute line, a definition and an include directive directly below paragraph text are text of that paragraph. 0.1 let them interrupt; 0.2 does not, and lint reports `block-opener-without-blank-line`. A list marker after a prose line folds into the paragraph too, so a hard-wrapped line that starts with `*` or `1.` stays prose. Leave a blank line before a new block.

<!-- carve-sample {"lint":"shows lazy lines that look like block openers"} -->
::: compare
```crv
Die Frage ist x = 5
* 3 + 17 wahr.

Text
# Not a heading

Text
> Not a quote
```
```html
<p>Die Frage ist x = 5
* 3 + 17 wahr.</p>
<p>Text
# Not a heading</p>
<p>Text
&gt; Not a quote</p>
```
:::

A fence, a thematic break and a table row interrupt:

<!-- carve-sample {"fmtSkip":"shows interrupters with no blank line; fmt adds one"} -->
::: compare
````crv
Text
```
code
```

Text
***
more

Text
| a table row |
````
```html
<p>Text</p>
<pre><code>code
</code></pre>
<p>Text</p>
<hr>
<p>more</p>
<p>Text</p>
<table>
  <tbody>
    <tr><td>a table row</td></tr>
  </tbody>
</table>
```
:::

An image line followed by more text is a paragraph. A caption interrupts only a paragraph that is one image line. A quoted line ends in an open paragraph, so an unquoted list marker below it folds into the quote. A heading ends at the newline, so a list marker below it starts a list:

<!-- carve-sample {"lint":"shows a list marker folding into a quote","fmtSkip":"keeps the lazy line unquoted"} -->
::: compare
```crv
Text
![a](u)

![a](u)
^ cap

> q
- a

# H
- item
```
```html
<p>Text
<img src="u" alt="a"></p>
<figure>
  <img src="u" alt="a">
  <figcaption>cap</figcaption>
</figure>
<blockquote><p>q
- a</p></blockquote>
<section id="H">
  <h1>H</h1>
  <ul>
    <li>item</li>
  </ul>
</section>
```
:::

In a list item, description or footnote body, a marker indented past the body's marker opens a nested list with no blank line. A marker at the outer column closes the body:

<!-- carve-sample {"fmtSkip":"shows the nested list with no blank line; fmt adds one"} -->
::: compare
```crv
:: term
: first line
  - a list in the description
- a list after the description list
```
```html
<dl>
  <dt>term</dt>
  <dd>
    <p>first line</p>
    <ul>
      <li>a list in the description</li>
    </ul>
  </dd>
</dl>
<ul>
  <li>a list after the description list</li>
</ul>
```
:::

| Input | Result | Reason |
|-------|--------|--------|
| `Text` / `- a` / `- b` | one paragraph | a list marker folds into the paragraph |
| `x = 5` / `* 3 + 17` | one paragraph | a list marker folds (no false positive) |
| `Text` / `1. a` (or `2. a`) | one paragraph | an ordered marker folds the same way |
| `Text` / (blank) / `- a` | paragraph + list | the blank line starts the list |
| `Text` / `# H` | one paragraph | a heading is a lazy line |
| `Text` / `> q` | one paragraph | a quote is a lazy line |
| `Text` / `{.c}` | one paragraph | an attribute line is a lazy line |
| `Text` / `` ``` `` / `code` / `` ``` `` | paragraph + code block | a fence interrupts |
| `Text` / `` ``` `` / `code` | paragraph + code block | an unclosed fence runs to the end of its container |
| `Text` / `:::` / `x` / `:::` | paragraph + div | a fence interrupts |
| `Text` / `***` / `more` | paragraph + `<hr>` + paragraph | a thematic break interrupts |
| `Text` / `---` / `more` | one paragraph with an em dash | `---` is no break; lint reports `setext-heading-underline` |
| `Text` / `\| a \|` | paragraph + table | a table row interrupts |
| `Text` / `![a](u)` | one paragraph | an image is inline content |
| `Text` / `^ cap` | one paragraph | no captionable host |
| `![a](u)` / `^ cap` | `<figure>` | the paragraph is one image line |
| `See[^m].` / `[^m]: note` | one paragraph | a footnote definition is a lazy line |
| `# H` / `- item` | heading + list | a list marker ends the heading |
| `> q` / `- a` | one quoted paragraph | the marker folds into the quote |
| `> text` / `> # H` | one quoted paragraph | a heading is a lazy line inside the quote too |
| `> p` / `> - x` | one quoted paragraph | a quoted marker folds |
| `- a` / `  - b` | nested list | a marker past the item's marker opens a sublist |
| `- a` / ` - b` | nested list | also with one space; lint reports `list-item-body-below-content-column` |
| `1. a` / ` - b` | nested list | a bullet of another kind nests the same way |
| `- text` / `  # H` | one item paragraph | a heading is a lazy line inside the item |

## Lines below a heading, caption or term

A heading, a caption and a description term are labels. A label holds its marker line and every line directly below it that is indented past its marker. An unindented line ends the label and starts the next block, so nothing folds into a heading unless it is indented. The heading id comes from the whole label text.

<!-- carve-sample {"fmtSkip":"shows the paragraph with no blank line after the heading"} -->
::: compare
```crv
= Title
outside

= Title
  continued on an indented line
```
```html
<section id="Title">
  <h1>Title</h1>
  <p>outside</p>
</section>
<section id="Title-continued-on-an-indented-line">
  <h1>Title
continued on an indented line</h1>
</section>
```
:::

Only a paragraph takes unindented lazy lines, also when it stands behind a list, description, footnote or quote marker. Below a term, an unindented line closes the description list:

<!-- carve-sample {"fmtSkip":"shows lazy lines; fmt indents or quotes them"} -->
::: compare
```crv
:: Term
Not indented

> quote
lazy

- item
lazy
```
```html
<dl>
  <dt>Term</dt>
</dl>
<p>Not indented</p>
<blockquote><p>quote
lazy</p></blockquote>
<ul>
  <li>item
lazy</li>
</ul>
```
:::

A link definition takes a title or attribute block on the indented line below it, and an abbreviation definition takes indented expansion lines. A fenced block is the exception to all of this: its body runs to the closing fence or the end of its container. After a blank line, only a list item, a description or a footnote goes on, and only with blocks indented to its content.

## Removed in 0.2

These 0.1 ambiguities no longer exist:

- **Bare `_`, `~` and `=` delimiters.** Only `/` and `*` are bare delimiters (C2-I-046); underline, strike and highlight are always braced, `{_u_}`, `{~s~}`, `{=h=}`. `npx carve upgrade` adds the braces.
- **A caption after a blank line.** A caption must stand directly below its block (C2-B-149); after a blank line it is text and `unattached-caption` reports it. `npx carve upgrade` removes the blank line.
- **The `+` list-continuation marker.** A lone `+` line is text (C2-B-059). `npx carve upgrade` replaces it with a blank line and indents the block into its item.
- **Headings, quotes, attribute lines and definitions interrupting a paragraph.** They are lazy lines (C2-B-024). `npx carve upgrade` adds the blank line.
- **Nothing folds into a heading.** A heading takes indented lines below it as a label (C2-B-234).
- **Invalid bare same-kind nesting.** A kind nests in itself (C2-I-051).
- **A same-kind marker below the content column as a sibling item.** A bullet indented past the item's marker opens a nested list (C2-B-015).
- **An unclosed `%%%` falling back to a line comment.** It runs to the end of its container (C2-B-111).
- **`%%% end` closing a comment block.** A closer is a bare run (C2-B-110); `carve lint --upgrade` reports such a line as `comment-fence-closer-with-text`.
- **The deprecated arrows `->`, `<-` and `<->`.** The single-hyphen forms are text (C2-I-115).
- **Hyphen runs before a letter staying literal, and `{--}`.** Every run of two or more hyphens becomes dashes (C2-I-111).
- **The `%% carve-version` provenance comment written by `carve fmt --stamp`.** The 0.2 CLI has no `--stamp`; a document declares its version with `carve` or `carve-version` in its line-1 frontmatter (C2-B-231).

See the [upgrade guide](./upgrade-0-2.md) for the full list of 0.1 to 0.2 changes.

## Summary: parser priority

When more than one reading is possible, this order decides:

1. **Block structure** - container ownership, fences and the six paragraph interrupters, before any inline content is read.
2. **Code spans and code blocks** - content is literal.
3. **Other atoms** - escapes, autolinks, cross-references, attribute blocks, comments, link tails, mentions, tags and symbols.
4. **Brackets** - links, images, spans, references and footnotes.
5. **Delimiters** - `/emphasis/`, `*strong*` and the braced forms.
6. **Attachment** - glued attribute blocks.
7. **Smart typography** - only in the text that is left.
8. **Plain text** - everything else.

**Specification (external):** [Block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md): [paragraphs and interrupters](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#paragraphs-and-interrupters) (C2-B-011 to C2-B-024), [labels](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#labels) (C2-B-234), [fences, divs and comment blocks](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#fences-divs-and-comment-blocks) (C2-B-108 to C2-B-113), [comments](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#comments) (C2-B-135 to C2-B-138), [captions](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#captions) (C2-B-146 to C2-B-149), [tables](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#tables); [Inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md): [preliminaries](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md#preliminaries) (C2-I-004 to C2-I-008), [the opening brace](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md#the-opening-brace) (C2-I-043), [emphasis and strong](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md#emphasis-and-strong) (C2-I-046 to C2-I-053), [mention, tag, symbol and inline extension](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md#mention-tag-symbol-and-inline-extension) (C2-I-090 to C2-I-095), [smart typography](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md#smart-typography) (C2-I-104 to C2-I-117).
