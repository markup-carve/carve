## A description keeps a list marker below its hosted footnote

Under the note's open paragraph a list marker is text, because a list marker interrupts an open paragraph only in a list item (PART 0 S3, markup-carve/carve#4160). `* child` and `tail` are lines of the unreferenced note, so the `<dd>` is empty. The section keeps the title of the reading it used to pin.

:::: compare

```carve
:: t
:  [^q]: note
    * child
tail
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
```

::::
