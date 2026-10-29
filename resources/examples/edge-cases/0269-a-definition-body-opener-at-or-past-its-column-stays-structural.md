## A definition body opener at or past its column stays structural

`definition_indent` reaches the body's minimum column. A recognized block opener
at or beyond that column establishes its authored position as a local block
base, matching list items and footnote bodies. The `>` here therefore opens a
quote. Ordinary over-indented text still continues the paragraph.

The two documents after it are CONTROLS. They pin the columns on either side of
the boundary, which do not change and are not what was ruled: at the body's own
column a block opener still opens a block, and flush left the body ends and the
quote is its sibling. Without them the rule above reads as "an indented `>` is
never a quote", which is not what it says.

::: compare

```carve
:: t
:  body
    > q
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>body</p>
    <blockquote><p>q</p></blockquote>
  </dd>
</dl>
```

:::

CONTROL, at the body's column. Three spaces reach column 3, so the line is the
body's own block content and the quote opens.

::: compare

```carve
:: t
:  body
   > q
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>body</p>
    <blockquote><p>q</p></blockquote>
  </dd>
</dl>
```

:::

CONTROL, flush left. Column 0 does not reach the body's column at all, so the
body ends and the quote is a sibling of the list.

::: compare

```carve
:: t
:  body
> q
```

```html
<dl>
  <dt>t</dt>
  <dd>body</dd>
</dl>
<blockquote><p>q</p></blockquote>
```

:::
