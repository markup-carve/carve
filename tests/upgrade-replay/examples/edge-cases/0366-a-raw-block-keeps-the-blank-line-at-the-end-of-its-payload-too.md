## A raw block keeps the blank line at the end of its payload too

The property is the one the fence section above states: a blank line inside a
fence is content, and the last one is content too, wherever the fence ends. A
raw block is a fence whose interior is a verbatim PAYLOAD rather than content
lines, and the payload is every line between the delimiters. Which container the
block sits in is not a parameter, and neither is whether the closer was written.

The shape that made this look unsettled is a raw block written LAST in the
document. Its payload's trailing newlines then land at the very end of the
output, where the trailing-whitespace trim every reader applies removes them, so
all four readers print the same bytes and the document cannot tell the readings
apart. Put a block after it and the payload becomes visible again (carve#1389).

::: compare

````carve
```=html
b

```

after
````

````html
b

<p>after</p>
````

:::

The same payload, inside a list item and with the fence left open. The item is
loose because a blank line stands before the sibling marker, whatever consumed
it; the blank is the payload's last line all the same.

::: compare

````carve
- ```=html
  b

- s
````

````html
<ul>
  <li>
    b

  </li>
  <li><p>s</p></li>
</ul>
````

:::

CONTROL. A payload with no blank line at the end of it gains none. This document
renders the same bytes under either reading of the case above, so it pins
nothing about the blank - it is here to catch the over-correction, a reader that
emits a separator of its own after the payload.

::: compare

````carve
```=html
b
```

after
````

````html
b
<p>after</p>
````

:::
