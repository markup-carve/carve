## Indented term ends with its unclosed host

A term past the div opener still opens a definition list. The flush-left description ends the list item after the term.

:::: compare

```carve
- a
  ::: box
   :: sub
: def
```

```html
<ul>
  <li>a
    <div class="box">
      <dl>
        <dt>sub</dt>
      </dl>
    </div>
  </li>
</ul>
<p>: def</p>
```

::::
