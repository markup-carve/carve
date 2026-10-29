## Headings inside containers are not wrapped

A `<section>` models this document's own outline, so only top-level headings open
one. A heading inside a blockquote, div, or list item emits a bare `<h*>` with
its id on the heading itself. The ids are still assigned, still share the one
document-order dedup namespace with top-level headings, and are still `</#id>`
crossref targets - only the wrapper and the id's emission site differ.

::::: compare

```carve
> # Quoted
>
> Quoted body.

:::
# Divved
:::

- # In an item

  Item body.
```

```html
<blockquote>
  <h1 id="Quoted">Quoted</h1>
  <p>Quoted body.</p>
</blockquote>
<div>
  <h1 id="Divved">Divved</h1>
</div>
<ul>
  <li>
    <h1 id="In-an-item">In an item</h1>
    <p>Item body.</p>
  </li>
</ul>
```

:::::
