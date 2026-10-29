## An unresolved reference image takes no caption

The caption attaches to a captionable block, and a reference image that resolves to nothing is not one: the whole thing stays the text the author typed, both lines in one paragraph. The resolved form beside it becomes a figure, and the definition may sit anywhere - which is why this cannot be decided by looking at the image line alone.

::: compare

```carve
![a][nope]
^ cap
```

```html
<p>![a][nope]
^ cap</p>
```

:::

The second caret line ends the slot. It starts a new paragraph whether the
reference resolves or not:

::: compare

```carve
![a][r]
^ cap
^ cap
```

```html
<p>![a][r]
^ cap</p>
<p>^ cap</p>
```

:::

::: compare

```carve
![a][r]
^ cap
^ cap

[r]: u
```

```html
<figure>
  <img src="u" alt="a">
  <figcaption>cap</figcaption>
</figure>
<p>^ cap</p>
```

:::
