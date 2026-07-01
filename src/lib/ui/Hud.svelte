<script lang="ts">
  import { cubicOut } from 'svelte/easing'
  import { Tween } from 'svelte/motion'
  import { xpToNext } from '../data/progression'
  import { anyUpgradeAffordable, compostGain, dailyClaimable, isPlantUnlocked, leaseRequirement, questFulfillable, sellableValue, sellAll } from '../game/actions'
  import { ORNAMENTALS, nextOrnamentalCost, ornamentalCount } from '../game/gallery'
  import { activeGoals } from '../game/goals'
  import { toastLogUnseen } from './toasts'
  import { availableSkillPoints } from '../game/skills'
  import { activeExpeditionCount, anyExpeditionReady } from '../game/expeditions'
  import { CREATURES } from '../data/creatures'
  import { creatureLevel, isCreatureAttracted, isGiftReady } from '../game/creatures'
  import { crossEligibility, discoverableVariants } from '../game/seedlab'
  import { comboMultiplier, comboWindowSeconds, gardenBeauty, marketFactor, maxScratchTickets } from '../game/modifiers'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { coinBurst } from './fx/particles'
  import PixelIcon from './PixelIcon.svelte'

  let {
    onOpenInventory,
    onOpenSettings,
    onOpenShop,
    onOpenQuests,
    onOpenScratch,
    onOpenPrestige,
    onOpenDaily,
    onOpenAchievements,
    onOpenGoals,
    onOpenSkills,
    onOpenSeedLab,
    onOpenGallery,
    onOpenExpeditions,
    onOpenCreatures,
    onOpenToastLog,
  }: {
    onOpenInventory: () => void
    onOpenSettings: () => void
    onOpenShop: () => void
    onOpenQuests: () => void
    onOpenScratch: () => void
    onOpenPrestige: () => void
    onOpenDaily: () => void
    onOpenAchievements: () => void
    onOpenGoals: () => void
    onOpenSkills: () => void
    onOpenSeedLab: () => void
    onOpenGallery: () => void
    onOpenExpeditions: () => void
    onOpenCreatures: () => void
    onOpenToastLog: () => void
  } = $props()

  // PHASE 68: light the expeditions button when a run has returned (ready to
  // claim). The store churns every frame (plots grow), so Date.now() stays fresh.
  const expeditionReadyNow = $derived(anyExpeditionReady($gameStore, Date.now()))
  const expeditionOut = $derived(activeExpeditionCount($gameStore) > 0)
  // PHASE 69: nudge the creatures button when a new animal can be befriended
  const creatureHint = $derived(
    CREATURES.some((c) => creatureLevel($gameStore, c.id) === 0 && isCreatureAttracted($gameStore, c, gardenBeauty($gameStore)))
  )
  // PHASE 77: stronger cue when a befriended creature has a gift ready to collect
  const creatureGiftReady = $derived(
    CREATURES.some((c) => creatureLevel($gameStore, c.id) > 0 && isGiftReady($gameStore, c.id, Date.now()))
  )

  // PHASE 28: only MEANINGFUL ready goals light the badge — trivial chores
  // (cheap upgrade, cash a ticket) shouldn't keep it permanently lit.
  const goalsReady = $derived(activeGoals($gameStore).filter((g) => g.ready && !g.chore).length)
  const skillPoints = $derived(availableSkillPoints($gameStore))
  const newCross = $derived(discoverableVariants($gameStore).some((v) => crossEligibility($gameStore, v.parents[0], v.parents[1]).status === 'ok'))
  // PHASE 44: nudge the gallery when an ornamental you don't own yet is affordable
  const galleryHint = $derived(
    ORNAMENTALS.some(
      (p) =>
        ornamentalCount($gameStore, p.id) === 0 &&
        isPlantUnlocked(p, $gameStore) &&
        $gameStore.money >= nextOrnamentalCost(p, 0)
    )
  )

  const upgradeHint = $derived(anyUpgradeAffordable($gameStore))
  const questHint = $derived($gameStore.quests.some((q) => questFulfillable($gameStore, q.id)))
  const dailyReady = $derived(dailyClaimable($gameStore))
  const prestigeGain = $derived(compostGain($gameStore))
  const prestigeReady = $derived(prestigeGain >= leaseRequirement($gameStore))
  const showPrestige = $derived(prestigeGain >= 1 || $gameStore.parcels > 1)

  const stockValue = $derived(sellableValue($gameStore))
  const stockCount = $derived(Object.values($gameStore.inventory).reduce((a, b) => a + b, 0))

  // money counts up/down instead of jumping
  const shownMoney = Tween.of(() => $gameStore.money, { duration: 280, easing: cubicOut })

  // pulse the coin whenever money increases
  let pulseKey = $state(0)
  let lastMoney = -1
  $effect(() => {
    const money = $gameStore.money
    if (lastMoney >= 0 && money > lastMoney) pulseKey++
    lastMoney = money
  })

  const comboActive = $derived($gameStore.combo.count >= 2)
  const comboMult = $derived(comboMultiplier($gameStore))
  const comboFraction = $derived(
    Math.min($gameStore.combo.remaining / comboWindowSeconds($gameStore), 1)
  )

  const marketPct = $derived(Math.round((marketFactor($gameStore) - 1) * 100))

  const xpNeeded = $derived(xpToNext($gameStore.level))
  const xpFraction = $derived(Math.min($gameStore.xp / xpNeeded, 1))

  // PHASE 4: publish the real HUD height so event banners and the content
  // padding always sit below the topbar — even when the row wraps on a
  // narrow desktop. No more guessing with a hardcoded offset.
  let hudHeight = $state(0)
  $effect(() => {
    document.documentElement.style.setProperty('--hud-h', `${hudHeight}px`)
  })

  function handleSellAll(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const gain = sellAll()
    if (gain > 0) {
      coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 16)
      playSound('sell')
    }
  }
</script>

<header class="hud pxpanel" bind:offsetHeight={hudHeight}>
  <div class="row">
    <div class="logo">
      <PixelIcon name="sparkle" scale={2} />
      <h1>Garten-Imperium</h1>
    </div>

  <div class="money chip num" title="Geld — insgesamt verdient: {formatNumber($gameStore.totalEarned)}">
    {#key pulseKey}
      <span class="coin-pulse"><PixelIcon name="coin" scale={2} /></span>
    {/key}
    <span class="amount">{formatNumber(shownMoney.current)}</span>
  </div>

  <div
    class="chip num market"
    class:up={marketPct > 3}
    class:down={marketPct < -3}
    title="Marktpreise schwanken — im Hoch verkaufen lohnt! Wirkt auf alle Verkäufe (Aufträge sind Festpreise)."
  >
    {marketPct > 0 ? '▲' : marketPct < 0 ? '▼' : '◆'} {marketPct > 0 ? '+' : ''}{marketPct} %
  </div>

  {#if $gameStore.fertilizerCharges > 0}
    <div class="chip num boost" title="Turbo-Dünger aktiv: die nächsten Ernten bringen das Doppelte">
      <PixelIcon name="duenger" scale={1} />
      ×{formatNumber($gameStore.fertilizerCharges)}
    </div>
  {/if}

  {#if comboActive}
    <div class="combo chip num" title="Ernte-Kette: weiterernten, bevor die Leiste leer ist!">
      {#key $gameStore.combo.count}
        <span class="combo-x">×{comboMult.toFixed(2)}</span>
      {/key}
      <span class="combo-info">
        <span class="combo-count">{$gameStore.combo.count}er-Kette</span>
        <span class="combo-bar"><span class="combo-fill" style:width={`${comboFraction * 100}%`}></span></span>
      </span>
    </div>
  {/if}

  <div class="spacer"></div>

  {#if stockValue > 0}
    <button
      class="pxbtn gold num sell"
      onclick={handleSellAll}
      title="Lager-Überschuss verkaufen — was offene Aufträge brauchen, bleibt liegen"
    >
      Verkaufen +{formatNumber(stockValue)}
    </button>
  {/if}

  {#if $gameStore.scratchTickets > 0}
    <button
      class="pxbtn gold ticket num"
      onclick={onOpenScratch}
      aria-label="Rubbellose"
      title={`Rubbellose (${$gameStore.scratchTickets}/${maxScratchTickets($gameStore)}) — das Limit wächst mit deinem Level`}
    >
      <PixelIcon name="los" scale={1} />
      {$gameStore.scratchTickets}
    </button>
  {/if}
  </div>

  <!-- PHASE 31: the panel buttons live in their OWN row so changing stats
       (money/market/combo width) can never reshuffle or jump them. -->
  <div class="row btns">
  <button class="pxbtn" onclick={onOpenDaily} aria-label="Tagesbonus" title="Tagesbonus — jeden Tag ein Geschenk">
    <PixelIcon name="geschenk" scale={2} />
    {#if dailyReady}<span class="dot" aria-hidden="true"></span>{/if}
  </button>

  <button class="pxbtn" onclick={onOpenShop} aria-label="Shop" title="Shop — dauerhafte Upgrades">
    <PixelIcon name="marktstand" scale={2} />
    {#if upgradeHint}<span class="dot" aria-hidden="true"></span>{/if}
  </button>

  <button class="pxbtn" onclick={onOpenQuests} aria-label="Aufträge" title="Aufträge — liefern lohnt sich">
    <PixelIcon name="scroll" scale={2} />
    {#if questHint}<span class="dot quest" aria-hidden="true"></span>{/if}
  </button>

  <!-- PHASE 40: always visible so it's discoverable (was hidden until available —
       players couldn't find it). The panel itself explains the compost requirement. -->
  <button class="pxbtn" class:dim={!showPrestige} onclick={onOpenPrestige} aria-label="Prestige — neue Parzelle" title="Prestige — neue Parzelle pachten (Kompost wirkt für immer)">
    <PixelIcon name="duenger" scale={2} />
    {#if prestigeReady}<span class="dot prestige" aria-hidden="true"></span>{/if}
  </button>

  <button class="pxbtn" onclick={onOpenGoals} aria-label="Ziele" title="Ziele — woran du als Nächstes arbeitest">
    <PixelIcon name="sparkle" scale={2} />
    {#if goalsReady > 0}<span class="badge num">{goalsReady}</span>{/if}
  </button>

  <button class="pxbtn" onclick={onOpenSkills} aria-label="Fähigkeiten" title="Fähigkeiten — dein langfristiger Build">
    <PixelIcon name="seedling" scale={2} />
    {#if skillPoints > 0}<span class="badge num">{skillPoints}</span>{/if}
  </button>

  <button class="pxbtn" onclick={onOpenSeedLab} aria-label="Saatlabor" title="Saatlabor — Pflanzen kreuzen & Varianten sammeln">
    🧬
    {#if newCross}<span class="dot" aria-hidden="true"></span>{/if}
  </button>

  <button class="pxbtn" onclick={onOpenGallery} aria-label="Ziergalerie" title="Ziergalerie — Zierpflanzen sammeln für dauerhafte Schönheit">
    ✿
    {#if galleryHint}<span class="dot" aria-hidden="true"></span>{/if}
  </button>

  <button class="pxbtn" onclick={onOpenExpeditions} aria-label="Expeditionen" title="Expeditionen — schick deinen Gärtner los und sammle Relikte">
    🧭
    {#if expeditionReadyNow}<span class="dot prestige" aria-hidden="true"></span>{:else if expeditionOut}<span class="dot" aria-hidden="true"></span>{/if}
  </button>

  <button class="pxbtn" onclick={onOpenCreatures} aria-label="Garten-Bewohner" title="Garten-Bewohner — Tiere anlocken, anfreunden, Geschenke abholen">
    🦔
    {#if creatureGiftReady}<span class="dot prestige" aria-hidden="true"></span>{:else if creatureHint}<span class="dot" aria-hidden="true"></span>{/if}
  </button>

  <button class="pxbtn" onclick={onOpenAchievements} aria-label="Erfolge" title="Erfolge — jeder gibt +1 % Ertrag">
    <PixelIcon name="pokal" scale={2} />
  </button>

  <button class="pxbtn" onclick={onOpenInventory} aria-label="Lager" title="Lager öffnen">
    <PixelIcon name="basket" scale={2} />
    {#if stockCount > 0}<span class="badge num">{formatNumber(stockCount)}</span>{/if}
  </button>

  <button class="pxbtn" onclick={onOpenToastLog} aria-label="Verlauf" title="Verlauf — verpasste Meldungen nachlesen">
    🔔
    {#if $toastLogUnseen > 0}<span class="badge num">{$toastLogUnseen}</span>{/if}
  </button>

    <span class="hud-divider" aria-hidden="true"></span>
    <button
      class="pxbtn settings-in-hud"
      onclick={onOpenSettings}
      title="Einstellungen & Spielstand"
      aria-label="Einstellungen"
    >
      <PixelIcon name="gear" scale={2} />
    </button>
  </div>

  <div
    class="xp-row num"
    title={`Gärtner-Level — XP für jede geerntete Einheit. Dauerhaft +${Math.max($gameStore.level - 1, 0)} % Ertrag, bleibt auch beim Parzellen-Wechsel.`}
  >
    {#key $gameStore.level}
      <span class="level-badge">LV {$gameStore.level}</span>
    {/key}
    <span class="xp-bar"><span class="xp-fill" style:width={`${xpFraction * 100}%`}></span></span>
    <span class="xp-text">{formatNumber(Math.floor($gameStore.xp))}/{formatNumber(xpNeeded)}</span>
  </div>
</header>

<style>
  .hud {
    position: fixed;
    top: calc(var(--safe-top, 0px) + 10px);
    left: 50%;
    transform: translateX(-50%);
    width: min(1060px, calc(100vw - 20px - var(--safe-left, 0px) - var(--safe-right, 0px)));
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 2px 8px 6px;
  }

  .row {
    display: flex;
    align-items: center;
    /* wrap is safe now that --hud-h drives the content padding (PHASE 4/5) */
    flex-wrap: wrap;
    gap: 12px;
    row-gap: 6px;
  }

  /* PHASE 31: the panel buttons sit on their own line, right-aligned, so they
     keep a stable position no matter how wide the live stats get. */
  .row.btns {
    justify-content: flex-end;
    gap: 8px;
  }

  /* PHASE 41: bigger, fuller icons in the topbar so they're actually
     recognisable — less side padding, larger emoji glyphs (🧬/🔔). */
  .row.btns .pxbtn {
    padding: 4px 7px;
    font-size: 1.3rem;
    line-height: 1;
  }

  .xp-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .level-badge {
    display: inline-flex;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--c-plum3);
    text-shadow: 0 0 8px rgba(223, 132, 165, 0.45);
    animation: combo-pop 0.25s ease-out;
  }

  .xp-bar {
    flex: 1;
    height: 7px;
    background: var(--c-night0);
    border: 1px solid var(--c-edge);
  }

  .xp-fill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--c-plum1), var(--c-plum2));
    transition: width 0.25s ease-out;
  }

  .xp-text {
    font-size: 0.72rem;
    color: var(--c-cloud);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  h1 {
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-leaf4);
    text-shadow: 0 0 10px rgba(168, 202, 88, 0.35);
  }

  .money {
    padding: 2px 10px;
  }

  .coin-pulse {
    display: inline-flex;
    animation: coin-pulse 0.25s ease-out;
  }

  @keyframes coin-pulse {
    40% {
      transform: scale(1.35);
    }
  }

  .amount {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--c-gold2);
    text-shadow: 0 0 10px rgba(222, 158, 65, 0.4);
    /* PHASE 31: stable footprint so the counting-up tween never nudges siblings */
    display: inline-block;
    min-width: 4.5ch;
    text-align: right;
  }

  /* PHASE 31: fixed-width sell label so "+5.5SP" → "+7.35SP" doesn't reflow */
  .sell {
    min-width: 8.5em;
    text-align: center;
  }

  .spacer {
    flex: 1;
  }

  .combo {
    padding: 2px 8px;
    gap: 8px;
  }

  .combo-x {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--c-ember);
    text-shadow: 0 0 10px rgba(255, 159, 67, 0.55);
    animation: combo-pop 0.18s ease-out;
  }

  @keyframes combo-pop {
    40% {
      transform: scale(1.3);
    }
  }

  .combo-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .combo-count {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--c-mist);
  }

  .combo-bar {
    display: block;
    width: 72px;
    height: 6px;
    background: var(--c-night0);
    border: 1px solid var(--c-edge);
  }

  .combo-fill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--c-ember), var(--c-gold1));
  }

  @media (max-width: 640px) {
    .combo-count {
      display: none;
    }
  }

  .badge {
    font-size: 0.7rem;
    color: var(--c-leaf5);
  }

  /* PHASE 4: set the settings gear apart from the gameplay actions */
  .hud-divider {
    width: 2px;
    align-self: stretch;
    margin: 2px 0;
    background: var(--c-edge);
    opacity: 0.6;
  }

  /* on roomy desktops a detached corner gear takes over (see App.svelte) */
  @media (min-width: 1100px) {
    .hud-divider,
    .settings-in-hud {
      display: none;
    }
  }

  .pxbtn {
    position: relative;
  }

  /* "something is affordable" nudge */
  .dot {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 8px;
    height: 8px;
    background: var(--c-gold1);
    box-shadow: 0 0 8px rgba(222, 158, 65, 0.8);
    animation: dot-pulse 1.4s ease-in-out infinite;
  }

  @keyframes dot-pulse {
    50% {
      opacity: 0.45;
    }
  }

  .dot.quest {
    background: var(--c-leaf4);
    box-shadow: 0 0 8px rgba(168, 202, 88, 0.8);
  }

  .dot.prestige {
    background: var(--c-plum2);
    box-shadow: 0 0 8px rgba(198, 81, 151, 0.85);
  }

  .boost {
    padding: 2px 8px;
    color: var(--c-leaf5);
  }

  .market {
    padding: 2px 8px;
    font-size: 0.78rem;
    color: var(--c-mist);
    /* PHASE 31: constant width regardless of "▲ +14 %" vs "▼ -5 %" */
    min-width: 4.6em;
    justify-content: center;
  }

  .market.up {
    color: var(--c-leaf4);
    text-shadow: 0 0 8px rgba(168, 202, 88, 0.45);
  }

  .market.down {
    color: var(--c-red1);
  }

  .ticket {
    animation: ticket-wiggle 1.8s ease-in-out infinite;
  }

  @keyframes ticket-wiggle {
    0%,
    78%,
    100% {
      transform: translateY(0);
    }
    84% {
      transform: translateY(-2px);
    }
    90% {
      transform: translateY(1px);
    }
    96% {
      transform: translateY(-1px);
    }
  }

  .dim {
    opacity: 0.6;
  }

  @media (max-width: 640px) {
    h1 {
      display: none;
    }

    .spacer {
      display: none;
    }

    /* PHASE 40: the topbar ate too much height on phones. Tighten everything and
       put the panel buttons into ONE horizontally-scrollable strip instead of
       wrapping to 2–3 rows — the partial last button signals "swipe for more". */
    .hud {
      gap: 3px;
      padding: 2px 6px 5px;
    }

    .row {
      gap: 7px;
      justify-content: center;
      row-gap: 4px;
    }

    .row.btns {
      flex-wrap: nowrap;
      overflow-x: auto;
      justify-content: flex-start;
      gap: 6px;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      /* fade the right edge as a "more here" affordance */
      -webkit-mask-image: linear-gradient(to right, #000 88%, transparent);
      mask-image: linear-gradient(to right, #000 88%, transparent);
    }

    .row.btns::-webkit-scrollbar {
      display: none;
    }

    /* PHASE 41: a touch larger so the bigger icons read clearly and fill them */
    .row.btns .pxbtn {
      flex: 0 0 auto;
      min-width: 50px;
      min-height: 50px;
      padding: 5px;
    }

    /* the primary sell button no longer needs to be a tall full-width slab */
    .sell {
      min-width: 0;
      padding: 1px 10px 4px;
    }

    .amount {
      font-size: 1.05rem;
    }
  }
</style>
