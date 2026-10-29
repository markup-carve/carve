## Nested item looseness does not propagate to the outer item

A post-blank block attached to a nested (inner) item loosens only that inner item; the outer item stays tight (§17). Looseness is decided per level - a descendant's blank never counts toward an ancestor.

::: compare

```carve
- a
  - b

    > q
```

```html
<ul>
  <li>a
    <ul>
      <li>b
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::

The sibling-blank invariant: a blank between the inner items loosens the inner list but leaves the outer item tight - the same non-propagation.

::: compare

```carve
- a
  - b

  - c
```

```html
<ul>
  <li>a
    <ul>
      <li><p>b</p></li>
      <li><p>c</p></li>
    </ul>
  </li>
</ul>
```

:::

The content-column threshold follows the marker, so a task item's nested block behaves the same.

::: compare

```carve
- [ ] a
  - b

    > q
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="a"> a
    <ul>
      <li>b
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::

An item's own second paragraph after a blank still loosens it - non-propagation removes only the upward leak, not legitimate same-level looseness.

::: compare

```carve
- a

  b
```

```html
<ul>
  <li><p>a</p>
    <p>b</p>
  </li>
</ul>
```

:::
