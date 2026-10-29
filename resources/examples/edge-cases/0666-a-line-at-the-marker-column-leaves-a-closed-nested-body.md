## A line at the marker column leaves a closed nested body

After the definition body and its code fence end, the line at the item's
marker column belongs outside the list (PART 0 O2).

::: compare

````carve
  - :: term
    : definition
  
      ```
      code
      ```
  after
````

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>
        <p>definition</p>
        <pre><code>code
</code></pre>
      </dd>
    </dl>
  </li>
</ul>
<p>after</p>
```

````carve
    - :: term
      : definition
    
        ~~~
        code
        ~~~
    after
````

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>
        <p>definition</p>
        <pre><code>code
</code></pre>
      </dd>
    </dl>
  </li>
</ul>
<p>after</p>
```

:::
