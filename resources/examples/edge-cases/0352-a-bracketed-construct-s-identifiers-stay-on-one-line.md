## A bracketed construct's identifiers stay on one line

The runs that admit a boundary are the CONTENT runs. A reference label, a
footnote label and a crossref target are physical-line identifiers, matching the
one-line definition marker they resolve against, and they keep the guard the
content runs lost. These are controls: they answer the same before and after
markup-carve/carve#1352, which is what makes them worth writing down beside it.

::: compare

```carve
[t][r
x]

[r x]: /u
```

```html
<p>[t][r
x]</p>
```

:::

::: compare

```carve
x[^f
g]

[^f g]: n
```

```html
<p>x[^f
g]</p>
```

:::

AND THE TAIL IS AN IDENTIFIER TOO, which is what keeps a captionable host
honest. An image's ALT spans lines; its destination and its reference label do
not, so a tail carrying a boundary is not an image tail and the paragraph is
ordinary prose - it neither renders as an image nor hosts the caption line
below it. These are the near misses a reading that joined the paragraph and
stopped there would swallow:

::: compare

```carve
![a][r
x]
^ cap
```

```html
<p>![a][r
x]
^ cap</p>
```

:::

::: compare

```carve
![a](/i
q)
^ cap
```

```html
<p>![a](/i
q)
^ cap</p>
```

:::

AND A BLOCK BOUNDARY IS STILL A WALL. Admitting a newline into the scan says
nothing about how far it may run: an unclosed `[` is literal text, and the
inline pass never sees past the block it is reading, so the run cannot reach
the next paragraph to find a closer there.

::: compare

```carve
x [a
y

z
```

```html
<p>x [a
y</p>
<p>z</p>
```

:::
