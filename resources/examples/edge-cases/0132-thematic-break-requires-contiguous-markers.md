## Thematic break requires contiguous markers

A thematic break is three or more of the same marker. A `-` or `*` run may also
space its markers apart with single spaces; a `_` run may not (carve#4814).

Spaced `*` markers are a break.

::: compare

```carve
* * *
```

```html
<hr>
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

Spaced `-` markers are a break too.

::: compare

```carve
- - -
```

```html
<hr>
```

:::

Only a single space separates the markers, so a wider gap is a nested list.

::: compare

```carve
*  *  *
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
