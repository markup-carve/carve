## A task item takes a first-block continuation marker after its checkbox

The task-item opener is a block opener, so a bare `+` after its checkbox attaches a block at the item's marker column. A stacked item's marker column is not column 0, so the last pair is refused (markup-carve/carve#3421, carve#4409). Text after `+` remains item text.

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
      <li><input type="checkbox" disabled aria-label="+"> +</li>
    </ul>
  </li>
</ul>
<pre><code>code
</code></pre>
```

:::::::
