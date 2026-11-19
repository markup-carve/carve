## A nested braced span hides an editorial closer

An insertion or deletion looks for its closer past a nested matched braced span, as every closer does under E2a. A frame of its own kind is not skipped, because same-kind insertion or deletion does not nest.

::: compare

```carve
{-{_a-}_} b-}
```

```html
<p><del><u>a-}</u> b</del></p>
```

:::

::: compare

```carve
{+x {~a+}~>c~} b+}
```

```html
<p><ins>x <del>a+}</del><ins>c</ins> b</ins></p>
```

:::

::: compare

```carve
{-{+a-}+} b-}
```

```html
<p><del><ins>a-}</ins> b</del></p>
```

:::

::: compare

```carve
{-{-a-}-} b-}
```

```html
<p><del>{-a</del>-} b-}</p>
```

:::

::: compare

```carve
{+{-a+}-} b+}
```

```html
<p><ins><del>a+}</del> b</ins></p>
```

:::
