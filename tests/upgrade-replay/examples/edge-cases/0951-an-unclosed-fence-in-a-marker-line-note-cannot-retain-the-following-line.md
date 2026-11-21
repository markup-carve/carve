---
page: edge-lists
---

## An unclosed fence in a marker-line note cannot retain the following line

The fence body has no open paragraph (CARVE-P0-013). It ends when the column-zero line misses its note owner (PART 0 S1 and S2), so the final line is a document paragraph (carve#5065).

::: compare

```carve
- [^n]: t
  %%

    ~~~
    e
]
```

```html
<ul>
  <li></li>
</ul>
<p>]</p>
```

:::

The same boundary applies after a closed `%%%` comment span, which remains a
block-level construct under carve#5012.

::: compare

```carve
- [^n]: t
  %%%
  %%%

    ~~~
    e
]
```

```html
<ul>
  <li></li>
</ul>
<p>]</p>
```

:::
