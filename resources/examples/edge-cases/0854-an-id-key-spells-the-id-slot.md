---
page: edge-attributes
---

## An id key spells the id slot

CARVE-P4-007 and PART 10 §1: one `id` is written, and an authored one replaces a generated one (carve#4456).

:::: compare

````carve
> {id=q}
> # Heading
````

```html
<blockquote>
  <h1 id="q">Heading</h1>
</blockquote>
```

::::

:::: compare

````carve
{#i id=j}
para
````

```html
<p id="j">para</p>
```

::::

:::: compare

````carve
{id=q}
# Heading
````

```html
<section id="q">
  <h1>Heading</h1>
</section>
```

::::
