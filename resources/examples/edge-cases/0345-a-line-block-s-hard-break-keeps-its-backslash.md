## A line block's hard break keeps its backslash

A line block hardens every line boundary of its own accord, and a backslash
break is NOT additive: `hard_break = '\', newline` consumes its own newline, so
no soft break survives for §23 to convert and one boundary still produces one
`<br>` (markup-carve/carve#1334). The backslash is not thereby redundant. PART 7
makes the whitespace run before it INTERIOR, so `a \` is how a verse line keeps a
LONE trailing space - and the canonical writer may not drop it, because a bare
newline makes that space line-trailing, where PART 2 strips it and formatting the
document destroys rendered content (PART 11 §7c).

:::: compare

```carve
::: |
a \
b
:::
```

```html
<div class="line-block">
  <p>a <br>
b</p>
</div>
```

::::

A `\` ALONE on a body line is how a stanza carries an empty verse line. The blank
line is the one spelling that would end the stanza instead, so a writer that drops
this backslash hands back one stanza as two.

:::: compare

```carve
::: |
a
\
b
:::
```

```html
<div class="line-block">
  <p>a<br>
<br>
b</p>
</div>
```

::::

The control that bounds the rule: a TRAILING run of TWO OR MORE columns is
already NBSP content under MEDIAL GAPS, so it survives with no backslash and the
backslash carries nothing here. This is the document whose canonical form drops
it.

:::: compare

```carve
::: |
a  \
b
:::
```

```html
<div class="line-block">
  <p>a&nbsp;&nbsp;<br>
b</p>
</div>
```

::::
