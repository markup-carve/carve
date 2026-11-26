## A quote on a description body marker line takes a plus at its column

A lone `+` at the column of a quote that opens after `: ` gives the quote its
next block (PART 9 §17 L3, CARVE-P0-024), as it does for a quote that opens on a
list item's marker line (markup-carve/carve#4223).

::: compare

```carve
:: t
: > a
  +
  para
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote>
      <p>a</p>
      <p>para</p>
    </blockquote>
  </dd>
</dl>
```

:::

The quote takes any block there, and a wider body lead moves the column with
the `>`.

::: compare

```carve
:: t
:  > a
   +
   > q
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote>
      <p>a</p>
      <blockquote><p>q</p></blockquote>
    </blockquote>
  </dd>
</dl>
```

:::

A list at the quote's column attaches too: only a list item host refuses one
(carve#4409).

::: compare

```carve
:: t
: > a
  +
  . e
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote>
      <p>a</p>
      <ol>
        <li>e</li>
      </ol>
    </blockquote>
  </dd>
</dl>
```

:::
