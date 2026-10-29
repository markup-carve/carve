## A fence run folded into a child paragraph loosens the outer item when it closes at the outer column

::::::: compare

````carve
- outer
  - head
     ```
     a
  ```

  tail
````

```html
<ul>
  <li>outer
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
tail
</code></pre>
  </li>
</ul>
```

:::::::

::::::: compare

`````carve
- outer
  - head
     ````
     a
  ````

  tail
`````

```html
<ul>
  <li>outer
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
tail
</code></pre>
  </li>
</ul>
```

:::::::

::::::: compare

````carve
1. outer
   - head
      ```
      a
   ```

   tail
````

```html
<ol>
  <li>outer
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
tail
</code></pre>
  </li>
</ol>
```

:::::::

::::::: compare

````carve
> - outer
>   - head
>      ```
>      a
>   ```
>
>   tail
````

```html
<blockquote>
  <ul>
    <li>outer
      <ul>
        <li>head
          <pre><code>a
</code></pre>
        </li>
      </ul>
      <pre><code>
tail
</code></pre>
    </li>
  </ul>
</blockquote>
```

:::::::

::::::: compare

````carve
- outer
  - head
    more
    ```
    a
   ```

  tail
````

```html
<ul>
  <li>outer
    <ul>
      <li>head
more
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
tail
</code></pre>
  </li>
</ul>
```

:::::::

::::::: compare

````carve
- outer
  - head
     ```
     a
  ```

    tail
````

```html
<ul>
  <li>outer
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <pre><code>
  tail
</code></pre>
  </li>
</ul>
```

:::::::
