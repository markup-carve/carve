## A lazy marker line's definition defines nothing, in any container

NO OPEN PARAGRAPH, NO LAZY LINE holds wherever the paragraph is. A list does not
interrupt one (PART 9 section 10), so a marker line under an open quoted
paragraph is lazy text of that paragraph - the definition on it renders as the
text the author typed and enters no symbol table, exactly as at the document
level. The reference below stays literal because nothing defined it.

::: compare

```carve
> r
> - [d]: u

[go][d]
```

```html
<blockquote><p>r
- [d]: u</p></blockquote>
<p>[go][d]</p>
```

:::

A div holds a paragraph open the same way, and adds no per-line prefix for the
question to hide behind.

:::: compare

```carve
::: n
r
- [d]: u
:::

[go][d]
```

```html
<div class="n">
  <p>r
- [d]: u</p>
</div>
<p>[go][d]</p>
```

::::

The footnote kind answers alike - one rule, both definition markers.

::: compare

```carve
> r
> - [^f]: t

see[^f]
```

```html
<blockquote><p>r
- [^f]: t</p></blockquote>
<p>see[^f]</p>
```

:::

With no paragraph open the marker opens a real item, and the definition in it is
metadata: it renders nothing where it was written and the reference resolves.

::: compare

```carve
> - [d]: u

[go][d]
```

```html
<blockquote>
  <ul>
    <li></li>
  </ul>
</blockquote>
<p><a href="u">go</a></p>
```

:::


A blank quoted line closes the paragraph, so the marker below it opens an item
too.

::: compare

```carve
> r
>
> - [d]: u

[go][d]
```

```html
<blockquote>
  <p>r</p>
  <ul>
    <li></li>
  </ul>
</blockquote>
<p><a href="u">go</a></p>
```

:::
