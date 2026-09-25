/*
 * The two message strings carve#2267's clause pins for a REFUSED `style`
 * declaration inside bytes kept whole under `raw-preserved`.
 *
 * The clause quotes the text up to the element's tag and says nothing about the
 * trailing `in the raw HTML ... is kept as` clause every preserved row carries,
 * so the pinned text is a PREFIX: the new subject slotted into the existing row
 * shape. Reading it as an entire message would give `style` a shape of its own,
 * which is what the clause's first sentence removes.
 *
 * It lives here rather than inline in the gate because it had no test while it
 * was inline, and it was anchored `$` straight after the tag - matching only a
 * message no engine emits (carve-php#2368).
 */
export const RULED_STYLE_MESSAGE =
  /^Preserved style with (?:a denied URL scheme in a declaration value|a construct the CSS sanitizer refuses) on <[a-z][a-z0-9]*>(?:\s|$)/

export const isRuledStyleRow = (d) =>
  d.code === 'attribute-preserved' && RULED_STYLE_MESSAGE.test(d.message)
