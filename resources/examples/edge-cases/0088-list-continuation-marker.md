## List continuation marker

A lone `+` at column 0 attaches the following flush-left block to the outer item, with no blank line, keeping the list tight. This helps with code blocks or tables that would be awkward to indent.

Carve's bullet markers are `-` and `*` only. Unlike Markdown and Djot, `+` is **not** a bullet in Carve and never has been — it is reserved as the list-continuation marker. This is what makes a lone `+` unambiguous: there is no `+` list it could belong to. A `+ x` line is therefore ordinary paragraph text, not a list item.

::: compare

````carve
- Build the image
+
```sh
docker build -t app .
```
- Push it
````

```html
<ul>
  <li>Build the image
    <pre><code class="language-sh">docker build -t app .
</code></pre>
  </li>
  <li>Push it</li>
</ul>
```

:::

A quote or table attaches the same way.

::: compare

```carve
- item
+
> note
- next
```

```html
<ul>
  <li>item
    <blockquote><p>note</p></blockquote>
  </li>
  <li>next</li>
</ul>
```

:::

### Equivalent to the blank-line form

The continuation marker and the compact blank-line form (above) produce **identical** output — they are two spellings of the same thing. These are equivalent:

```carve
- One

  > Quote
```

```carve
- One
+
> Quote
```

Both render:

```html
<ul>
  <li>One
    <blockquote><p>Quote</p></blockquote>
  </li>
</ul>
```

The blank-line form indents the block under the item. The `+` form puts a lone `+` at the item's marker column and starts the attached block at that column. A `+` at another column follows ordinary column rules or stays fence payload (markup-carve/carve#3421).

### First block of an item

Put the marker and a lone `+` on the same line — `- +` — to start an item directly with a block, with the block body flush-left (no indentation). The item has no lead text; its whole content is the following block.

::: compare

````carve
- +
| a | b |
| c | d |
- next
````

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td><td>b</td></tr>
        <tr><td>c</td><td>d</td></tr>
      </tbody>
    </table>
  </li>
  <li>next</li>
</ul>
```

:::

A lone `+` after the marker is the continuation marker, not text. `- + text` (with content after the `+`) keeps `+ text` as literal item text — only a *bare* `+` triggers the first-block form.

Since `+` is not a Carve bullet (use `-` or `*`), the lines below are a single paragraph, not a two-item list — the same input is a bullet list in Markdown and Djot, but not in Carve.

::: compare

```carve
+ one
+ two
```

```html
<p>+ one
+ two</p>
```

:::

### An indented plus under a sub-list stays text

A `+` at column 0 attaches to the outer item even while a sub-list is open. A `+` at the nested item's marker column attaches there; one at its content column stays text (markup-carve/carve#3421).

The plainest form of the rule, at a single level: the attached block is written
flush left, and the item holds it without a blank line.

::: compare

```carve
- a
+
c
```

```html
<ul>
  <li>a
    c
  </li>
</ul>
```

:::

The indented `+` below is ordinary text in the nested item:

::: compare

```carve
- a
  - b
    +
    c
```

```html
<ul>
  <li>a
    <ul>
      <li>b
+
c</li>
    </ul>
  </li>
</ul>
```

:::
