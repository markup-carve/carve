---
page: edge-lists
---

## An abbreviation definition after a plus is skipped like a link definition

CARVE-P9-067, CARVE-P9-013 (carve#4449). An abbreviation definition is an invisible line like a link or note definition, so a `+` skips it and the first visible line decides.

An unquoted abbreviation definition after a `+` is skipped like a link or note definition: the item takes `text` and `A` is defined in the document.

:::::: compare

`````carve
- +
*[A]: b
text

A
`````

```html
<ul>
  <li>text</li>
</ul>
<p><abbr title="b">A</abbr></p>
```

::::::

A definition-body host and a quote host read it the same way.

:::::: compare

`````carve
:: t
: +
*[A]: b
text

A
`````

```html
<dl>
  <dt>t</dt>
  <dd>text</dd>
</dl>
<p><abbr title="b">A</abbr></p>
```

::::::

:::::: compare

`````carve
> +
*[A]: b
text

A
`````

```html
<blockquote><p>text</p></blockquote>
<p><abbr title="b">A</abbr></p>
```

::::::

Under a host in a quote or an item the line is text, not a definition (CARVE-P12-026), so it is the visible line the `+` attaches.

:::::: compare

`````carve
> - +
> *[A]: b
> text

A
`````

```html
<blockquote>
  <ul>
    <li>*[A]: b
text</li>
  </ul>
</blockquote>
<p>A</p>
```

::::::

:::::: compare

`````carve
- x
  - +
  *[A]: b
  text

A
`````

```html
<ul>
  <li>x
    <ul>
      <li>*[A]: b
text</li>
    </ul>
  </li>
</ul>
<p>A</p>
```

::::::

Off the marker column the definition is itself the next line and refuses the `+`; it misses every frame and defines `A`.

:::::: compare

`````carve
- +
 *[A]: b
text

A
`````

```html
<ul>
  <li>+</li>
</ul>
<p>text</p>
<p><abbr title="b">A</abbr></p>
```

::::::
