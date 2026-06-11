// Global balance and persistence configuration. Balance values live in
// src/lib/data/ — never hardcode them in game logic (see CLAUDE.md).

export const CONFIG = {
  startMoney: 10,
  startPlots: 4,
  /** Phase-1 cap — more space arrives with leased parcels (prestige, phase 4) */
  maxPlots: 16,
  /** plot n (0-based beyond the free ones) costs plotBaseCost * plotCostFactor^n */
  plotBaseCost: 25,
  plotCostFactor: 1.5,
  /** active watering: charges per sown crop, growth skip per splash */
  waterChargesPerCrop: 3,
  waterProgressBoost: 0.15,
  /** combo harvesting (GAME_DESIGN.md §9.4): chain window and per-stack bonus */
  comboWindowSeconds: 4,
  comboPerStack: 0.05,
  comboMaxStacks: 20,
  /** quests (GAME_DESIGN.md §9.4): reward over market value, skip cooldown */
  questRewardFactor: 1.5,
  questSkipCooldownSeconds: 60,
  /** golden harvests (GAME_DESIGN.md §9.4): roll per harvested plot */
  critPerfectChance: 0.08,
  critPerfectMult: 3,
  critLegendaryChance: 0.01,
  critLegendaryMult: 10,
  /** offline simulation cap; later extendable through upgrades (GAME_DESIGN.md §5) */
  offlineCapHours: 8,
  /** ignore gaps shorter than this when applying offline progress */
  offlineMinSeconds: 10,
  autosaveSeconds: 10,
  saveKey: 'garten-imperium-save',
} as const
