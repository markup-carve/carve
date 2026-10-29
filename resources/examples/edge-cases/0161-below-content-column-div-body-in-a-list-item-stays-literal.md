## Below-content-column div body in a list item stays literal

Inside a list item the block openers key on the item content column, not column
0. A `::: note` on the item's marker line opens its container whatever the next
line is (PART 2, "A MARKER-LINE OPENER OPENS TOO", ruled on
markup-carve/carve#2978). Lines below the content column are not its body, and
the empty container leaves no paragraph for them to fold into
(`CARVE-P0-009`), so they are read at the document. The section keeps the title
of the reading it used to pin.

:::: compare

```carve
- ::: note
 - para text
 :::
```

```html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">

    </aside>
  </li>
  <li>para text</li>
</ul>
<div>

</div>
```

::::
