## An unclosed inline run in a line block reaches the end of the block

An inline run with no closer renders to the end of its BLOCK. A line block is
one block, so its line breaks are a rendering instruction rather than a
boundary the inline parser can see (markup-carve/carve#1282). The run therefore
carries the break, and what it carries is a NEWLINE: the break is inside the
run, so it is the run's content and not a `<br>` the container promised.

:::: compare

```carve
::: |
a `b
c d
:::
```

```html
<div class="line-block">
  <p>a <code>b
c d</code></p>
</div>
```

::::

The control is the same two lines as an ordinary paragraph, which every reader
already agreed about. One rule across both containers is what this pins, and
the line block needs no exception:

::: compare

```carve
a `b
c d
```

```html
<p>a <code>b
c d</code></p>
```

:::

And the control that keeps the container's promise intact: a run that DOES
close leaves the break outside itself, where it hardens as every other line
break in a line block does. These two documents differ by one backtick and
answer differently, which is why both are here.

:::: compare

```carve
::: |
a `b`
c d
:::
```

```html
<div class="line-block">
  <p>a <code>b</code><br>
c d</p>
</div>
```

::::

The rule is about runs, not about backticks: a math run spans the break the
same way, and its content holds the newline too.

:::: compare

```carve
::: |
a $`x
c d
:::
```

```html
<div class="line-block">
  <p>a <span class="math inline" role="math">\(x
c d\)</span></p>
</div>
```

::::
