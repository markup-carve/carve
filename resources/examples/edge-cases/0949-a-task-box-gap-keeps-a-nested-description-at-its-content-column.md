---
page: edge-lists
---

## A task box gap keeps a nested description at its content column

The space after the task box moves the marker-line child one column right. Its description at that child's content column joins the term (PART 0 S2 and S3, CARVE-P0-008, carve#5061).

::: compare

```carve
- [?]  - :: t
         : a
```

```html
<ul class="task-list">
  <li data-task-state="?"><input type="checkbox" disabled> 
    <ul>
      <li>
        <dl>
          <dt>t</dt>
          <dd>a</dd>
        </dl>
      </li>
    </ul>
  </li>
</ul>
```

:::

A wider gap and a second term keep both descriptions in the child.

::: compare

```carve
- [x]   - :: term
           : desc
           :: next
           : body
```

```html
<ul class="task-list">
  <li data-task-state="x"><input type="checkbox" checked disabled> 
    <ul>
      <li>
        <dl>
          <dt>term</dt>
          <dd>desc</dd>
          <dt>next</dt>
          <dd>body</dd>
        </dl>
      </li>
    </ul>
  </li>
</ul>
```

:::
