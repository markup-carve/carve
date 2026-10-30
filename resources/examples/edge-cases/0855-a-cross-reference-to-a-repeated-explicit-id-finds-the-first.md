---
page: edge-headings
---

## A cross-reference to a repeated explicit id finds the first

PART 9R R4 and CARVE-P2-004 (carve#4450). Both headings keep the id as written.

:::: compare

````carve
{#x}
# A

{#x}
# B

</#x>
````

```html
<section id="x">
  <h1>A</h1>
</section>
<section id="x">
  <h1>B</h1>
  <p><a href="#x">A</a></p>
</section>
```

::::

:::: compare

````carve
> {#x}
> # A

{#x}
# B

</#x>
````

```html
<blockquote>
  <h1 id="x">A</h1>
</blockquote>
<section id="x">
  <h1>B</h1>
  <p><a href="#x">A</a></p>
</section>
```

::::
