---
page: edge-blocks
---

## A line after a comment block in a line block reads the stanza without it

A `%%%` span in verse leaves nothing however it ends: at its closer, or under PART 0 S1 at a lazy line that misses its owner (carve#4956). That line folds only into a stanza that held verse before the span.

::: compare

```carve
- a
  - ::: |
    %%%
b
```

```html
<ul>
  <li>a
    <ul>
      <li>
        <div class="line-block">

        </div>
      </li>
    </ul>
  </li>
</ul>
<p>b</p>
```

:::

::: compare

```carve
- a
  - ::: |
    %%%
    x
    %%%
b
```

```html
<ul>
  <li>a
    <ul>
      <li>
        <div class="line-block">

        </div>
      </li>
    </ul>
  </li>
</ul>
<p>b</p>
```

:::

::: compare

```carve
- ::: |
  x
  %%%
b
```

```html
<ul>
  <li>
    <div class="line-block">
      <p>x<br>
b</p>
    </div>
  </li>
</ul>
```

:::

::: compare

```carve
> ::: |
> x
> %%%
b
```

```html
<blockquote>
  <div class="line-block">
    <p>x<br>
b</p>
  </div>
</blockquote>
```

:::

::: compare

```carve
> > ::: |
> > %%%
y
```

```html
<blockquote>
  <blockquote>
    <div class="line-block">

    </div>
  </blockquote>
</blockquote>
<p>y</p>
```

:::

::: compare

```carve
:: t
: ::: |
  x
  %%%
b
  :::
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <div class="line-block">
      <p>x<br>
b</p>
    </div>
  </dd>
</dl>
```

:::
