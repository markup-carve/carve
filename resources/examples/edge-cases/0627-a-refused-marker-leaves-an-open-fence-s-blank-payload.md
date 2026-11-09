## A refused marker leaves an open fence's blank payload

A refused `+` renders nothing and keeps the item's ownership. It ends an open fence at the item's marker column, so a following content-column line is a new item paragraph (carve#5637). A `+` at the fence content column stays payload (markup-carve/carve#3400, markup-carve/carve#3421).

::::::: compare

````carve
- ```
+
  x
````

```html
<ul>
  <li>
    <pre><code></code></pre>
    x
  </li>
</ul>
```

:::::::

::::::: compare

````carve
- ```
+

  x
````

```html
<ul>
  <li>
    <pre><code></code></pre>
    <p>x</p>
  </li>
</ul>
```

:::::::

::::::: compare

````carve
- ```
  a
+
  x
````

```html
<ul>
  <li>
    <pre><code>a
</code></pre>
    x
  </li>
</ul>
```

:::::::

::::::: compare

````carve
- ```
  x
+

tail
````

```html
<ul>
  <li>
    <pre><code>x
</code></pre>
  </li>
</ul>
<p>tail</p>
```

:::::::

::::::: compare

````carve
- - ```
  +

tail
````

```html
<ul>
  <li>
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::::::

::::::: compare

````carve
- ```
+

tail
````

```html
<ul>
  <li>
    <pre><code></code></pre>
  </li>
</ul>
<p>tail</p>
```

:::::::

::::::: compare

````carve
- ```=html
  x
+

tail
````

```html
<ul>
  <li>
    x
  </li>
</ul>
<p>tail</p>
```

:::::::
