## Nested plus below fence and description

These cases pin the owner selected by a continuation marker at a nested column (carve#3482).

The nested item keeps the block after its open fence

::::::: compare

`````carve
- - ```

  +
  x
`````

`````html
<ul>
  <li>
    <ul>
      <li>
        <pre><code>
</code></pre>
        x
      </li>
    </ul>
  </li>
</ul>
`````

:::::::

The outer item loosens while the nested item receives the quote

::::::: compare

`````carve
- a
  - ```
    x

  +
  > q
`````

`````html
<ul>
  <li><p>a</p>
    <ul>
      <li>
        <pre><code>x

</code></pre>
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
`````

:::::::

The nested description keeps the attached fence

::::::: compare

`````carve
:: t
:  d
   :: term
   :  detail
   +
   ```
   code
   ```
`````

`````html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <dl>
      <dt>term</dt>
      <dd>
        <p>detail</p>
        <pre><code>code
</code></pre>
      </dd>
    </dl>
  </dd>
</dl>
`````

:::::::
