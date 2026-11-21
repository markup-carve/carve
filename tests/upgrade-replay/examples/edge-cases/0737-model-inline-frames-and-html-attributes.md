## Model inline frames and HTML attributes

:::: compare

```carve
[a](/u){href=/v}
```

```html
<p><a href="/u">a</a></p>
```

::::

:::: compare

```carve
![a](/u){src=/v}
```

```html
<img src="/u" alt="a">
```

::::

:::: compare

```carve
=>g=
```

```html
<p>=&gt;g=</p>
```

::::

:::: compare

```carve
[[][]]()
```

```html
<p><a href="">[][]</a></p>
```

::::

:::: compare

```carve
::: footnotes
x
y
```

```html
<div class="footnotes">
  <p>x
y</p>
</div>
```

::::

:::: compare

```carve
{{ d @lines:0 }}*a*
```

```html
<p>{{ d @lines:0 }}<strong>a</strong></p>
```

::::
