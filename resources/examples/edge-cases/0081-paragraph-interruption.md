## Paragraph interruption

A paragraph ends at a blank line — or at a line that begins an interrupting
block. Under the Markdown-like rule (§10) a **visible** block interrupts an open
paragraph with no blank line before it, at the top level and inside nested
content. Three carve-outs keep common prose safe: **list markers never
interrupt** — neither a bullet (`- `/`* `) nor an ordered marker, in any dialect
or value, so a list always needs a blank line before it (symmetric, Djot-like);
and a bare image is never a block. A code or raw fence opener and a `:::`
opener interrupt with or without a closer and close at their container boundary
or end of input. Invisible constructs
(reference definitions, comments, block-attribute lines) interrupt as they
always have.

A heading marker after a prose line interrupts.

::: compare

```carve
text
# H
```

```html
<p>text</p>
<section id="H">
  <h1>H</h1>
</section>
```

:::

A fenced code block interrupts.

::: compare

````carve
text
```
code
```
````

```html
<p>text</p>
<pre><code>code
</code></pre>
```

:::

A thematic break interrupts; the line after it parses fresh (not a smart
em-dash any more).

::: compare

```carve
text
---
more
```

```html
<p>text</p>
<hr>
<p>more</p>
```

:::

A block quote marker followed by a space interrupts.

::: compare

```carve
text
> q
```

```html
<p>text</p>
<blockquote><p>q</p></blockquote>
```

:::

Without the space, `>` is ordinary paragraph text. This keeps operators and
technical prose from opening accidental quotes.

::: compare

```carve
text
>>= operator
>=3 items
>_< face
```

```html
<p>text
&gt;≥ operator
≥3 items
&gt;_&lt; face</p>
```

:::

An unordered list does **not** interrupt — like an ordered marker it needs a
blank line, so the bullet lines fold into the paragraph.

::: compare

```carve
text
- a
- b
```

```html
<p>text
- a
- b</p>
```

:::

An ordered-list marker does **not** interrupt either — the bullet and the
ordered marker behave identically at the paragraph boundary.

::: compare

```carve
text
1. x
2. y
```

```html
<p>text
1. x
2. y</p>
```

:::

A valid table row interrupts.

::: compare

```carve
text
| a | b |
```

```html
<p>text</p>
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

An admonition (or generic div) with a closer interrupts.

:::: compare

```carve
text
:::note
body
:::
```

```html
<p>text
:::note
body
:::</p>
```

::::

**Carve-out — list markers never interrupt.** Neither a bullet nor an ordered
marker interrupts a paragraph; both need a blank line. An ordered marker is too
common in prose ("see step 2.", "version 1985.", "upgrade to 1. today") to
interrupt, and making the bullet match removes the asymmetry (and the residual
false positive where a hard-wrapped prose line beginning with a bullet became a
list). So no ordered value — `1.`, `2.`, a year — and no bullet interrupts; all
stay paragraph text.

::: compare

```carve
text
2. y
3. z
```

```html
<p>text
2. y
3. z</p>
```

:::

::: compare

```carve
text
1985. was the year
```

```html
<p>text
1985. was the year</p>
```

:::

**Invalid glued colon fence.** A type word requires a separating space.
`:::note` is therefore paragraph text, independently of whether a closer
follows. A valid `::: note` or bare `:::` opens immediately and may close at
the container boundary or end of input.

:::: compare

```carve
text
:::note
body
```

```html
<p>text
:::note
body</p>
```

::::

**Carve-out — image excluded.** A bare image is inline content, so it renders
in the same paragraph, never as its own block.

::: compare

```carve
text
![a](u)
```

```html
<p>text
<img src="u" alt="a"></p>
```

:::

**Nested content.** The rule applies inside a block quote too: a list marker
after a prose line does not interrupt within the quote — it folds into the
quoted paragraph (a blank line is needed to start the list).

::: compare

```carve
> p one
> - item
```

```html
<blockquote><p>p one
- item</p></blockquote>
```

:::

An indented sublist still nests with no blank line (unchanged).

::: compare

```carve
- a
   - b
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

**Invisible constructs** still interrupt with no blank line: a comment line is
consumed,

::: compare

```carve
para
%% c
```

```html
<p>para</p>
```

:::

and a reference definition is collected, leaving only the paragraph.

::: compare

```carve
a[r]
[r]: http://x
```

```html
<p>a[r]</p>
```

:::

A blank line still ends the paragraph and the block parses fresh, exactly as
before.

::: compare

```carve
text

# H
```

```html
<p>text</p>
<section id="H">
  <h1>H</h1>
</section>
```

:::

An **unterminated** code fence opener interrupts a paragraph too (§10 I4): no
closer is looked for, and the code block runs to the end of its container.

::: compare

````carve
Text
```
code
````

```html
<p>Text</p>
<pre><code>code
</code></pre>
```

:::

A `:::` opener works the same way: its closer is optional (PART 9 §12), so
there is nothing to look ahead for. The opener interrupts, and the container it
opens closes at the end of the input. That is the counterweight to the exact
closer - a mistyped closer costs the container's extent, not the rest of the
document.

:::: compare

```carve
Text
:::
stuff
```

```html
<p>Text</p>
<div>
  <p>stuff</p>
</div>
```

::::
