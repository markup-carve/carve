/** Compare each reader's original HTML with its reading of every formatted output. */
export function formatterRoundTripFailures(source, formatted, renderHtml, isError) {
  const original = renderHtml(source)
  const failures = []
  for (const [writer, text] of Object.entries(formatted)) {
    if (isError(text)) continue
    const reparsed = renderHtml(text)
    for (const [reader, before] of Object.entries(original)) {
      const after = reparsed[reader]
      if (isError(before) || isError(after) || before !== after) {
        failures.push({ writer, reader, before, after })
      }
    }
  }
  return failures
}
