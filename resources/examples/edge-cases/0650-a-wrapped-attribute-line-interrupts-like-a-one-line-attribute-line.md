## A wrapped attribute line interrupts like a one-line attribute line

A block attribute may span lines (PART 4, `block_attributes`) only when its continuation passes the opening `{` column. The historical inputs below have column-0 continuations or closers. CARVE-P2-035 makes those runs paragraph text, while a deeper continuation still interrupts like a one-line attribute.

A refused wrapped run below an item paragraph stays text before the fence

::::::: compare

`````carve
- a
{.c
}
~~~
y
~~~
`````

`````html
<ul>
  <li>a
{.c
}</li>
</ul>
<pre><code>y
</code></pre>
`````

:::::::

A wrapped class list, the paragraph form

::::::: compare

`````carve
- a
{.c
.d}
para
`````

`````html
<ul>
  <li>a
{.c
.d}
para</li>
</ul>
`````

:::::::

Below a refused `+` under a stacked lead

::::::: compare

`````carve
- - ```
  +
{.c
}
~~~
y
~~~
`````

`````html
<ul>
  <li>
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
  </li>
</ul>
<p>{.c
}
~~~
y
~~~</p>
`````

:::::::

Below a description

::::::: compare

`````carve
:: t
: d
{.c
}
para
`````

`````html
<dl>
  <dt>t</dt>
  <dd>d
{.c
}
para</dd>
</dl>
`````

:::::::
