import type { UpgradeDef } from '../game/types'

// Upgrade content/balance (GAME_DESIGN.md §9.4): small capped tiers with a
// steep per-level curve — the money sink after plot 16. Game logic only
// references ids and effects.
export const UPGRADES: UpgradeDef[] = [
  {
    id: 'giesskanne',
    name: 'Gießkanne',
    sprite: 'giesskanne',
    description: 'Besser gewässert wächst alles schneller.',
    effect: 'growth',
    perLevel: 0.1,
    maxLevel: 10,
    baseCost: 150,
    costFactor: 1.9,
  },
  {
    // id kept for save compatibility; renamed to avoid clashing with the
    // turbo-fertilizer charges from scratch tickets
    id: 'duenger',
    name: 'Kompost',
    sprite: 'duenger',
    description: 'Nährstoffreicher Boden — dauerhaft größere Ernte.',
    effect: 'yield',
    perLevel: 0.1,
    maxLevel: 10,
    baseCost: 400,
    costFactor: 1.9,
  },
  {
    id: 'marktstand',
    name: 'Marktstand',
    sprite: 'marktstand',
    description: 'Bessere Kontakte, bessere Preise.',
    effect: 'sellPrice',
    perLevel: 0.1,
    maxLevel: 10,
    baseCost: 1000,
    costFactor: 1.9,
  },
]

const byId = new Map(UPGRADES.map((u) => [u.id, u]))

export function upgradeById(id: string): UpgradeDef | undefined {
  return byId.get(id)
}
