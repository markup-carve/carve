## Thematic break requires contiguous markers

A thematic break is three or more of the same marker (`-`, `*`, `_`) contiguous
at column zero. Spacing the markers apart, or indenting the run, disqualifies it:
the line is parsed as ordinary block content instead.

Spaced `*` markers are a bullet list, not a break.

::: compare

```carve
* * *
```

```html
<ul>
  <li>
    <ul>
      <li>*</li>
    </ul>
  </li>
</ul>
```

:::

Spaced `_` markers are a plain paragraph.

::: compare

```carve
_ _ _
```

```html
<p>_ _ _</p>
```

:::

An indented `***` run is a paragraph, not a break.

::: compare

```carve
 ***
```

```html
<hr>
```

:::

A contiguous run at column zero is still a thematic break.

::: compare

```carve
***
```

```html
<hr>
```

:::
