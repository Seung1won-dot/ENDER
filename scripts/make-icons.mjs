import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8')
mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true })

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]

for (const [name, size] of targets) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(new URL(`../public/icons/${name}`, import.meta.url), png)
  console.log('wrote', name, size)
}
