## A footnote reference bounds an editorial closer scan

A `[^` run is a footnote reference before bracket scanning, so the scan for an insertion's, a deletion's or a substitution's closer does not skip `[^[g]+}]` as one bracket run. The closer after the reference's `]` ends the frame.

::: compare

```carve
{+[^[g]+}] b+}
```

```html
<p><ins>[^[g]</ins>] b+}</p>
```

:::

::: compare

```carve
{-[^[g]-}] b-}
```

```html
<p><del>[^[g]</del>] b-}</p>
```

:::

::: compare

```carve
{~a~>[^[g]~}] b~}
```

```html
<p><del>a</del><ins>[^[g]</ins>] b~}</p>
```

:::
