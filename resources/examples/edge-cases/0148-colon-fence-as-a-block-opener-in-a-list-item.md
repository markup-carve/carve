## Colon-fence as a block opener in a list item

A `:::` colon-fence (admonition / div) is a block opener like every other (§24 C3): it must reach the item's content column, and a deeper authored column becomes the fence's temporary block base.

:::: compare

```carve
- one
 ::: note
 b
 :::
```

```html
<ul>
  <li>one</li>
</ul>
<aside class="admonition note" aria-label="Note">
  <p>b</p>
</aside>
```

::::

:::: compare

```carve
- one
  ::: note
  b
  :::
```

```html
<ul>
  <li>one
    <aside class="admonition note" aria-label="Note">
      <p>b</p>
    </aside>
  </li>
</ul>
```

::::

:::: compare

```carve
- one
   ::: note
   b
   :::
```

```html
<ul>
  <li>one
    <aside class="admonition note" aria-label="Note">
      <p>b</p>
    </aside>
  </li>
</ul>
```

::::
