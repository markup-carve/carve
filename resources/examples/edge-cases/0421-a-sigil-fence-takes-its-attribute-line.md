## A sigil fence takes its attribute line

`::: |` and `::: \` take an attribute line like every other block. The class
list merges with the block's own class, which goes last, and the id and the rest
follow in source order.

:::: compare

```carve
{#poem .verse}
::: |
Roses are red,
  Violets are blue.
:::
```

```html
<div id="poem" class="verse line-block">
  <p>Roses are red,<br>
&nbsp;&nbsp;Violets are blue.</p>
</div>
```

::::

With no class of its own to merge, the block's class stands alone after the id.

:::: compare

```carve
{#poem}
::: |
one
two
:::
```

```html
<div id="poem" class="line-block">
  <p>one<br>
two</p>
</div>
```

::::

The hard-break fence reads the line the same way.

:::: compare

```carve
{#addr .contact}
::: \
one
two
:::
```

```html
<div id="addr" class="contact hardbreaks">
  <p>one<br>
two</p>
</div>
```

::::
