## Invalid named-container metadata keeps the subtree

A recognized fence and kind word keep their container when the remaining opener
metadata is invalid. Report `fence-title-syntax`, drop all opener metadata, and
parse the children as blocks (carve#2693). This applies to unknown kinds as well
as core admonitions and extension containers. It does not make a bare title
valid syntax.

::::: compare

````carve
:::: outer
::: widget Custom Title
# Heading

- first
- second
:::
::::
After.
````

```html
<div class="outer">
  <div class="widget">
    <h1 id="Heading">Heading</h1>
    <ul>
      <li>first</li>
      <li>second</li>
    </ul>
  </div>
</div>
<p>After.</p>
```

:::::

Malformed quoted titles and labels follow the same recovery. The invalid
metadata does not become a visible title or a label.

:::: compare

````carve
::: note "Unclosed
Body one.
:::

::: widget [Unclosed
Body two.
:::
````

```html
<aside class="admonition note" aria-label="Note">
  <p>Body one.</p>
</aside>
<div class="widget">
  <p>Body two.</p>
</div>
```

::::
