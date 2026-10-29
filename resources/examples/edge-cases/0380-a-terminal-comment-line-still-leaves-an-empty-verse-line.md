## A terminal comment line still leaves an empty verse line

Removing a comment-only line happens before inline parsing but keeps the verse
line itself. If an unclosed run reaches that terminal line, its content keeps
the newline left by the emptied line.

:::: compare

```carve
::: |
`
%%
:::
```

```html
<div class="line-block">
  <p><code>
</code></p>
</div>
```

::::
