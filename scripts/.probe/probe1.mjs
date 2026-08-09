globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }
import { createDefaultState, getState, replaceState } from '../../src/lib/game/state.ts'
import { exportSave, importSave } from '../../src/lib/game/save.ts'
import { effectiveCompost, yieldMultiplier } from '../../src/lib/game/modifiers.ts'

const s = createDefaultState()
s.compost = 5e12
s.lifetimeEarned = 1e30
s.totalEarned = 1e30
replaceState(s)
console.log('vor  Speichern: compost =', getState().compost, 'effektiv =', effectiveCompost(getState()), 'yield =', yieldMultiplier(getState()))
const code = exportSave()
importSave(code)
console.log('nach Laden    : compost =', getState().compost, 'effektiv =', effectiveCompost(getState()), 'yield =', yieldMultiplier(getState()))
