## A marker-line sublist stays open in a description body

The second inner marker joins the list opened on the description's marker line.

:::: compare

```carve
:: t
: - - a
    - b
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <ul>
          <li>a</li>
          <li>b</li>
        </ul>
      </li>
    </ul>
  </dd>
</dl>
```

::::
