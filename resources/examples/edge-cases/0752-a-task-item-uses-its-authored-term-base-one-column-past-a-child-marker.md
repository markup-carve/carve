## A task item uses its authored term base one column past a child marker

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
          <dt>t
: a</dt>
        </dl>
      </li>
    </ul>
    <dl>
      <dt>sibling
tail</dt>
    </dl>
  </li>
</ul>
```

::::
