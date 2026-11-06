## Unresolved reference soft lines fold in text targets

An unresolved reference keeps its source spelling under PART 9R R1. In plain
and ANSI output, an ordinary line feed in that spelling is a soft break and
folds to a space. A local hard-break block promotes only immediate soft-break
children of its direct paragraph (CARVE-P9-050), so it does not promote a line
feed inside link fallback or scalar image alternative text (carve#5257).

::: compare

```carve
[a
b][missing]
```

```html
<p>[a
b][missing]</p>
```

:::

::: compare

```carve
::: \
[a
b][missing]
:::
```

```html
<div class="hardbreaks">
  <p>[a
b][missing]</p>
</div>
```

:::

::: compare

```carve
::: \
![a
b][missing]
:::
```

```html
<div class="hardbreaks">
  <p>![a
b][missing]</p>
</div>
```

:::
