## Indented colon-fence blocks stay literal

A `:::` line opens a container only at column 0. Indented by a space it is not a
fence opener, so the marker, the body, and the closing marker all fold into one
literal paragraph. This holds for a bare div, a `::: |` line block, and a named
admonition alike.

An indented bare `:::` div stays literal.

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

An indented `::: |` line block stays literal.

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

An indented `::: note` admonition stays literal.

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
