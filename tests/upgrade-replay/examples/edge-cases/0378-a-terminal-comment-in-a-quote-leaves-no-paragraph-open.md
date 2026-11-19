## A terminal comment in a quote leaves no paragraph open

A line comment is an invisible block. When it is the quote's last block, an
unmarked following line has no paragraph to continue and remains outside.

::: compare

```carve
> %% hidden
tail
```

```html
<blockquote>

</blockquote>
<p>tail</p>
```

:::

A closed comment fence is one opaque invisible block and has the same result;
its body cannot reopen a paragraph in the quote.

::: compare

```carve
> %%%
> hidden
> %%%
tail
```

```html
<blockquote>

</blockquote>
<p>tail</p>
```

:::
