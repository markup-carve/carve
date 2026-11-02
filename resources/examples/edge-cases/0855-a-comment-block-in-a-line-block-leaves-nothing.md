---
page: edge-blocks
---

## A comment block in a line block leaves nothing

Since markup-carve/carve#4907 a `%%%` opener opens its span with no closer
lookahead: without a closer it hides everything up to a line that misses its
owner or the end of its container (PART 9 §28). The rows below follow that
reading; where the prose describes a closerless opener as a `%%` line or a
closer ahead as deciding the span, it records the reading the ruling replaced.

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
  <p>a</p>
</div>
```

::::
