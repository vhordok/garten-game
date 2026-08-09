globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }
import { createDefaultState } from '../../src/lib/game/state.ts'
import { tick } from '../../src/lib/game/tick.ts'
import { PLANTS } from '../../src/lib/data/plants.ts'
import { UPGRADES } from '../../src/lib/data/upgrades.ts'

const p = PLANTS.filter(x => x.regrowTime).sort((a,b)=>a.regrowTime-b.regrowTime)[0]
console.log('Pflanze:', p.id, 'growTime', p.growTime, 'regrowTime', p.regrowTime)
const helper = UPGRADES.filter(u => ['autoHarvest','autoSell'].includes(u.effect))
function build() {
  const s = createDefaultState()
  s.parcels = 6; s.money = 0
  for (const u of helper) s.upgrades[u.id] = Math.min(u.maxLevel, 10)
  s.plots = Array.from({ length: 20 }, () => ({ plantId: p.id, progress: 0, waterLeft: 3, regrowing: false }))
  return s
}
const A = build(); tick(A, 8 * 3600)
const B = build(); for (let r = 8 * 3600; r > 0; r -= 60) tick(B, Math.min(60, r), { offline: true })
console.log('1×8h-Tick (Tab im Hintergrund): geerntet =', A.stats.harvested, 'Gold =', Math.round(A.money))
console.log('gechunkt 60 s (Tab geschlossen): geerntet =', B.stats.harvested, 'Gold =', Math.round(B.money))
