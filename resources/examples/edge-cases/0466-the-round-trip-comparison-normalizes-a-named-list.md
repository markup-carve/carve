## The round-trip comparison normalizes a named list

PART 11 §10k. A round trip preserves meaning, not one serialization, so two
renderings compare equal when they differ only by a NAMED entry: `<del>` and
`<s>` are one tag, and a nested emphasis of different strengths whose child
spans the whole parent may commute.

The list is closed. Equal strengths are not on it, because an emphasis inside
an emphasis and a single strong are different documents.

::: compare

```carve
{~ ~}
```

```html
<p><s> </s></p>
```

:::

::: compare

```carve
/*x*/
```

```html
<p><strong><em>x</em></strong></p>
```

:::
