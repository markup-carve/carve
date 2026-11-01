---
page: edge-inline
---

## Abbreviations skip an editorial comment and an unresolved symbol

PART 9R R3 (carve#4801). The text of an editorial comment and the literal a symbol renders when no map resolves it are not scanned for abbreviations.

:::::: compare

`````carve
{#A#} and :A:

*[A]: y
`````

```html
<p><span class="critic-comment">A</span> and :A:</p>
```

::::::

An attribute block on the symbol does not change that; prose next to it still expands.

:::::: compare

`````carve
:A:{.c} and A

*[A]: y
`````

```html
<p><span class="c">:A:</span> and <abbr title="y">A</abbr></p>
```

::::::
