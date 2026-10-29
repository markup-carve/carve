## A block opener indented under a definition term is term text at every depth

A term has no content column (CARVE-P2-028), so strict column 0 reads a line
under an open term against the container that holds the list. Past that
column the line folds into the term, whatever it would open.

:::::: compare

```carve
:: c
  # H
```

```html
<dl>
  <dt>c</dt>
</dl>
<section id="H">
  <h1>H</h1>
</section>
```

::::::

:::::: compare

```carve
:: c
  ::: note
  body
  :::
```

```html
<dl>
  <dt>c</dt>
</dl>
<aside class="admonition note" aria-label="Note">
  <p>body</p>
</aside>
```

::::::

Inside a quote the column is the one after the quote marker.

:::::: compare

```carve
> :: c
>   # H
```

```html
<blockquote>
  <dl>
    <dt>c</dt>
  </dl>
  <h1 id="H">H</h1>
</blockquote>
```

::::::

Inside a list item it is the item's content column, 2 here, so column 4
is past it.

:::::: compare

```carve
- item

  :: c
    # H
```

```html
<ul>
  <li>item
    <dl>
      <dt>c</dt>
    </dl>
    <h1 id="H">H</h1>
  </li>
</ul>
```

::::::

Inside a description it is the description's column.

:::::: compare

```carve
:: a
: b
  :: c
    # H
```

```html
<dl>
  <dt>a</dt>
  <dd>
    <p>b</p>
    <dl>
      <dt>c</dt>
    </dl>
    <h1 id="H">H</h1>
  </dd>
</dl>
```

::::::

:::::: compare

```carve
:: a
: b
  :: c
    ::: note
    body
    :::
```

```html
<dl>
  <dt>a</dt>
  <dd>
    <p>b</p>
    <dl>
      <dt>c</dt>
    </dl>
    <aside class="admonition note" aria-label="Note">
      <p>body</p>
    </aside>
  </dd>
</dl>
```

::::::

At the container's content column the opener ends the term and opens.

:::::: compare

```carve
:: c
# H
```

```html
<dl>
  <dt>c</dt>
</dl>
<section id="H">
  <h1>H</h1>
</section>
```

::::::

:::::: compare

```carve
:: a
: b
  :: c
  # H
```

```html
<dl>
  <dt>a</dt>
  <dd>
    <p>b</p>
    <dl>
      <dt>c</dt>
    </dl>
    <h1 id="H">H</h1>
  </dd>
</dl>
```

::::::

A list marker is not term text: §24 C4 lets it open at any column.

:::::: compare

```carve
:: a
: b
  :: c
    - x
```

```html
<dl>
  <dt>a</dt>
  <dd>
    <p>b</p>
    <dl>
      <dt>c</dt>
    </dl>
    <ul>
      <li>x</li>
    </ul>
  </dd>
</dl>
```

::::::

A colon fence at the container's column opens like any other opener.

:::::: compare

```carve
:: c
::: note
body
:::
```

```html
<dl>
  <dt>c</dt>
</dl>
<aside class="admonition note" aria-label="Note">
  <p>body</p>
</aside>
```

::::::
