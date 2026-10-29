## A task item uses the ordered item column rule

:::: compare

```carve
* [ ] - :: t
      : a
      :: sibling
      tail
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> 
    <ul>
      <li>
        <dl>
          <dt>t</dt>
        </dl>
      </li>
    </ul>
    : a
    <dl>
      <dt>sibling
tail</dt>
    </dl>
  </li>
</ul>
```

::::

:::: compare

```carve
1000. - :: t
      : a
      :: sibling
      tail
```

```html
<ol start="1000">
  <li>
    <ul>
      <li>
        <dl>
          <dt>t</dt>
        </dl>
      </li>
    </ul>
    : a
    <dl>
      <dt>sibling
tail</dt>
    </dl>
  </li>
</ol>
```

::::
