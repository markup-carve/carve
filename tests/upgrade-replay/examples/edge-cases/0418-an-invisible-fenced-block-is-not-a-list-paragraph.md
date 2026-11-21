## An invisible fenced block is not a list paragraph

A blank before a fenced percent block does not make the block a second
paragraph. The opener, payload, and closer are classified as one block before
list looseness is decided.

::: compare

```carve
- intro

   %%%
   hidden
   %%%
```

```html
<ul>
  <li>intro</li>
</ul>
```

:::
