## An unclosed nested fence keeps blanks before outer text

::: compare

```carve
- - ```


  tail
```

```html
<ul>
  <li>
    <ul>
      <li>
        <pre><code>

</code></pre>
      </li>
    </ul>
    <p>tail</p>
  </li>
</ul>
```

:::
