## Post-blank list continuation (content-column model)

A block opener or sublist marker attaches to a list item when it reaches at least the item's *content column* (§24 C3): `- ` -> column 2, `1. ` -> column 3. One rule, blank line or not - the blank only decides tight vs loose. Below the content column a line lazily continues the item paragraph (no blank) or, after a blank, ends the item and parses at document level. Past the column, a recognized opener establishes its authored block base and remains structural; canonical output returns it to the content column. This is intentionally similar to Djot's deeper-indent leniency while retaining Carve's minimum column.

Below the content column, after a blank line, the block opener ends the item and parses at the document level.

::: compare

```carve
- one

 > q
```

```html
<ul>
  <li>one</li>
</ul>
<blockquote><p>q</p></blockquote>
```

:::

At the content column, it nests into the item.

::: compare

```carve
- one

  > q
```

```html
<ul>
  <li>one
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::

Past the content column, a recognized opener remains structural and uses its authored column as a temporary block base.

::: compare

```carve
- one

   # h
```

```html
<ul>
  <li>one
    <h1 id="h">h</h1>
  </li>
</ul>
```

:::

With no blank line, a line below the content column lazily continues the open item paragraph.

::: compare

```carve
- one
 > q
```

```html
<ul>
  <li>one</li>
</ul>
<blockquote><p>q</p></blockquote>
```

:::

A block opener at column 0 is a document-level block: it interrupts and ends the list, exactly as a quote or heading there would.

::: compare

````carve
- one
```
c
```
````

````html
<ul>
  <li>one</li>
</ul>
<pre><code>c
</code></pre>
````

:::
