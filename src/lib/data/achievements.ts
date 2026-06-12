import type { GameState } from '../game/types'

// Achievements: each unlocked badge grants +1 % permanent yield (see
// modifiers). Checks are cheap predicates over the state, evaluated in tick.

export interface AchievementDef {
  id: string
  name: string
  description: string
  check: (s: GameState) => boolean
}

const lifetime = (n: number) => (s: GameState) => s.lifetimeEarned >= n
const harvested = (n: number) => (s: GameState) => s.stats.harvested >= n
const planted = (n: number) => (s: GameState) => s.stats.planted >= n
const sold = (n: number) => (s: GameState) => s.stats.sold >= n
const crits = (n: number) => (s: GameState) => s.stats.crits >= n
const level = (n: number) => (s: GameState) => s.level >= n
const parcels = (n: number) => (s: GameState) => s.parcels >= n
const combo = (n: number) => (s: GameState) => s.combo.count >= n
const streak = (n: number) => (s: GameState) => s.questStreak >= n

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'gruener-daumen', name: 'Grüner Daumen', description: '50× gesät', check: planted(50) },
  { id: 'plantage', name: 'Plantage', description: '5.000× gesät', check: planted(5000) },
  { id: 'erste-ernte', name: 'Erste Körbe', description: '100 Einheiten geerntet', check: harvested(100) },
  { id: 'erntedank', name: 'Erntedank', description: '10.000 Einheiten geerntet', check: harvested(10000) },
  { id: 'erntemaschine', name: 'Erntemaschine', description: '1 Million Einheiten geerntet', check: harvested(1e6) },
  { id: 'marktschreier', name: 'Marktschreier', description: '1.000 Einheiten verkauft', check: sold(1000) },
  { id: 'grosshaendler', name: 'Großhändler', description: '100.000 Einheiten verkauft', check: sold(100000) },
  { id: 'erster-tausender', name: 'Erster Tausender', description: '1K Gold verdient', check: lifetime(1000) },
  { id: 'goldgrube', name: 'Goldgrube', description: '1M Gold verdient', check: lifetime(1e6) },
  { id: 'tycoon', name: 'Garten-Tycoon', description: '1B Gold verdient', check: lifetime(1e9) },
  { id: 'imperium', name: 'Imperium', description: '1T Gold verdient', check: lifetime(1e12) },
  { id: 'glueckspilz', name: 'Glückspilz', description: '10 goldene Ernten', check: crits(10) },
  { id: 'vergoldet', name: 'Vergoldet', description: '250 goldene Ernten', check: crits(250) },
  { id: 'kettenglied', name: 'Kettenglied', description: 'Ernte-Kette ×10', check: combo(10) },
  { id: 'kettenblitz', name: 'Kettenblitz', description: 'Ernte-Kette ×25', check: combo(25) },
  { id: 'aufsteiger', name: 'Aufsteiger', description: 'Gärtner-Level 5', check: level(5) },
  { id: 'meistergaertner', name: 'Meistergärtner', description: 'Gärtner-Level 15', check: level(15) },
  { id: 'legende', name: 'Garten-Legende', description: 'Gärtner-Level 40', check: level(40) },
  { id: 'landbesitzer', name: 'Landbesitzer', description: 'Parzelle 2 gepachtet', check: parcels(2) },
  { id: 'grossgrundbesitz', name: 'Großgrundbesitz', description: 'Parzelle 5 gepachtet', check: parcels(5) },
  { id: 'latifundium', name: 'Latifundium', description: 'Parzelle 10 gepachtet', check: parcels(10) },
  { id: 'lieferheld', name: 'Lieferheld', description: 'Lieferserie ×10', check: streak(10) },
]

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}
