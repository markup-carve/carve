## A fence closer outside the child folds and leaves the child open

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
  </li>
</ul>
<pre><code>
    tail
</code></pre>
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
- outer
  - head
     ```
     a
  ```

    tail

    more
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

  more
</code></pre>
  </li>
</ul>
```

:::::::

::::::: compare

````carve
- outer
  - head
     ~~~
     a
 ~~~

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
  </li>
</ul>
<pre><code>
   tail
</code></pre>
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
  </li>
</ul>
<pre><code>
  tail
</code></pre>
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
  </li>
</ul>
<pre><code>
 tail
</code></pre>
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
  <li><p>outer</p>
    <ul>
      <li>head
        <pre><code>a
</code></pre>
      </li>
    </ul>
    <p>tail</p>
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
  ```

  tail
`````

````html
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
````

:::::::

::::::: compare

`````carve
- outer
  - head
     ````
     a
  ```

    tail
`````

````html
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
````

:::::::
