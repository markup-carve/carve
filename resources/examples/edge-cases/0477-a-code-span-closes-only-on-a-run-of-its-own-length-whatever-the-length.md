## A code span closes only on a run of its own length, whatever the length

The opener is a maximal backtick run and the closer is a maximal run of the same
count (PART 3 `code_span`), for a run of any length. A run of another length
inside the span is content, and a run the span cannot close on leaves it open to
the end of the block (markup-carve/carve#2144).

::::: compare

`````carve
a ````b```` c
`````

```html
<p>a <code>b</code> c</p>
```

:::::

::::: compare

`````carve
a ````b``` c
`````

```html
<p>a <code>b``` c</code></p>
```

:::::

::::: compare

`````carve
a ````b```c```` d
`````

```html
<p>a <code>b```c</code> d</p>
```

:::::

::::: compare

`````carve
a `b``c` d
`````

```html
<p>a <code>b``c</code> d</p>
```

:::::

::::: compare

`````carve
a ````````b```````` c
`````

```html
<p>a <code>b</code> c</p>
```

:::::

The same pairing holds wherever a code span is skipped whole: inside a forced
span, in a substitution or an insertion, and in an image's alt text, where it
decides whether a caption line below finds its image.

::::: compare

`````carve
{*a ````b```` c*} d
`````

```html
<p><strong>a <code>b</code> c</strong> d</p>
```

:::::

::::: compare

`````carve
{~a ````~>```` b~>c~} d
`````

```html
<p><del>a <code>~&gt;</code> b</del><ins>c</ins> d</p>
```

:::::

::::: compare

`````carve
{~a ````~}```` b~>c~} d
`````

```html
<p><del>a <code>~}</code> b</del><ins>c</ins> d</p>
```

:::::

::::: compare

`````carve
{+a ````+}```` b+} c
`````

```html
<p><ins>a <code>+}</code> b</ins> c</p>
```

:::::

::::: compare

`````carve
![a ````]```` b](i)
^ cap
`````

```html
<figure>
  <img src="i" alt="a ````]```` b">
  <figcaption>cap</figcaption>
</figure>
```

:::::
