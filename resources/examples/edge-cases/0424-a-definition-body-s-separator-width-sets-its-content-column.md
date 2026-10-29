## A definition body's separator width sets its content column

The separator after `:` is a run of one or more spaces, and the body's content
column is `1 + separator width` - the rule a bullet already follows. One space is
canonical; a wider run is accepted and the formatter narrows it, carrying the
body's continuations down with it.

::: compare

```carve
:: term
: definition
```

```html
<dl>
  <dt>term</dt>
  <dd>definition</dd>
</dl>
```

:::

A one-space body establishes column 2, so a continuation reaching column 2 folds
into the `dd`.

::: compare

```carve
:: term
: first

  second
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>first</p>
    <p>second</p>
  </dd>
</dl>
```

:::

Column 1 does not reach it, and the block after the blank is the document's own.

::: compare

```carve
:: term
: first

 second
```

```html
<dl>
  <dt>term</dt>
  <dd>first</dd>
</dl>
<p>second</p>
```

:::

The two-space spelling keeps column 3, so the same column-2 continuation does
not reach ITS body. The two spellings differ in how far a continuation indents,
never in what they mean.

::: compare

```carve
:: term
:  first

  second
```

```html
<dl>
  <dt>term</dt>
  <dd>first</dd>
</dl>
<p>second</p>
```

:::

Both spellings may appear in one list, each carrying its own column.

::: compare

```carve
:: term
: one
:  two
```

```html
<dl>
  <dt>term</dt>
  <dd>one</dd>
  <dd>two</dd>
</dl>
```

:::

The first-block `+` form reads the same on either width.

::: compare

```carve
:: term
: +
flush block
```

```html
<dl>
  <dt>term</dt>
  <dd>flush block</dd>
</dl>
```

:::

A colon line below a folding term is the body, not more term text. This is the
case the engines answered three ways while the one-space spelling had no
meaning: carve-js folded it into the `dt`, the executable spec left it a stray
paragraph.

::: compare

```carve
:: term
wrapped on
: definition
```

```html
<dl>
  <dt>term
wrapped on</dt>
  <dd>definition</dd>
</dl>
```

:::
