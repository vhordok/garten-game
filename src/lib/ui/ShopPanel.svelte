<script lang="ts">
  import { UPGRADES } from '../data/upgrades'
  import { buyUpgrade, nextUpgradeCost, upgradeLevel } from '../game/actions'
  import { gameStore } from '../game/state'
  import type { UpgradeEffect } from '../game/types'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { coinBurst } from './fx/particles'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'

  let { onClose }: { onClose: () => void } = $props()

  const EFFECT_LABEL: Record<UpgradeEffect, string> = {
    growth: 'Wachstumstempo',
    yield: 'Ertrag',
    sellPrice: 'Verkaufspreis',
  }

  function handleBuy(e: MouseEvent, upgradeId: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (buyUpgrade(upgradeId)) {
      coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 12)
      playSound('buy')
    } else {
      playSound('error')
    }
  }
</script>

<Overlay title="Shop" {onClose}>
  <p class="hint">Dauerhafte Upgrades — jede Stufe wirkt sofort und für immer.</p>
  <ul class="shop-list">
    {#each UPGRADES as upgrade (upgrade.id)}
      {@const level = upgradeLevel($gameStore, upgrade.id)}
      {@const cost = nextUpgradeCost(upgrade, $gameStore)}
      {@const affordable = cost !== null && $gameStore.money >= cost}
      <li class="row">
        <span class="icon"><PixelIcon name={upgrade.sprite} scale={3} /></span>
        <span class="info">
          <span class="name">
            {upgrade.name}
            <span class="level num">Stufe {level}/{upgrade.maxLevel}</span>
          </span>
          <span class="desc">{upgrade.description}</span>
          <span class="effect num">
            +{Math.round(upgrade.perLevel * 100)} % {EFFECT_LABEL[upgrade.effect]} pro Stufe
            {#if level > 0}
              · aktiv: <b>+{Math.round(upgrade.perLevel * level * 100)} %</b>
            {/if}
          </span>
        </span>
        {#if cost === null}
          <span class="maxed">MAX</span>
        {:else}
          <button class="pxbtn gold num buy" disabled={!affordable} onclick={(e) => handleBuy(e, upgrade.id)}>
            <PixelIcon name="coin" scale={1} />
            {formatNumber(cost)}
          </button>
        {/if}
      </li>
    {/each}
  </ul>
</Overlay>

<style>
  .shop-list {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon {
    flex: none;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-night1);
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .name {
    font-weight: 700;
    font-size: 0.92rem;
    color: var(--c-leaf5);
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .level {
    font-size: 0.7rem;
    color: var(--c-mist);
  }

  .desc {
    font-size: 0.74rem;
    color: var(--c-mist);
    line-height: 1.35;
  }

  .effect {
    font-size: 0.74rem;
    color: var(--c-cloud);
  }

  .effect b {
    color: var(--c-leaf4);
  }

  .buy {
    flex: none;
  }

  .maxed {
    flex: none;
    font-weight: 700;
    font-size: 0.8rem;
    color: var(--c-gold2);
    text-shadow: 0 0 8px rgba(222, 158, 65, 0.5);
  }
</style>
