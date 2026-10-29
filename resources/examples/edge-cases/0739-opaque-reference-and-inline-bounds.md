## Opaque reference and inline bounds

:::: compare

```carve
[x][m]
*[m]: y
```

```html
<p>[x][m]</p>
```

::::

:::: compare

```carve
![x][m]
*[m]: y
```

```html
<p>![x][m]</p>
```

::::

:::: compare

```carve
see [m] here
*[m]: y
```

```html
<p>see [<abbr title="y">m</abbr>] here</p>
```

::::

:::: compare

```carve
|\|	
```

```html
<table>
  <tbody>
    <tr><td>|</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
{+`{#+}#}
```

```html
<p>{+<code>{#+}#}</code></p>
```

::::

:::: compare

```carve
_*x
/*b*/
```

```html
<p>_<strong>x
/*b</strong>/</p>
```

::::

:::: compare

```carve
>  
```

```html
<blockquote><p> </p></blockquote>
```

::::

:::: compare

```carve
>  
```

```html
<blockquote><p> </p></blockquote>
```

::::

:::: compare

```carve
$$`x
^ p
```

```html
<figure>
  <p><span class="math display" role="math">\[x\]</span></p>
  <figcaption>p</figcaption>
</figure>
```

::::
