## Empty heading slugs use the ordinary duplicate suffix

An empty heading slug starts at `s`; another empty slug receives the next
available duplicate suffix.

::: compare

```carve
# ( )

# ( )
```

```html
<section id="s">
  <h1>( )</h1>
</section>
<section id="s-2">
  <h1>( )</h1>
</section>
```

:::
