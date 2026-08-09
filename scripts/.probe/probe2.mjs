globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }
import { createDefaultState } from '../../src/lib/game/state.ts'
import { yieldMultiplier, growthMultiplier, sellMultiplier, rollUnits, effectiveCompost } from '../../src/lib/game/modifiers.ts'
import { worldseedYieldFactor } from '../../src/lib/game/worldseed.ts'
import { compostGain } from '../../src/lib/game/actions.ts'

const s = createDefaultState()
s.lifetimeEarned = 1e40
s.totalEarned = 1e40
console.log('compostGain @lifetime 1e40 =', compostGain(s))

const t = createDefaultState()
t.compost = 1e9
t.level = 40000
t.parcels = 120
t.starseed = 8000
t.starseedSpent = 0
t.worldResets = 400
console.log('worldseedYieldFactor(8000 starseed) =', worldseedYieldFactor(t))
console.log('yieldMultiplier =', yieldMultiplier(t))
console.log('growthMultiplier =', growthMultiplier(t))
console.log('sellMultiplier =', sellMultiplier(t))
console.log('rollUnits(Infinity) =', rollUnits(Infinity))
console.log('rollUnits(1e30 * yield) =', rollUnits(1e30 * yieldMultiplier(t)))
