---
page: edge-inline
---

## A comment marker at the start of editorial content is text

Insert, delete and substitution content is inline text, and a `%%` there starts no comment: a comment is a line construct (carve#4178). The content renders as written.

::: compare

```carve
{+%% b+}
```

```html
<p><ins>%% b</ins></p>
```

:::

::: compare

```carve
{-%% b-}
```

```html
<p><del>%% b</del></p>
```

:::

::: compare

```carve
{~%% b~>x~}
```

```html
<p><del>%% b</del><ins>x</ins></p>
```

:::
