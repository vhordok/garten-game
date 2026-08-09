globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }
import { PLANTS } from '../../src/lib/data/plants.ts'
import { createDefaultState } from '../../src/lib/game/state.ts'
import { effectiveCycleSeconds, cycleFloorSeconds } from '../../src/lib/game/tick.ts'
import { growthMultiplier } from '../../src/lib/game/modifiers.ts'

const s = createDefaultState()
s.compost = 1e9          // erreichbar (siehe compostGain)
s.parcels = 60
s.level = 400000
s.worldResets = 60
s.upgrades = {}
console.log('growthMultiplier =', growthMultiplier(s).toExponential(3))
const near = PLANTS.filter(p => p.yield > 0 && p.growTime >= 20000 && p.growTime <= 80000)
  .sort((a,b)=>a.growTime-b.growTime)
for (const p of near) {
  const cyc = effectiveCycleSeconds(s, p, false)
  console.log(p.id.padEnd(22),'growTime',String(p.growTime).padStart(6),
    'Boden', String(cycleFloorSeconds(p)).padStart(2),
    'reale Reife', cyc.toFixed(4).padStart(10),'s',
    'Gold/s (roh)', ((p.yield*p.sellValue)/cyc).toExponential(3))
}
