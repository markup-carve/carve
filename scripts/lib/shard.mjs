export function parseShard(value) {
  if (value === undefined) return { index: 0, total: 1 }
  const match = value.match(/^(\d+)\/(\d+)$/)
  if (!match) throw new Error(`Invalid --shard=${value}. Use --shard=INDEX/TOTAL, with INDEX starting at 0.`)
  const index = Number(match[1])
  const total = Number(match[2])
  if (total < 1 || index >= total) {
    throw new Error(`Invalid --shard=${value}. INDEX must be between 0 and TOTAL-1, and TOTAL must be positive.`)
  }
  return { index, total }
}

export function selectShard(values, { index, total }) {
  return values.filter((_, position) => position % total === index)
}
