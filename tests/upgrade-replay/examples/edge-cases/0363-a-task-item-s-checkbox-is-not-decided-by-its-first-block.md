## A task item's checkbox is not decided by its first block

The checkbox belongs to the ITEM. Nothing about what the item's first block turns
out to be reaches it: it is written directly after the `<li>` opener in every
spelling, and only the content moves - beside the checkbox when the first block
renders inline, on its own indented line below it when it does not.

The executable spec emitted it only where that first block was a PARAGRAPH. Every
other marker-line opener dropped it: a block quote, a code fence, a `:::` div, a
table row, a heading and a thematic break each rendered a plain `<li>`, so the
`[ ]` or `[x]` the author wrote was gone from the output while the item itself
parsed correctly. One serializer branch built the `<li>` opener without the
checkbox, and it was the branch every non-paragraph lead takes. carve-js and
carve-php write it in all of them (carve#1381).

::: compare

```carve
- [ ] > q
- [x] # h
- [ ] ---
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> 
    <blockquote><p>q</p></blockquote>
  </li>
  <li data-task-state="x"><input type="checkbox" checked disabled> 
    <h1 id="h">h</h1>
  </li>
  <li><input type="checkbox" disabled> 
    <hr>
  </li>
</ul>
```

:::
