import type { PlantDef } from '../game/types'

// All plant content/balance lives here — game logic only references ids.
// Balance rule of thumb (GAME_DESIGN.md §3): slower plants earn more profit
// per second, faster plants cost more clicks per minute.
export const PLANTS: PlantDef[] = [
  {
    id: 'basilikum',
    name: 'Basilikum',
    emoji: '🌿',
    category: 'kraeuter',
    description: 'Wächst rasend schnell — das Brot-und-Butter-Kraut für den Start.',
    seedCost: 1,
    growTime: 8,
    yield: 1,
    sellValue: 3,
    unlockAtTotalEarned: 0,
  },
  {
    id: 'minze',
    name: 'Minze',
    emoji: '🍃',
    category: 'kraeuter',
    description: 'Braucht etwas Geduld, liefert dafür doppelte Ernte.',
    seedCost: 8,
    growTime: 30,
    yield: 2,
    sellValue: 9,
    unlockAtTotalEarned: 75,
  },
  {
    id: 'lavendel',
    name: 'Lavendel',
    emoji: '🪻',
    category: 'kraeuter',
    description: 'Edel und langsam — der beste Verdienst pro Beet.',
    seedCost: 40,
    growTime: 120,
    yield: 3,
    sellValue: 35,
    unlockAtTotalEarned: 400,
  },
]

const byId = new Map(PLANTS.map((p) => [p.id, p]))

export function plantById(id: string): PlantDef | undefined {
  return byId.get(id)
}
