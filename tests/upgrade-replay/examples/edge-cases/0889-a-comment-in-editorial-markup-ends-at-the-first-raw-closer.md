---
page: edge-inline
---

## A comment in editorial markup ends at the first raw closer

A `%%` comment takes every character after it, so a backtick in it opens no code span. In `{+`, `{-` and `/*` it ends at the first raw closer, as in every other braced form (CARVE-P9-042, carve#4641, carve#4720).

:::: compare

```carve
{+a %% `+}` b+} c
```

```html
<p><ins>a</ins><code> b+} c</code></p>
```

::::

:::: compare

```carve
{-a %% `-}` b-} c
```

```html
<p><del>a</del><code> b-} c</code></p>
```

::::

:::: compare

```carve
/*a %% `*/` b*/ c
```

```html
<p><strong><em>a</em></strong><code> b*/ c</code></p>
```

::::

:::: compare

```carve
{+a\ %% `+}` b+} c
```

```html
<p><ins>a&nbsp;</ins><code> b+} c</code></p>
```

::::

:::: compare

```carve
{+a `%%` b+} c
```

```html
<p><ins>a <code>%%</code> b</ins> c</p>
```

::::
