## A wrapped attribute line interrupts like a one-line attribute line

A block attribute interrupts when every continuation carries its container prefixes, reaches the body column and passes the brace column. The historical short continuations below refuse, leaving only their opener literal (CARVE-P2-035, carve#5830).

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
}</p>
<pre><code>y
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
  <dd>d
{.c
}
para</dd>
</dl>
`````

:::::::
