## Bare-dot ordered markers

An ordered marker may drop its value when the delimiter is `.`: a bare `. `
counts from 1, the AsciiDoc-style shorthand for the list nobody numbers by hand.

::: compare

```carve
. first
. second
. third
```

```html
<ol>
  <li>first</li>
  <li>second</li>
  <li>third</li>
</ol>
```

:::

The bare dot is a **spelling, not a dialect**: it *is* decimal-dot, so it opens
and continues one list with the explicit form. Only `.` may drop its value -
a leading `) ` collides with prose parentheticals far more often than a leading
`. ` does, the same asymmetry that keeps `(1)` from being a marker.

::: compare

```carve
1. explicit
. continues the same list

) not a marker, and never opens one
```

```html
<ol>
  <li>explicit</li>
  <li>continues the same list</li>
</ol>
<p>) not a marker, and never opens one</p>
```

:::

Carrying no value, it cannot set a start - `3.` is how that is written - and
li-attributes attach to it exactly as they do to every other marker, because
the shape is marker, then attributes, then the required space.

::: compare

```carve
.{#x} attributed
. plain
```

```html
<ol>
  <li id="x">attributed</li>
  <li>plain</li>
</ol>
```

:::
