<script lang="ts">
  import { inventoryValue, sellAll } from '../game/actions'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import PixelIcon from './PixelIcon.svelte'

  let {
    onOpenInventory,
    onOpenSettings,
  }: { onOpenInventory: () => void; onOpenSettings: () => void } = $props()

  const stockValue = $derived(inventoryValue($gameStore))
  const stockCount = $derived(Object.values($gameStore.inventory).reduce((a, b) => a + b, 0))
</script>

<header class="hud pxpanel">
  <div class="logo">
    <PixelIcon name="sparkle" scale={2} />
    <h1>Garten-Imperium</h1>
  </div>

  <div class="money chip num" title="Geld — insgesamt verdient: {formatNumber($gameStore.totalEarned)}">
    <PixelIcon name="coin" scale={2} />
    <span class="amount">{formatNumber($gameStore.money)}</span>
  </div>

  <div class="spacer"></div>

  {#if stockValue > 0}
    <button class="pxbtn gold num" onclick={() => sellAll()} title="Komplettes Lager verkaufen">
      Verkaufen +{formatNumber(stockValue)}
    </button>
  {/if}

  <button class="pxbtn" onclick={onOpenInventory} title="Lager öffnen">
    <PixelIcon name="basket" scale={2} />
    {#if stockCount > 0}<span class="badge num">{formatNumber(stockCount)}</span>{/if}
  </button>

  <button class="pxbtn" onclick={onOpenSettings} title="Einstellungen & Spielstand" aria-label="Einstellungen">
    <PixelIcon name="gear" scale={2} />
  </button>
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
    align-items: center;
    gap: 12px;
    padding: 2px 8px;
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

  .amount {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--c-gold2);
    text-shadow: 0 0 10px rgba(222, 158, 65, 0.4);
  }

  .spacer {
    flex: 1;
  }

  .badge {
    font-size: 0.7rem;
    color: var(--c-leaf5);
  }

  @media (max-width: 640px) {
    h1 {
      display: none;
    }
  }
</style>
