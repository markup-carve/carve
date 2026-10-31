---
page: edge-inline
---

## An abbreviation expansion is not scanned again

PART 9R R3 (carve#4556). A term matches in rendered text, in one pass. Its expansion, the markup around it, entity names and raw output are not text.

:::::: compare

`````carve
*[A]: x
*[x]: y onmouseover=alert(1) z

A
`````

```html
<p><abbr title="x">A</abbr></p>
```

::::::

:::::: compare

`````carve
*[A]: x
*[title]: y

A
`````

```html
<p><abbr title="x">A</abbr></p>
```

::::::

:::::: compare

`````carve
*[A]: B
*[B]: C
*[C]: A

A B C
`````

```html
<p><abbr title="B">A</abbr> <abbr title="C">B</abbr> <abbr title="A">C</abbr></p>
```

::::::

:::::: compare

`````carve
*[amp]: x

a & amp
`````

```html
<p>a &amp; <abbr title="x">amp</abbr></p>
```

::::::

:::::: compare

`````carve
*[gt]: x

a > b
`````

```html
<p>a &gt; b</p>
```

::::::

:::::: compare

`````carve
*[A]: x

```=html
<script>var A=1</script>
```
`````

```html
<script>var A=1</script>
```

::::::

:::::: compare

`````carve
*[A]: x

`A<b>`{=html} A
`````

```html
<p>A<b> <abbr title="x">A</abbr></p>
```

::::::

:::::: compare

`````carve
*[A]: x

```=html
<code>
```

A
`````

```html
<code>
<p><abbr title="x">A</abbr></p>
```

::::::

:::::: compare

`````carve
*[A]: x

```=html
</pre>
```

```
A
```
`````

```html
</pre>
<pre><code>A
</code></pre>
```

::::::
