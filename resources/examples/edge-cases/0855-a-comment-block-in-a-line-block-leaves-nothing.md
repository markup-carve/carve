---
page: edge-blocks
---

## A comment block in a line block leaves nothing

A `%%%` pair in verse hides its body and leaves no verse line (CARVE-P9-047).

:::: compare

```carve
::: |
%%%
secret
%%%
:::
```

```html
<div class="line-block">

</div>
```

::::

The lines around the pair stay adjacent, and a blank line in its body splits no stanza.

:::: compare

```carve
::: |
a
%%%
one

two
%%%
c
:::
```

```html
<div class="line-block">
  <p>a<br>
c</p>
</div>
```

::::

A fence with no closer in the body is still a comment line.

:::: compare

```carve
::: |
a
%%%
c
:::
```

```html
<div class="line-block">
  <p>a<br>
<br>
c</p>
</div>
```

::::
