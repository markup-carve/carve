## A quote marker is `>` plus a space, and a lazy line keeps its own text

`>text` with no space is prose, not a quote marker (§10 I1). Inside an open quoted paragraph such a line folds in as lazy continuation and keeps its `>`, rather than being read as a marker and stripped.

::: compare

```carve
> ok
>bad
```

```html
<blockquote><p>ok
&gt;bad</p></blockquote>
```

:::
