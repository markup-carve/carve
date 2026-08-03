/*
 * Where the sibling engine checkouts live.
 *
 * Shared so a second differential runner cannot drift from the first about
 * which directory "the php engine" means. Both honor the same env vars, which
 * is how CI points at checkouts that are not siblings.
 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))

export const rustDir = () => process.env.CARVE_RS_DIR ?? resolve(root, '../carve-rs')
export const phpDir = () => process.env.CARVE_PHP_DIR ?? resolve(root, '../carve-php')
