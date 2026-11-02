## A nested quoted term leaves no paragraph for a lazy line

PART 0 S4 asks whether the innermost quoted leaf accepts lazy text. A definition term is no paragraph (carve#4861), so the unmarked line ends the quotes and is a paragraph of its own.

::: compare

```carve
> > :: term
tail
```

```html
<blockquote>
  <blockquote>
    <dl>
      <dt>term</dt>
    </dl>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::
