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
  /** scratch tickets: drop chance per harvested plot, pending cap */
  scratchDropChance: 0.04,
  scratchMaxPending: 5,
  /** turbo fertilizer: yield factor while charges last (one per harvest) */
  fertilizerChargeMult: 2,
  /** quests (GAME_DESIGN.md §9.4): tier factors live in data/questFlavor.ts */
  questSkipCooldownSeconds: 60,
  /** payout bonus per consecutive delivery, and its cap */
  questStreakPerDelivery: 0.02,
  questStreakMaxBonus: 0.3,
  /** golden harvests (GAME_DESIGN.md §9.4): roll per harvested plot */
  critPerfectChance: 0.08,
  critPerfectMult: 3,
  critLegendaryChance: 0.01,
  critLegendaryMult: 10,
  /** prestige (GAME_DESIGN.md §6): compost = floor(sqrt(roundEarned / base)) */
  prestigeBase: 1e6,
  /** additional plot cap per leased parcel */
  parcelExtraPlots: 4,
  /** permanent bonuses per compost point */
  compostYieldPerPoint: 0.05,
  compostGrowthPerPoint: 0.02,
  /** permanent yield bonus per gardener level above 1 */
  levelYieldPerLevel: 0.01,
  /** offline simulation cap; later extendable through upgrades (GAME_DESIGN.md §5) */
  offlineCapHours: 8,
  /** ignore gaps shorter than this when applying offline progress */
  offlineMinSeconds: 10,
  autosaveSeconds: 10,
  saveKey: 'garten-imperium-save',
} as const
