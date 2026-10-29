## A column-zero marker below an open div attaches beside the div

A `+` at the item marker column ends an open colon div from the marker line. The next block at that column joins the item beside the div (markup-carve/carve#3406, markup-carve/carve#3421).

::::::: compare

````carve
- ::: d
+
tail
````

```html
<ul>
  <li>
    <div class="d">

    </div>
    tail
  </li>
</ul>
```

:::::::

::::::: compare

````carve
- - ::: d
  +
tail
````

```html
<ul>
  <li>
    <ul>
      <li>
        <div class="d">

        </div>
      </li>
    </ul>
    +
tail
  </li>
</ul>
```

:::::::

::::::: compare

````carve
1. ::: d
+
tail
````

```html
<ol>
  <li>
    <div class="d">

    </div>
    tail
  </li>
</ol>
```

:::::::

::::::: compare

````carve
- ::: d
  z
+
tail
````

```html
<ul>
  <li>
    <div class="d">
      <p>z</p>
    </div>
    tail
  </li>
</ul>
```

:::::::
