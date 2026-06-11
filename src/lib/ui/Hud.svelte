<script lang="ts">
  import { cubicOut } from 'svelte/easing'
  import { Tween } from 'svelte/motion'
  import { CONFIG } from '../data/config'
  import { xpToNext } from '../data/progression'
  import { anyUpgradeAffordable, inventoryValue, questFulfillable, sellAll } from '../game/actions'
  import { comboMultiplier } from '../game/modifiers'
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
  }: {
    onOpenInventory: () => void
    onOpenSettings: () => void
    onOpenShop: () => void
    onOpenQuests: () => void
  } = $props()

  const upgradeHint = $derived(anyUpgradeAffordable($gameStore))
  const questHint = $derived($gameStore.quests.some((q) => questFulfillable($gameStore, q.id)))

  const stockValue = $derived(inventoryValue($gameStore))
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
    Math.min($gameStore.combo.remaining / CONFIG.comboWindowSeconds, 1)
  )

  const xpNeeded = $derived(xpToNext($gameStore.level))
  const xpFraction = $derived(Math.min($gameStore.xp / xpNeeded, 1))

  function handleSellAll(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const gain = sellAll()
    if (gain > 0) {
      coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 16)
      playSound('sell')
    }
  }
</script>

<header class="hud pxpanel">
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
    <button class="pxbtn gold num" onclick={handleSellAll} title="Komplettes Lager verkaufen">
      Verkaufen +{formatNumber(stockValue)}
    </button>
  {/if}

  <button class="pxbtn" onclick={onOpenShop} title="Shop — dauerhafte Upgrades">
    <PixelIcon name="giesskanne" scale={1} />
    {#if upgradeHint}<span class="dot" aria-hidden="true"></span>{/if}
  </button>

  <button class="pxbtn" onclick={onOpenQuests} title="Aufträge — liefern lohnt sich">
    <PixelIcon name="scroll" scale={1} />
    {#if questHint}<span class="dot quest" aria-hidden="true"></span>{/if}
  </button>

  <button class="pxbtn" onclick={onOpenInventory} title="Lager öffnen">
    <PixelIcon name="basket" scale={2} />
    {#if stockCount > 0}<span class="badge num">{formatNumber(stockCount)}</span>{/if}
  </button>

    <button class="pxbtn" onclick={onOpenSettings} title="Einstellungen & Spielstand" aria-label="Einstellungen">
      <PixelIcon name="gear" scale={2} />
    </button>
  </div>

  <div class="xp-row num" title="Gärtner-Level — XP gibt es für jede geerntete Einheit">
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
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: min(1060px, calc(100vw - 20px));
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 2px 8px 6px;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 12px;
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
    font-size: 0.62rem;
    color: var(--c-mist);
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
    font-size: 0.62rem;
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

  @media (max-width: 640px) {
    h1 {
      display: none;
    }
  }
</style>
