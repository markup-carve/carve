## A line block behind nested markers takes a lazy line after a fence-shaped payload

A line block's payload is inline content whatever its shape, so a nested
item whose line block ends in a fence-shaped line still takes the lazy line
below it (carve#4661).

::: compare

````carve
- - ::: |
    ~~~
b
````

```html
<ul>
  <li>
    <ul>
      <li>
        <div class="line-block">
          <p>~~~<br>
b</p>
        </div>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

````carve
- 1. ::: |
     ~~~~ js
b
c
````

```html
<ul>
  <li>
    <ol>
      <li>
        <div class="line-block">
          <p>~~~~ js<br>
b<br>
c</p>
        </div>
      </li>
    </ol>
  </li>
</ul>
```

:::

::: compare

````carve
- - - ::: |
      ~~~
      x
b
````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <div class="line-block">
              <p>~~~<br>
x<br>
b</p>
            </div>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

````carve
- a
  - - ::: |
      ~~~
b
````

```html
<ul>
  <li>a
    <ul>
      <li>
        <ul>
          <li>
            <div class="line-block">
              <p>~~~<br>
b</p>
            </div>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

````carve
- - ::: |
    - ~~~
    x
b
````

```html
<ul>
  <li>
    <ul>
      <li>
        <div class="line-block">
          <p>- ~~~<br>
x<br>
b</p>
        </div>
      </li>
    </ul>
  </li>
</ul>
```

:::
