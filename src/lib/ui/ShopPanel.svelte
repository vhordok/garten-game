<script lang="ts">
  import { UPGRADES } from '../data/upgrades'
  import { buyUpgrade, nextUpgradeCost, upgradeLevel } from '../game/actions'
  import { gameStore } from '../game/state'
  import type { UpgradeDef, UpgradeSection } from '../game/types'
  import { formatDuration, formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { coinBurst } from './fx/particles'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'

  let { onClose }: { onClose: () => void } = $props()

  const SECTIONS: Array<{ id: UpgradeSection; label: string }> = [
    { id: 'boost', label: 'Boosts' },
    { id: 'glueck', label: 'Glück' },
    { id: 'helfer', label: 'Helfer — arbeiten auch offline' },
  ]

  function effectText(u: UpgradeDef): string {
    switch (u.effect) {
      case 'growth':
        return `+${Math.round(u.perLevel * 100)} % Wachstumstempo pro Stufe`
      case 'yield':
        return `+${Math.round(u.perLevel * 100)} % Ertrag pro Stufe`
      case 'sellPrice':
        return `+${Math.round(u.perLevel * 100)} % Verkaufspreis pro Stufe`
      case 'waterCharges':
        return `+${u.perLevel} Gieß-Ladung pro Stufe`
      case 'comboWindow':
        return `+${u.perLevel} s Combo-Fenster pro Stufe`
      case 'critChance':
        return `+${Math.round(u.perLevel * 100)} % Perfekt-Chance (Legendär ein Fünftel davon) pro Stufe`
      case 'scratchLuck':
        return `+${Math.round(u.perLevel * 100)} % Los-Chance pro Stufe`
      case 'offlineCap':
        return `+${u.perLevel} h Offline-Wachstum pro Stufe`
      case 'autoHarvest':
        return `erntet +${u.perLevel} Beete/s pro Stufe`
      case 'autoSow':
        return `sät +${u.perLevel} Beete/s pro Stufe (gewählte Sorte)`
      case 'autoSell':
        return 'verkauft das Lager — pro Stufe öfter'
    }
  }

  function activeText(u: UpgradeDef, level: number): string {
    if (level === 0) return ''
    switch (u.effect) {
      case 'growth':
      case 'yield':
      case 'sellPrice':
        return `+${Math.round(u.perLevel * level * 100)} %`
      case 'waterCharges':
        return `+${u.perLevel * level} Ladungen`
      case 'comboWindow':
        return `+${(u.perLevel * level).toFixed(1)} s`
      case 'critChance':
      case 'scratchLuck':
        return `+${Math.round(u.perLevel * level * 100)} %`
      case 'offlineCap':
        return `${8 + u.perLevel * level} h Cap`
      case 'autoHarvest':
      case 'autoSow':
        return `${(u.perLevel * level).toFixed(1)} Beete/s`
      case 'autoSell':
        return `alle ${formatDuration(60 / level)}`
    }
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
  <p class="hint">Dauerhafte Upgrades für diese Parzelle — jede Stufe wirkt sofort.</p>
  {#each SECTIONS as section (section.id)}
    <h3 class="section">{section.label}</h3>
    <ul class="shop-list">
      {#each UPGRADES.filter((u) => u.section === section.id) as upgrade (upgrade.id)}
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
              {effectText(upgrade)}
              {#if level > 0}
                · aktiv: <b>{activeText(upgrade, level)}</b>
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
  {/each}
</Overlay>

<style>
  .section {
    margin: 14px 0 0;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-mist);
  }

  .shop-list {
    list-style: none;
    margin: 8px 0 0;
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
