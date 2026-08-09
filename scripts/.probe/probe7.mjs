globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }
import { createDefaultState } from '../../src/lib/game/state.ts'
import { yieldMultiplier, rollUnits, masteryYieldBonus, specializationYieldBonus } from '../../src/lib/game/modifiers.ts'
import { PLANTS } from '../../src/lib/data/plants.ts'
import { harvestPlot } from '../../src/lib/game/actions.ts'
import { replaceState, getState } from '../../src/lib/game/state.ts'
import { CONFIG } from '../../src/lib/data/config.ts'

const t = createDefaultState()
t.compost = 1e9; t.level = 40000; t.parcels = 120; t.starseed = 8000; t.worldResets = 400
const p = PLANTS[PLANTS.length - 1]
t.plots = [{ plantId: p.id, progress: p.growTime, waterLeft: 0, regrowing: false }]
replaceState(t)
const ym = yieldMultiplier(t)
console.log('yieldMultiplier =', ym.toExponential(3))
console.log('roher Ernte-Term =', (p.yield * ym * CONFIG.critLegendaryMult * 2 * 2).toExponential(3))
const r = harvestPlot(0)
console.log('Ernte-Einheiten =', r.units, '| Lager =', getState().inventory[p.id], '| Geld =', getState().money)
