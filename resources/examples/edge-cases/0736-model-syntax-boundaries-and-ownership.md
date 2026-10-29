## Model syntax boundaries and ownership

:::: compare

```carve
::: e[]
```

```html
<div class="e">

</div>
```

::::

:::: compare

```carve
> u
+
# H
-
```

```html
<blockquote>
  <p>u</p>
  <h1 id="H">H</h1>
</blockquote>
<p>-</p>
```

::::

:::: compare

```carve
||
|-|
|-|
```

```html
<table>
  <thead>
    <tr><th scope="col"></th></tr>
  </thead>
  <tbody>
    <tr><td>-</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
- 	- B
```

```html
<ul>
  <li>- B</li>
</ul>
```

::::

:::: compare

```carve
{x} {k}
a
```

```html
<p>{x} {k}
a</p>
```

::::

:::: compare

```carve
- {{ c@code }}
```

```html
<ul>
  <li>{{ c@code }}</li>
</ul>
```

::::
