---
page: edge-lists
---

## A nested unclosed fence keeps every blank line

PART 0 S2 and corpus 291 (carve#4437). A blank run below a fence that a marker line opens is the fence's payload at every nesting depth.

:::: compare

````carve
- - - ```
      x


    q
````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code>x


</code></pre>
          </li>
        </ul>
        <p>q</p>
      </li>
    </ul>
  </li>
</ul>
```

::::

:::: compare

````carve
- - - ```
      x



    q
````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code>x



</code></pre>
          </li>
        </ul>
        <p>q</p>
      </li>
    </ul>
  </li>
</ul>
```

::::

:::: compare

````carve
- - - - ```
        x


      q
````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <ul>
              <li>
                <pre><code>x


</code></pre>
              </li>
            </ul>
            <p>q</p>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

::::

:::: compare

````carve
- - - ```
      x


      y
````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code>x


y
</code></pre>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

::::

:::: compare

````carve
- a

  - - ```
      x


    q
````

```html
<ul>
  <li>a
    <ul>
      <li>
        <ul>
          <li>
            <pre><code>x


</code></pre>
          </li>
        </ul>
        <p>q</p>
      </li>
    </ul>
  </li>
</ul>
```

::::
