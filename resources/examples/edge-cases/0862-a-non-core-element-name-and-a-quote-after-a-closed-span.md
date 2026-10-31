---
page: edge-inline
---

## A non-core element name and a quote after a closed span

`samp`, `var`, `cite` and `dfn` are not core elements, so an inline extension of that name renders as the generic extension span (PART 10, CARVE-P10-008).

::: compare

```carve
:samp[x]
```

```html
<p><span class="ext-samp">x</span></p>
```

:::

The end of a closed inline element counts as a word character, so a quote right after it closes (CARVE-P3-023).

::: compare

```carve
[—]{.c}"q"
```

```html
<p><span class="c">—</span>”q”</p>
```

:::
