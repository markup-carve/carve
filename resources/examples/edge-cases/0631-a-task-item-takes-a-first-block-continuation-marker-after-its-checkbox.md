## A task item takes a first-block continuation marker after its checkbox

The task-item opener is a block opener, so a bare `+` after its checkbox attaches the next column-0 block; stacked openers give that block to the innermost item (markup-carve/carve#3421). Text after `+` remains item text.

::::::: compare

`````carve
- [ ] +
```
code
```
`````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> 
    <pre><code>code
</code></pre>
  </li>
</ul>
```

:::::::
::::::: compare

`````carve
- [x] +
> quote
`````

```html
<ul class="task-list">
  <li data-task-state="x"><input type="checkbox" checked disabled> 
    <blockquote><p>quote</p></blockquote>
  </li>
</ul>
```

:::::::
::::::: compare

`````carve
- [ ] + text
`````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="+ text"> + text</li>
</ul>
```

:::::::
::::::: compare

`````carve
- - [ ] +
```
code
```
`````

```html
<ul>
  <li>
    <ul class="task-list">
      <li><input type="checkbox" disabled> 
        <pre><code>code
</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

:::::::
