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
  /** PHASE 12 idle value for the otherwise active-only upgrades:
   * Wasserfass also gives a small passive growth bonus (and its level counts
   * toward the cannabis watering-care requirement, see tick.ts); Sternenuhr
   * also stretches the offline cap a little. Modest on purpose — no breakpoints. */
  wasserfassGrowthPerLevel: 0.03,
  sternenuhrOfflinePerLevel: 1,
  /** combo harvesting (GAME_DESIGN.md §9.4): chain window and per-stack bonus */
  comboWindowSeconds: 4,
  comboPerStack: 0.05,
  comboMaxStacks: 20,
  /** scratch tickets: drop rate scales with the crop's cycle time —
   * slow/expensive plants find tickets, basil spam does not */
  scratchDropPerMinute: 0.02,
  scratchDropCap: 0.35,
  /** MINIMUM ticket pocket — the real cap grows with the gardener level,
   * see maxScratchTickets() in game/modifiers.ts (PHASE 0) */
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
  /** post-prestige quest floor (PHASE 12): orders draw from a tier band
   * [reach / questBandWidth, reach] where reach = max(totalEarned,
   * maxUnlockEarned × questReachFactor) — keeps orders at the player's level
   * after a prestige instead of dropping back to basil. */
  questReachFactor: 0.12,
  questBandWidth: 60,
  /** PHASE 13: fair amounts — an order asks for what a (capped) full field
   * produces in questEffort seconds, so slow plants get small amounts and fast
   * plants larger ones. Plot count is capped so amounts don't scale absurdly. */
  questEffortMin: 240,
  questEffortMax: 720,
  questEffortPlotsCap: 24,
  questAmountCap: 2500,
  /** order-type reward multipliers (combo/category/big carry a bonus) and the
   * size multiplier + compost payout of a big haul */
  questCombiBonus: 1.35,
  questCategoryBonus: 1.45,
  questBigBonus: 2.2,
  questBigSizeMult: 4,
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
  /** plant mastery (PHASE 11): level = floor(log2(harvested / base + 1)),
   * capped; each level adds masteryYieldPerLevel to THAT plant's yield. Makes
   * sticking with / returning to a plant pay off — fights "newest plant wins". */
  masteryBase: 120,
  masteryMaxLevel: 10,
  masteryYieldPerLevel: 0.1,
  /** category specialisation (PHASE 11 gold sink): permanent per-category yield
   * bonus, bought with gold. Cost grows ×specCostFactor per level so you must
   * choose which categories to invest in rather than maxing everything. */
  specYieldPerLevel: 0.08,
  specBaseCost: 5e6,
  specCostFactor: 3.4,
  specMaxLevel: 25,
} as const
