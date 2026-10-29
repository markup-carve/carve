## A lazily folded fence opener line does not keep a list tight

Folded fence variant 1

::: compare

````carve
- - text
  ```
  x

  cap
- c
````

```html
<ul>
  <li>
    <ul>
      <li>text</li>
    </ul>
    <pre><code>x

cap
</code></pre>
  </li>
  <li>c</li>
</ul>
```

:::

Folded fence variant 2

::: compare

````carve
- - text
  ~~~
  x

  cap
- c
````

```html
<ul>
  <li>
    <ul>
      <li>text</li>
    </ul>
    <pre><code>x

cap
</code></pre>
  </li>
  <li>c</li>
</ul>
```

:::

Folded fence variant 3

::: compare

````carve
- - text
  ![i](x.png)
  x

  cap
- c
````

```html
<ul>
  <li>
    <ul>
      <li>text
<img src="x.png" alt="i">
x</li>
    </ul>
    <p>cap</p>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

Folded fence variant 4

::: compare

````carve
- - text
  ```
  x
  cap
- c
````

```html
<ul>
  <li>
    <ul>
      <li>text</li>
    </ul>
    <pre><code>x
cap
</code></pre>
  </li>
  <li>c</li>
</ul>
```

:::
