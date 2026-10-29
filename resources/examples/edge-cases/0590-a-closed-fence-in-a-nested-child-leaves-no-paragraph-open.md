## A closed fence in a nested child leaves no paragraph open

A closed child code block leaves no paragraph open. An unclosed fence at the enclosing item column opens there, and a column-zero line ends that item (CARVE-P0-014). A heading closes the child paragraph too. An open child paragraph does not keep the run either: the fence interrupts it and opens at the enclosing item column.

:::: compare

````carve
- a
    - child
      ```
      x
      ```
  ~~~
after
````

```html
<ul>
  <li>a
    <ul>
      <li>child
        <pre><code>x
</code></pre>
      </li>
    </ul>
    <pre><code></code></pre>
  </li>
</ul>
<p>after</p>
```

::::

:::: compare

````carve
> - a
>     - child
>       ```
>       x
>       ```
>   ~~~
after
````

```html
<blockquote>
  <ul>
    <li>a
      <ul>
        <li>child
          <pre><code>x
</code></pre>
        </li>
      </ul>
      <pre><code></code></pre>
    </li>
  </ul>
</blockquote>
<p>after</p>
```

::::

:::: compare

````carve
- a
    - # h
  ~~~
after
````

```html
<ul>
  <li>a
    <ul>
      <li>
        <h1 id="h">h</h1>
      </li>
    </ul>
    <pre><code></code></pre>
  </li>
</ul>
<p>after</p>
```

::::

:::: compare

````carve
- a
    - child
      text
  ~~~
after
````

```html
<ul>
  <li>a
    <ul>
      <li>child
text</li>
    </ul>
    <pre><code></code></pre>
  </li>
</ul>
<p>after</p>
```

::::
