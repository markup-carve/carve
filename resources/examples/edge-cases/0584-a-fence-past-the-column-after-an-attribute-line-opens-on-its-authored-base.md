## A fence past the column after an attribute line opens on its authored base

An attribute line is its own block; the following fence opens on its authored base (CARVE-P0-004). With no paragraph open, the unclosed fence starts a code block (CARVE-P0-014).

:::: compare

````carve
- t
  {.c}
   ````
  x
````

```html
<ul>
  <li>t
    <pre class="c"><code>x
</code></pre>
  </li>
</ul>
```

::::

:::: compare

````carve
- t
  {.c}
  %% c
   ````
  x
````

```html
<ul>
  <li>t
    <pre class="c"><code>x
</code></pre>
  </li>
</ul>
```

::::
