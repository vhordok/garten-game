// Quest-board flavor & tier balance: who orders, and how juicy the order is.

export type QuestTier = 'bronze' | 'silber' | 'gold'

export interface QuestTierDef {
  id: QuestTier
  label: string
  weight: number
  /** reward = market value × this factor */
  rewardFactor: number
  /** gold orders drop a scratch ticket on delivery */
  bonusTicket: boolean
}

export const QUEST_TIERS: QuestTierDef[] = [
  { id: 'bronze', label: 'Bronze', weight: 50, rewardFactor: 1.3, bonusTicket: false },
  { id: 'silber', label: 'Silber', weight: 35, rewardFactor: 1.6, bonusTicket: false },
  { id: 'gold', label: 'Gold', weight: 15, rewardFactor: 2.0, bonusTicket: true },
]

export function questTier(id: string): QuestTierDef {
  return QUEST_TIERS.find((t) => t.id === id) ?? QUEST_TIERS[0]
}

/** Cozy night-market regulars placing the orders. */
export const QUEST_CLIENTS = [
  'Igel-Café',
  'Bäckerei Vollkorn',
  'Restaurant Mondschein',
  'Wochenmarkt',
  'Kräuterhexe Runa',
  'Teestube Glühwurm',
  'Hotel Sternenhof',
  'Apotheke zur Eule',
  'Suppenkönig Bruno',
  'Imkerei Summsel',
]
