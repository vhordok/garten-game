globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }
import { PLANTS } from '../../src/lib/data/plants.ts'
import { createDefaultState } from '../../src/lib/game/state.ts'
import { effectiveCycleSeconds } from '../../src/lib/game/tick.ts'
import { growthMultiplier } from '../../src/lib/game/modifiers.ts'

const s = createDefaultState()
s.compost = 1e8
s.parcels = 60
s.level = 40000
s.worldResets = 30
console.log('growthMultiplier =', growthMultiplier(s).toExponential(3))
const rows = PLANTS.filter(p => p.yield > 0 && !p.beautyBonus)
  .sort((a,b)=>a.unlockAtTotalEarned-b.unlockAtTotalEarned)
  .slice(-14)
for (const p of rows) {
  const cyc = effectiveCycleSeconds(s, p, false)
  console.log(
    p.id.padEnd(22),
    'growTime', String(p.growTime).padStart(7),
    'reale Reife', cyc.toFixed(3).padStart(9), 's',
    'Wert/Zyklus', (p.yield*p.sellValue).toExponential(2),
    'Wert/s', ((p.yield*p.sellValue)/cyc).toExponential(2)
  )
}
