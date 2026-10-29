## A wrapped attribute line interrupts like a one-line attribute line

A block attribute may span lines (PART 4, `block_attributes`), and a wrapped one is still one attribute line: at column 0 below a list item or description it closes the open paragraph and ends the container, exactly as `{.c}` on one line does (CARVE-P9-013 I5), and the block below takes its attributes.

A wrapped attribute line below an item paragraph closes it and reaches the fence below

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
  <li>a</li>
</ul>
<pre class="c"><code>y
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
  <li>a</li>
</ul>
<p class="c d">para</p>
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
    +
  </li>
</ul>
<pre class="c"><code>y
</code></pre>
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
  <dd>d</dd>
</dl>
<p class="c">para</p>
`````

:::::::
