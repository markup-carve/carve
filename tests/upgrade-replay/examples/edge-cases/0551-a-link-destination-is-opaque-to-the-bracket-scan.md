## A link destination is opaque to the bracket scan

A destination has no escape processing (`docs/dismissed-syntax.md`), so a `]` in
it is an ordinary URL character and cannot be spelled any other way. The scan
that closes a bracketed run therefore skips a destination whole, the way it
already skips a code span and an editorial comment: `CARVE-P3-001` states the
criterion as an open set, and every construct whose content is literal joins it.

Nothing here was covered before, and the reason is worth recording. Both Djot
importers used to percent-encode a bracket in a destination, so the `]` was
deleted before any parser saw it. Removing that encoding, which the Djot
contract requires, exposed a gap that had been unreachable for as long as the
encoding existed (markup-carve/carve#2859).

A `]` closes nothing inside a destination.

::: compare

```carve
[x](http://u/])
```

```html
<p><a href="http://u/]">x</a></p>
```

:::

An unbalanced `[` is a URL character too, and needs no partner.

::: compare

```carve
[x](http://u/[)
```

```html
<p><a href="http://u/[">x</a></p>
```

:::

A balanced pair is carried whole, with no second spelling and no encoding.

::: compare

```carve
[x](http://u/[a])
```

```html
<p><a href="http://u/[a]">x</a></p>
```

:::

An image reads the same destination production, so it holds the brackets too.

::: compare

```carve
![x](http://u/[a])
```

```html
<img src="http://u/[a]" alt="x">
```

:::

A title is quoted rather than bracketed, so a `]` is content there as well, and
a destination and a title can each hold one.

::: compare

```carve
[x](http://u/] "t]")
```

```html
<p><a href="http://u/]" title="t]">x</a></p>
```

:::

The control, which is what keeps the skip from reaching too far: a `]` in
ordinary text still closes an outstanding `[`. The run below holds a link and
stays literal, because it has no tail of its own.

::: compare

```carve
a [b [x](u) c]
```

```html
<p>a [b <a href="u">x</a> c]</p>
```

:::

With an OUTSTANDING `[` in the surrounding text the two readings part company,
which is what makes these the shapes the gap was found on. The `]` in the
destination below is the first one the scan meets, and a scan that closed on it
would end the run inside a destination and leave the whole line literal.

::: compare

```carve
a [b [x](http://u/]) c
```

```html
<p>a [b <a href="http://u/]">x</a> c</p>
```

:::

The image spelling of the same shape, since the skip belongs to the destination
and not to what precedes it.

::: compare

```carve
a [b ![x](http://u/]) c
```

```html
<p>a [b <img src="http://u/]" alt="x"> c</p>
```

:::

And with a `]` in the title beside the one in the destination, so the slot is
skipped past its closing parenthesis rather than up to the destination's end.

::: compare

```carve
a [b [x](http://u/] "t]") c
```

```html
<p>a [b <a href="http://u/]" title="t]">x</a> c</p>
```

:::

The shape the ruling was filed on, where the link TEXT spells the destination it
points at with every bracket escaped. The text's escapes are resolved and the
destination's brackets are not, so the two readings meet in one line.

::: compare

```carve
a [[http\:\/\/u\/\]](http://u/])
```

```html
<p>a [<a href="http://u/]">http://u/]</a></p>
```

:::
