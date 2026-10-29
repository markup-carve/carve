## Nested comment fences

A longer comment fence may contain a shorter one as content - the block ends only at a fence of the opener's length.

::: compare

```carve
before

%%%%
hidden %%% inner fence stays hidden
%%%%

after
```

```html
<p>before</p>
<p>after</p>
```

:::
