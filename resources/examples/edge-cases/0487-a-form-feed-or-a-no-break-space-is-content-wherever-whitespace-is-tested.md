## A form feed or a no-break space is content wherever whitespace is tested

Carve's whitespace is four characters: U+0020, U+0009, U+000A and U+000D
(CARVE-P7-003). A form feed, a vertical tab, a no-break space and the other
Unicode spaces are content in every construct, including the ones that only
test for whitespace (markup-carve/carve#2157). In the documents below the
invisible character is a form feed unless the text says otherwise.

A form feed after an opener or before a closer does not refuse the delimiter.

::: compare

```carve
a /x/ b

a /x/ b
```

```html
<p>a <em>x</em> b</p>
<p>a <em>x</em> b</p>
```

:::

A code span holding a form feed between two spaces drops the spaces.

::: compare

```carve
`  `
```

```html
<p><code></code></p>
```

:::

A form feed after the closing pipe is content after the row, so the line is prose.

::: compare

```carve
|a|b|
```

```html
<p>|a|b|</p>
```

:::

A term marker followed by a form feed has content, so it is a term.

::: compare

```carve
:: 
: d
```

```html
<dl>
  <dt></dt>
  <dd>d</dd>
</dl>
```

:::

A trailing form feed stays in the term.

::: compare

```carve
:: t
: d
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
```

:::

A `+` followed by a form feed is not a continuation marker, in a description or
an item, nested or not.

::: compare

```carve
:: t
: +

b
```

```html
<dl>
  <dt>t</dt>
  <dd>+</dd>
</dl>
<p>b</p>
```

:::

::: compare

```carve
- +

b
```

```html
<ul>
  <li>+</li>
</ul>
<p>b</p>
```

:::

::: compare

```carve
- a
  - +

b
```

```html
<ul>
  <li>a
    <ul>
      <li>+</li>
    </ul>
  </li>
</ul>
<p>b</p>
```

:::

A typed frontmatter opener may end in whitespace, not in a form feed.

::: compare

```carve
---yaml
a: 1
---

t
```

```html
<p>---yaml
a: 1</p>
<hr>
<p>t</p>
```

:::

A heading reference does not fold a no-break space into a space. The heading
holds one between the letters.

::: compare

```carve
# a b

[a b][]
```

```html
<section id="a b">
  <h1>a&nbsp;b</h1>
  <p>[a b][]</p>
</section>
```

:::

Nor does it trim one. This heading starts with a no-break space.

::: compare

```carve
#  ab

[ab][]
```

```html
<section id=" ab">
  <h1>&nbsp;ab</h1>
  <p>[ab][]</p>
</section>
```

:::

A form feed after the combined `/*` opener does not refuse it either.

::: compare

```carve
/*x*/ y
```

```html
<p><strong><em>x</em></strong> y</p>
```

:::
