## An abbreviation expands inside an inline container

PART 9R R3 matches a term in RENDERED TEXT at word boundaries. The container the
text sits in does not change that: an ordinary span, a compact semantic span and
the `:name[…]` extension form all expand, exactly as emphasis and a link do.

The corpus had one case here - the explicit-`abbr` row, which every engine agreed
on - so every neighbouring row was unpinned, and two engines kept opposite
defects for months with no red test: carve-rs dropped the expansion inside a
span, carve-js dropped it inside `:name[…]` (markup-carve/carve#1151).

::: compare

```carve
*[HTML]: Long Form

The [HTML]{.x} key.
```

```html
<p>The <span class="x"><abbr title="Long Form">HTML</abbr></span> key.</p>
```

:::

A compact semantic span is the same question, and PART 9 §10 made this spelling a
documented feature - so a dropped expansion here is silent loss inside a
construct the docs teach.

::: compare

```carve
*[HTML]: Long Form

The [HTML]{kbd} key.
```

```html
<p>The <kbd><abbr title="Long Form">HTML</abbr></kbd> key.</p>
```

:::

The `:name[…]` form takes the generic fallback in a core render, and the term
still expands inside it.

::: compare

```carve
*[HTML]: Long Form

The :kbd[HTML] key.
```

```html
<p>The <span class="ext-kbd"><abbr title="Long Form">HTML</abbr></span> key.</p>
```

:::

The controls: emphasis and a link already agreed across engines, and they pin
that the containers above are not special-cased in one direction.

::: compare

```carve
*[HTML]: Long Form

Both *HTML* and [HTML](/u) expand.
```

```html
<p>Both <strong><abbr title="Long Form">HTML</abbr></strong> and <a href="/u"><abbr title="Long Form">HTML</abbr></a> expand.</p>
```

:::

An explicit `abbr` attribute is the one exception (markup-carve/carve#1127): the
authored expansion wins and the definition does not apply on top of it.

::: compare

```carve
*[HTML]: Long Form

The [HTML]{abbr="Custom"} key.
```

```html
<p>The <abbr title="Custom">HTML</abbr> key.</p>
```

:::
