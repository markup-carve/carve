## A bare dot starts a list after a blank line

After the blank, the bare-dot marker opens a decimal list. The paragraph above it does not absorb the first item.

:::: compare

```carve
Before.

. first
. second
```

```html
<p>Before.</p>
<ol>
  <li>first</li>
  <li>second</li>
</ol>
```

::::
