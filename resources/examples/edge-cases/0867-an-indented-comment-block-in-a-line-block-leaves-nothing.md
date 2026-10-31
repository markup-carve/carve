---
page: edge-blocks
---

## An indented comment block in a line block leaves nothing

CARVE-P9-047 (carve#4469). A `%%%` opener indented by at most 3 spaces opens a block comment in verse, as an indented opener does everywhere else, so its body is hidden.

:::::: compare

`````carve
::: |
  %%%
  secret
  %%%
:::
`````

```html
<div class="line-block">

</div>
```

::::::

Three spaces still open the span, and verse around it keeps its lines.

:::::: compare

`````carve
::: |
a
   %%%
secret
%%%
c
:::
`````

```html
<div class="line-block">
  <p>a<br>
c</p>
</div>
```

::::::

Four spaces are verse indentation, so the line is text.

:::::: compare

`````carve
::: |
    %%%
  x
    %%%
:::
`````

```html
<div class="line-block">
  <p>&nbsp;&nbsp;&nbsp;&nbsp;%%%<br>
&nbsp;&nbsp;x<br>
&nbsp;&nbsp;&nbsp;&nbsp;%%%</p>
</div>
```

::::::

An indented opener with no closer is verse text, as an indented `%%` line is.

:::::: compare

`````carve
::: |
  %%%
x
:::
`````

```html
<div class="line-block">
  <p>&nbsp;&nbsp;%%%<br>
x</p>
</div>
```

::::::
