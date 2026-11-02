---
page: edge-blocks
---

## An indented comment block in a line block leaves nothing

Since markup-carve/carve#4907 a `%%%` opener opens its span with no closer
lookahead: without a closer it hides everything up to a line that misses its
owner or the end of its container (PART 9 §28). The rows below follow that
reading; where the prose describes a closerless opener as a `%%` line or a
closer ahead as deciding the span, it records the reading the ruling replaced.

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

</div>
```

::::::
