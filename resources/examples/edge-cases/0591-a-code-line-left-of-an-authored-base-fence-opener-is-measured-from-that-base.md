## A code line left of an authored-base fence opener is measured from that base

A fence past the box content column establishes its own authored base. Payload left of that base loses its available prefix, while payload to the right keeps its extra spaces (CARVE-P0-004). The fence has no closer, so the box's `:::` is payload too, and `after` ends the fence, the box and the item. A fence at the box content column uses that column as its base.

:::: compare

````carve
- ::: box
     ```
    x
     y
  :::
after
````

```html
<ul>
  <li>
    <div class="box">
      <pre><code>x
y
:::
</code></pre>
    </div>
  </li>
</ul>
<p>after</p>
```

::::

:::: compare

````carve
- ::: box
     ```
       z
  :::
after
````

```html
<ul>
  <li>
    <div class="box">
      <pre><code>  z
:::
</code></pre>
    </div>
  </li>
</ul>
<p>after</p>
```

::::

A payload line below the item column ends the fence and the item (PART 0 S1).
The bare `:::` under the document paragraph that follows then opens a div
(§10 I1).

:::: compare

````carve
- ::: box
  ```
 x
  y
  :::
after
````

```html
<ul>
  <li>
    <div class="box">
      <pre><code></code></pre>
    </div>
  </li>
</ul>
<p>x
y</p>
<div>
  <p>after</p>
</div>
```

::::

The same authored base applies in a definition body.

:::: compare

````carve
:: t
: x

     ```
    a
     b
     ```
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>x</p>
    <pre><code>a
b
</code></pre>
  </dd>
</dl>
```

::::
