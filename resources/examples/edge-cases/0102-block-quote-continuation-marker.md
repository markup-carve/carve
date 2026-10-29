## Block-quote continuation marker

The continuation marker also works in block quotes (PART 9 §17): a lone `+` at the quote's marker column attaches the next block at that column without repeating `>` on every line (markup-carve/carve#3421).

::: compare

```carve
> quoted
+
- item
```

```html
<blockquote>
  <p>quoted</p>
  <ul>
    <li>item</li>
  </ul>
</blockquote>
```

:::

It only attaches: a blank line still ends the quote and starts a sibling, and a `+` outside any container is literal text. A `>` line after the attached block resumes the quote.

::: compare

```carve
> quoted
+
- item
> more
```

```html
<blockquote>
  <p>quoted</p>
  <ul>
    <li>item</li>
  </ul>
  <p>more</p>
</blockquote>
```

:::
