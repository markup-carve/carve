## A math span's base class keeps the class slot in place

`math inline` is a mandatory base class, so it is prepended INSIDE the class slot
and the slot stays at the first-appearance position of a class in the author's
order (PART 10 §1). An id written before any class is still serialized first.

markup-carve/carve#1168 pinned this for the generic `ext-NAME` fallback. The math
span carries a base class the same way and was missed, because no case put an id
before a class on it (markup-carve/carve#1164).

::: compare

```carve
$`E=mc^2`{#i .c k=v}
```

```html
<p><span id="i" class="math inline c" k="v" role="math">\(E=mc^2\)</span></p>
```

:::

With no authored class there is no slot to keep, so the base class leads.

::: compare

```carve
$`E=mc^2`{#i k=v}
```

```html
<p><span class="math inline" id="i" k="v" role="math">\(E=mc^2\)</span></p>
```

:::
