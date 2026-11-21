---
page: edge-inline
---

## An escaped space before a comment marker separates it

An escaped space is a space before `%%` (CARVE-P9-041), as it is wherever flanking is measured. The `%%` starts a trailing comment, and the escape keeps its no-break space: it is not part of the separating run the comment consumes (carve#4274).

::: compare

```carve
x\ %% c
```

```html
<p>x&nbsp;</p>
```

:::

The same holds in a forced span, which the comment ends at its closer, and after spaces the comment consumes.

::: compare

```carve
{=a\ %% c=} t and b \ %% d
```

```html
<p><mark>a&nbsp;</mark> t and b &nbsp;</p>
```

:::

The combined token ends the comment at its closer.

::: compare

```carve
/*x\ %% c*/ t
```

```html
<p><strong><em>x&nbsp;</em></strong> t</p>
```

:::
