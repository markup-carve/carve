---
page: edge-inline
---

## A comment on the new side of a substitution ends at the first raw closer

A `%%` comment after the `~>` of a substitution takes every character to the first raw `~}`, as on the old side, so a backtick in it opens no code span (CARVE-P9-042, carve#4641, carve#4745).

:::: compare

```carve
{~a~>b %% `~}` c~} d
```

```html
<p><del>a</del><ins>b</ins><code> c~} d</code></p>
```

::::

:::: compare

```carve
{~a~>b %% x~} d
```

```html
<p><del>a</del><ins>b</ins> d</p>
```

::::

:::: compare

```carve
{~a~>b `%%` c~} d
```

```html
<p><del>a</del><ins>b <code>%%</code> c</ins> d</p>
```

::::
