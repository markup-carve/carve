## A blank after a comment still ends the item

A comment renders nothing, so it neither closes the item nor holds it open across a blank line. The blank does what a blank always does: it ends the item, and the indented line after it is a document-level paragraph rather than item content.

::: compare

```carve
- - a
 %% c

 b
```

```html
<ul>
  <li>
    <ul>
      <li>a</li>
    </ul>
  </li>
</ul>
<p>b</p>
```

:::
