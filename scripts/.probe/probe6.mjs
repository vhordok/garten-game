globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }
import { createDefaultState, getState, replaceState } from '../../src/lib/game/state.ts'
import { exportSave, importSave } from '../../src/lib/game/save.ts'

const s = createDefaultState()
s.money = Infinity
s.inventory = { basilikum: Infinity }
s.lifetimeEarned = Infinity
replaceState(s)
console.log('JSON von Infinity-Geld:', JSON.stringify({ money: Infinity }))
importSave(exportSave())
console.log('nach Reload: money =', getState().money, ' inventory =', JSON.stringify(getState().inventory), ' lifetimeEarned =', getState().lifetimeEarned)
