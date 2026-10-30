---
page: edge-inline
---

## A token inside a literal include directive opens nothing

A directive invalid on its face has no inline parse of its tokens (CARVE-P6-001), so its backtick opens no code span and the pair around it forms.

::::::: compare

````carve
*{{ `@lines:1 }}ter*
````

````html
<p><strong>{{ `@lines:1 }}ter</strong></p>
````

:::::::
