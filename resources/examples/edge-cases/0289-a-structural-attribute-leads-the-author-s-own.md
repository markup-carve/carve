## A structural attribute leads the author's own

`type` and `start` are fixed by the first item's marker, so they belong to the
element's shape rather than to what the author wrote in an attribute block.
They are emitted first, and the author's attributes keep their source order
after them (PART 11 §5.1). Nothing pinned this before, and the two readings of
it split the engines (`markup-carve/carve#1090`).

::: compare

```carve
{k=v .attr}
a. alpha
```

```html
<ol type="a" k="v" class="attr">
  <li>alpha</li>
</ol>
```

:::

A decimal marker emits no `type`, so there is nothing to lead and the author's
attributes stand alone. This is the control: it agreed in every engine already,
and it fails only if a change moves authored attributes rather than ordering
the structural one.

::: compare

```carve
{.attr}
1. one
```

```html
<ol class="attr">
  <li>one</li>
</ol>
```

:::
