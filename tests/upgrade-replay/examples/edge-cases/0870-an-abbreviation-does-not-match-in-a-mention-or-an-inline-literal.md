---
page: edge-inline
---

## An abbreviation does not match in a mention or an inline literal

PART 9R R3 (carve#4560). The text of a code span, an inline literal and a mention is not scanned for abbreviations.

:::::: compare

`````carve
*[A]: x

@A and !`A` and `A`
`````

```html
<p><span class="mention"><strong>@A</strong></span> and A and <code>A</code></p>
```

::::::

:::::: compare

`````carve
*[A]: x

!`A`{.c} and A
`````

```html
<p><span class="c">A</span> and <abbr title="x">A</abbr></p>
```

::::::

:::::: compare

`````carve
*[AB]: x

# @AB and !`AB`
`````

```html
<section id="AB-and-AB">
  <h1><span class="mention"><strong>@AB</strong></span> and AB</h1>
</section>
```

::::::

:::::: compare

`````carve
*[A]: x

| @A | !`A B` | A |
`````

```html
<table>
  <tbody>
    <tr><td><span class="mention"><strong>@A</strong></span></td><td>A B</td><td><abbr title="x">A</abbr></td></tr>
  </tbody>
</table>
```

::::::

:::::: compare

`````carve
*[A]: x

> q !`A`
^ cap @A A
`````

```html
<figure>
  <blockquote><p>q A</p></blockquote>
  <figcaption>cap <span class="mention"><strong>@A</strong></span> <abbr title="x">A</abbr></figcaption>
</figure>
```

::::::
