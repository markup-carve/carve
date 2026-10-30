## Indented colon-fence blocks open

A `:::` line indented by a space at top level opens its container (carve#3885).
This holds for a bare div, a `::: |` line block, and a named admonition alike.

An indented bare `:::` opens a div.

:::: compare

```carve
 :::
 A box.
 :::
```

```html
<div>
  <p>A box.</p>
</div>
```

::::

An indented `::: |` opens a line block.

:::: compare

```carve
 ::: |
 Roses,
 Violets.
 :::
```

```html
<div class="line-block">
  <p>Roses,<br>
Violets.</p>
</div>
```

::::

An indented `::: note` opens an admonition.

:::: compare

```carve
 ::: note
 Body.
 :::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>Body.</p>
</aside>
```

::::

Control - flush left at column 0 the same `:::` opens a div.

:::: compare

```carve
:::
A box.
:::
```

```html
<div>
  <p>A box.</p>
</div>
```

::::
