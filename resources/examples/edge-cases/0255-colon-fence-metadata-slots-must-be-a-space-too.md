## Colon fence metadata slots must be a space too

Once `admonition_type` has been read the block is decided, so the opener's
`"title"` and `[label]` slots carry no recognition -- they are PADDING. They are
spelled `space` all the same, for the other reason PART 7 gives: a tab is syntax
ONLY in a line's leading indentation run, and a padding slot sits after the first
non-whitespace character of its line.

This half is pinned beside the separator half deliberately. A case that pinned
only the separator invites a fix that narrows the whole line, and a case that
pinned only the padding invites the reverse; carve-js carried both defects at
once, in opposite directions. Invalid metadata now reports a diagnostic and
keeps the named container with no title or label (carve#2693).

:::: compare

```carve
::: note	"Title"
x
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>x</p>
</aside>
```

::::

:::: compare

```carve
::: note 	"Title"
x
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>x</p>
</aside>
```

::::

The `[label]` slot reverts independently of the `"title"` slot, so it carries its
own pair: a fixture with a tab at both cannot tell them apart, because narrowing
either one already drops the metadata.

:::: compare

```carve
::: note "Title"	[First]
x
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>x</p>
</aside>
```

::::

:::: compare

```carve
::: note "Title" 	[First]
x
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>x</p>
</aside>
```

::::

The spaced spellings are unchanged, and both slots still carry their metadata.

:::: compare

```carve
::: note "Title" [First]
x
:::
```

```html
<aside class="admonition note" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1">Title</p>
  <p class="div-label">First</p>
  <p>x</p>
</aside>
```

::::
