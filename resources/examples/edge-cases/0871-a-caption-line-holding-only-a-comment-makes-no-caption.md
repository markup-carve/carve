---
page: edge-tables
---

## A caption line holding only a comment makes no caption

PART 2 caption (carve#4559). Removing a comment must not change the output (carve#4220), so a caret whose content is only comments opens no caption and the line is paragraph text. A comment followed by text still captions.

:::::: compare

`````carve
| a |
^ %% x
`````

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
<p>^</p>
```

::::::

:::::: compare

`````carve
> q
^ %% x
`````

```html
<blockquote><p>q
^</p></blockquote>
```

::::::

:::::: compare

`````carve
> q

^ %% x
`````

```html
<blockquote><p>q</p></blockquote>
<p>^</p>
```

::::::

:::::: compare

`````carve
| a |
^ {% x %}y
`````

```html
<table>
  <caption>y</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

::::::

:::::: compare

`````carve
| a |
^ {% x %}y %% z
`````

```html
<table>
  <caption>y</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

::::::
