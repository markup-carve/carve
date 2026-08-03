/**
 * Share links for the playground.
 *
 * A playground document round-trips through the URL fragment, so a link is
 * bookmarkable and sendable without a server: the fragment never leaves the
 * browser, which also keeps the source out of request logs and out of
 * VitePress's router (we write it with history.replaceState).
 *
 * Encoding: JSON -> UTF-8 -> deflate-raw -> base64url, carried as `#s=`.
 * Where CompressionStream is unavailable the same JSON goes in uncompressed as
 * `#p=`, so an older browser still reads and writes links, just longer ones.
 * Decoding accepts either key regardless of what this browser would produce.
 */

const KEY_DEFLATED = 's'
const KEY_PLAIN = 'p'

/** Encoded-fragment ceiling. Browsers and chat clients truncate long URLs at
 *  wildly different points; past this a link is more likely to arrive broken
 *  than to work, so the caller is told rather than handed a lie. */
export const MAX_ENCODED_LENGTH = 16000

function toBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function through(bytes, stream) {
  const writer = stream.writable.getWriter()
  void writer.write(bytes)
  void writer.close()
  const chunks = []
  let total = 0
  const reader = stream.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
  }
  const out = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    out.set(chunk, at)
    at += chunk.length
  }
  return out
}

const canCompress = () => typeof CompressionStream === 'function'
const canDecompress = () => typeof DecompressionStream === 'function'

/**
 * Encode a playground state into a URL fragment (without the leading `#`).
 * Returns null when the result is too long to be a usable link.
 */
export async function encodeShare(state) {
  const payload = JSON.stringify({ v: 1, ...state })
  const bytes = new TextEncoder().encode(payload)
  if (canCompress()) {
    const deflated = await through(bytes, new CompressionStream('deflate-raw'))
    const encoded = `${KEY_DEFLATED}=${toBase64Url(deflated)}`
    return encoded.length > MAX_ENCODED_LENGTH ? null : encoded
  }
  const encoded = `${KEY_PLAIN}=${toBase64Url(bytes)}`
  return encoded.length > MAX_ENCODED_LENGTH ? null : encoded
}

/**
 * Decode a fragment back into a playground state, or null if it carries no
 * share payload.
 *
 * A malformed payload is not an error the visitor can act on, so it decodes to
 * null and the playground opens on its default document. Throwing here would
 * take the page down over a truncated link.
 */
export async function decodeShare(fragment) {
  const params = new URLSearchParams((fragment ?? '').replace(/^#/, ''))
  const deflated = params.get(KEY_DEFLATED)
  const plain = params.get(KEY_PLAIN)
  if (deflated === null && plain === null) return null
  try {
    let bytes
    if (deflated !== null) {
      if (!canDecompress()) return null
      bytes = await through(fromBase64Url(deflated), new DecompressionStream('deflate-raw'))
    } else {
      bytes = fromBase64Url(plain)
    }
    const state = JSON.parse(new TextDecoder().decode(bytes))
    if (state === null || typeof state !== 'object') return null
    if (typeof state.source !== 'string') return null
    // The fragment is attacker-supplied: read the fields we know and ignore
    // everything else, rather than spreading a decoded object into app state.
    return { source: state.source, engine: state.engine === 'rust' ? 'rust' : 'js' }
  } catch {
    return null
  }
}
