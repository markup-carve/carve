## A nested quoted term leaves no paragraph for a lazy line

PART 0 S4 asks whether the innermost quoted leaf accepts lazy text. A
definition term is an ordinary line and accepts it, so the unmarked line folds
into the term (`CARVE-P2-028`).

::: compare

```carve
> > :: term
tail
```

```html
<blockquote>
  <blockquote>
    <dl>
      <dt>term
tail</dt>
    </dl>
  </blockquote>
</blockquote>
```

:::
