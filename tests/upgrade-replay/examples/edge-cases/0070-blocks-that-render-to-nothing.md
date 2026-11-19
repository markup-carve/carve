## Blocks that render to nothing

A comment, a comment block, an abbreviation definition and a non-HTML raw
block produce no output. Inside a container they contribute no line either -
the container's body is what remains.

:::: compare

```carve
> q
> %%%
> x
> %%%
> body
```

```html
<blockquote>
  <p>q</p>
  <p>body</p>
</blockquote>
```

::::

A definition body that renders to nothing closes on its own line, like the
single-paragraph form.

::: compare

```carve
:: t
:  %%%
   x
   %%%
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
```

:::

An abbreviation definition is collected for the document's abbreviation table
and leaves nothing behind. It renders to nothing only where it is a definition,
which is at document level: inside a container the same line is ordinary text.

:::: compare

```carve
*[HTML]: HyperText Markup Language

:::
body
:::
```

```html
<div>
  <p>body</p>
</div>
```

::::
