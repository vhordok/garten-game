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
  /** scratch tickets: drop rate scales with the crop's cycle time —
   * slow/expensive plants find tickets, basil spam does not */
  scratchDropPerMinute: 0.02,
  scratchDropCap: 0.35,
  scratchMaxPending: 5,
  /** pick 3 of 9: the full triple (1-in-84) pays ×mult; two equal picked
   * symbols pay a share of THAT symbol's prize; otherwise consolation */
  scratchFullMult: 10,
  scratchPartialFactor: 0.4,
  scratchConsolationFactor: 0.1,
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
  /** permanent bonuses per EFFECTIVE compost point (see softcap below) —
   * chunky on purpose: prestige is rare and must feel mighty */
  compostYieldPerPoint: 0.25,
  compostGrowthPerPoint: 0.1,
  /** effective points = compost^exp — soft cap against the prestige spiral
   * (balance audit: linear bonus × accumulating compost ran away) */
  compostSoftcapExp: 0.5,
  /** permanent yield bonus per gardener level above 1, capped — otherwise
   * level×compost feedback runs away in the late game (balance audit) */
  levelYieldPerLevel: 0.01,
  levelYieldMaxBonus: 1.0,
  /** market wave: sell prices oscillate ±~30 % over this period (seconds) */
  marketPeriodSeconds: 600,
  /** offline simulation cap; later extendable through upgrades (GAME_DESIGN.md §5) */
  offlineCapHours: 8,
  /** ignore gaps shorter than this when applying offline progress */
  offlineMinSeconds: 10,
  autosaveSeconds: 10,
  saveKey: 'garten-imperium-save',
} as const
