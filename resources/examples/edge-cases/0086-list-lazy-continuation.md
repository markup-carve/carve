## List lazy continuation

A non-indented line that follows a list item folds into the item's lead paragraph when it is plain paragraph text and has no blank line before it. A blank line, or a line that starts a block (heading, blockquote, fenced code, thematic break, table, div, a definition), ends the list instead.

::: compare

```carve
- item
lazy
```

```html
<ul>
  <li>item
lazy</li>
</ul>
```

:::

::: compare

```carve
- a
# H
```

```html
<ul>
  <li>a</li>
</ul>
<section id="H">
  <h1>H</h1>
</section>
```

:::

An under-indented continuation line after a *nested* sublist still folds into the **deepest** open paragraph (CommonMark lazy continuation); its indentation does not place it at an intermediate level. A blank line before it makes it a fresh paragraph instead.

::: compare

```carve
- a
  - b
 c
```

```html
<ul>
  <li>a
    <ul>
      <li>b
c</li>
    </ul>
  </li>
</ul>
```

:::

::: compare

```carve
- a
  - b
    - c
   d
```

```html
<ul>
  <li>a
    <ul>
      <li>b
        <ul>
          <li>c
d</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

```carve
- a
  - b

 c
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
<p>c</p>
```

:::

Lazy continuation only ever extends an **open paragraph**. After a block inside an item, a dedented line therefore folds in only when that block leaves a paragraph open. A blockquote's trailing paragraph is open, so the line folds into the quote:

::: compare

```carve
- item
  > q
tail
```

```html
<ul>
  <li>item
    <blockquote><p>q
tail</p></blockquote>
  </li>
</ul>
```

:::

A fenced code block leaves no open paragraph, so a dedented line ends the item and starts a top-level block instead of joining the item:

::: compare

````carve
- item
  ```
  c
  ```
tail
````

```html
<ul>
  <li>item
    <pre><code>c
</code></pre>
  </li>
</ul>
<p>tail</p>
```

:::

A table is the same — no open paragraph, so the dedented line is a fresh top-level paragraph:

::: compare

```carve
- item
  | a | b |
tail
```

```html
<ul>
  <li>item
    <table>
      <tbody>
        <tr><td>a</td><td>b</td></tr>
      </tbody>
    </table>
  </li>
</ul>
<p>tail</p>
```

:::

A colon fence that is **not a valid opener** opens no block, so it leaves the paragraph open and the dedented line folds in. `:::note` has no space between the fence and the type word, so §12's opener test rejects it and the line is ordinary paragraph text; from there the paragraph absorbs the following fence-shaped line as text too (§12, "the absorption is not width-tagged"). Nothing ever interrupted the item's paragraph, so it is still **open** when `tail` arrives, and PART 1 S4 folds `tail` into it. What decides is whether a block was opened, never the shape of the line that tried - an absorbed fence is prose:

::::: compare

```carve
- item
  :::note
  body
  :::
tail
```

```html
<ul>
  <li>item
:::note
body
:::
tail</li>
</ul>
```

:::::

Give the same fence its space and the contrast is exact. Written `::: note`, it is a valid opener: it interrupts the item's paragraph, its closer completes the block, and a closed `:::` div or admonition leaves no open paragraph - so there `tail` does end the item and becomes a document paragraph, exactly as after the fenced code block and the table above. One space between the fence and the type word decides which of the two answers the same five lines get.

The same clause settles the neighboring shapes, which is how one knows it is the clause and not a special case, and each of them is a place an implementation could get the right answer here for the wrong reason. Indenting the lazy line to column 1 changes nothing, since it is still below the content column. The malformed fence may be the paragraph's FIRST line, written on the marker line itself (`- :::note`), and the item then opens with a paragraph that begins with fence-shaped text. Inside a block quote, `> tail` supplies the quote's prefix but not the item's indentation, which is the partial match S4 is written for. All three fold, for the one reason above; `tests/colon-fence-absorbed-in-an-item.test.mjs` pins them.

The same rule reaches a list item's second paragraph. The blank before
`spaced` makes the item loose, but it does not close the paragraph that
`spaced` opens. The following flush-left line therefore folds into that
innermost paragraph; paragraph depth does not create a special boundary.

::: compare

```carve
1. item

   spaced
flush
```

```html
<ol>
  <li><p>item</p>
    <p>spaced
flush</p>
  </li>
</ol>
```

:::
