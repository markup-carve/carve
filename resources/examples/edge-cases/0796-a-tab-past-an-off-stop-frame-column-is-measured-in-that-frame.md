## A tab past an off-stop frame column is measured in that frame

Each frame strips indentation up to its content column, and the rest of the run is walked again from there (PART 0 S2, PART 9 §24 C5, carve#4085). Two spaces and a tab under `- 1. a` reach column 4 in the `-` item's body, past `1.`'s content column 3 there, so the fence belongs to `1.`. Read from the start of the line, the same run stops at column 4, short of column 5.

::: compare

```carve
- 1. a
  	```
  	x
  	```
```

```html
<ul>
  <li>
    <ol>
      <li>a
        <pre><code>x
</code></pre>
      </li>
    </ol>
  </li>
</ul>
```

:::

::: compare

```carve
- - 10. a

  	  b
```

```html
<ul>
  <li>
    <ul>
      <li>
        <ol start="10">
          <li><p>a</p>
            <p>b</p>
          </li>
        </ol>
      </li>
    </ul>
  </li>
</ul>
```

:::
