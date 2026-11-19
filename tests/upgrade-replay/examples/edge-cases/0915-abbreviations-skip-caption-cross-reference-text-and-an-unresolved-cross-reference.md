---
page: edge-inline
---

## Abbreviations skip caption cross-reference text and an unresolved cross-reference

PART 9R R3 and R4 (carve#4742). The literal an unresolved cross-reference renders is source text and is not scanned for abbreviations.

:::::: compare

`````carve
*[A]: x

</#A>
`````

```html
<p>&lt;/#A&gt;</p>
```

::::::

A numbered caption's cross-reference link text is not scanned either; the caption itself still expands at its authored position.

:::::: compare

`````carve
*[A]: x

{#t}
| a |
^ A #: c

See </#t>.
`````

```html
<table id="t">
  <caption><abbr title="x">A</abbr> 1: c</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
<p>See <a href="#t">A 1</a>.</p>
```

::::::

The same holds for a figure caption referenced before it.

:::::: compare

`````carve
*[A]: x

See </#f>.

{#f}
![i](i.png)
^ A #: c
`````

```html
<p>See <a href="#f">A 1</a>.</p>
<figure id="f">
  <img src="i.png" alt="i">
  <figcaption><abbr title="x">A</abbr> 1: c</figcaption>
</figure>
```

::::::
