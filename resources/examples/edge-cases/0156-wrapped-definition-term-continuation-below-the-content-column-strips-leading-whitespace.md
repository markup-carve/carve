## Wrapped definition term continuation below the content column strips leading whitespace

A `:: term` line inside a list item may be continued by a wrapped line. When that continuation sits *below* the item content column it is a lazy continuation, so - like a lazy paragraph or blockquote continuation - its leading whitespace is stripped before it folds into the `<dt>`. (A continuation *above* the content column instead folds with its residual indent preserved; a continuation at or above the content column is dedented rather than stripped.)

At column 1, one below the content column 2: the leading space is stripped before the fold.

::: compare

```carve
- one
  :: term
 wrapped
```

```html
<ul>
  <li>one
    <dl>
      <dt>term
wrapped</dt>
    </dl>
  </li>
</ul>
```

:::

At column 0, flush left: the continuation still folds into the term, byte-identically.

::: compare

```carve
- one
  :: term
wrapped
```

```html
<ul>
  <li>one
    <dl>
      <dt>term
wrapped</dt>
    </dl>
  </li>
</ul>
```

:::
