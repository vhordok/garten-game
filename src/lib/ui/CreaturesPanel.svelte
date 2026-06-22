<script lang="ts">
  import { CREATURES, attractLabel } from '../data/creatures'
  import { feedGardenCreature, tameCreature } from '../game/actions'
  import { befriendedCount, creatureLevel, feedCost, isCreatureAttracted, totalFreeStock } from '../game/creatures'
  import { gardenBeauty } from '../game/modifiers'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import Overlay from './Overlay.svelte'

  let { onClose }: { onClose: () => void } = $props()

  const beauty = $derived(gardenBeauty($gameStore))
  const freeStock = $derived(totalFreeStock($gameStore))

  function tame(id: string) {
    if (tameCreature(id)) playSound('unlock')
  }
  function feed(id: string) {
    if (feedGardenCreature(id)) playSound('harvest')
  }

  const EFFECT_NAME: Record<string, string> = {
    yield: 'Ertrag',
    growth: 'Wachstumstempo',
    compostGain: 'Kompost-Gewinn',
    sellPrice: 'Verkaufspreis',
    ticketLuck: 'Los-Chance',
  }
  function effectLabel(c: (typeof CREATURES)[number], level: number): string {
    return `+${Math.round(c.perLevel * level * 100)} % ${EFFECT_NAME[c.effect]}`
  }
</script>

<Overlay title="Garten-Bewohner — dein Garten lebt" {onClose}>
  <p class="hint">
    Ein gepflegter Garten <b>lockt Tiere an</b>. Erfülle die Bedingung, dann <b>freunde dich an</b> —
    und <b>füttere</b> sie mit überschüssiger Ernte, um die Freundschaft (und ihren dauerhaften Bonus)
    zu steigern. Boni überleben Prestige <b>und</b> Weltensaat. Tipp: pausiere im Shop den Verkauf,
    um Ernte zum Füttern zu horten.
  </p>
  <p class="stock num">
    🧺 Freie Ernte zum Füttern: <b>{formatNumber(freeStock)}</b> · 🐾 angefreundet:
    <b>{befriendedCount($gameStore)}/{CREATURES.length}</b>
  </p>

  <ul class="list">
    {#each CREATURES as c (c.id)}
      {@const level = creatureLevel($gameStore, c.id)}
      {@const attracted = isCreatureAttracted($gameStore, c, beauty)}
      {@const cost = feedCost(c, level)}
      {@const canFeed = level >= 1 && cost !== null && freeStock >= cost}
      <li class="row" class:locked={!attracted && level === 0} class:friend={level > 0}>
        <span class="emoji">{c.emoji}</span>
        <span class="body">
          <span class="head">
            <b>{c.name}</b>
            {#if level > 0}<span class="lvl num">♥ {level}{c.maxLevel ? `/${c.maxLevel}` : ''}</span>{/if}
          </span>
          {#if level > 0}
            <span class="desc num">{effectLabel(c, level)}</span>
          {:else if attracted}
            <span class="desc">{c.desc}</span>
          {:else}
            <span class="desc num">🔒 {attractLabel(c)}</span>
          {/if}
        </span>

        {#if level === 0 && attracted}
          <button class="pxbtn leaf befriend" onclick={() => tame(c.id)} title="Tier anfreunden">🤝 Anfreunden</button>
        {:else if level === 0}
          <span class="lockchip num">gesperrt</span>
        {:else if cost === null}
          <span class="maxed num">MAX ♥</span>
        {:else}
          <button class="pxbtn gold num feed" disabled={!canFeed} onclick={() => feed(c.id)} title="Mit überschüssiger Ernte füttern">
            🧺 {formatNumber(cost)}
          </button>
        {/if}
      </li>
    {/each}
  </ul>
</Overlay>

<style>
  .hint {
    color: var(--c-mist);
    font-size: 0.8rem;
    margin: 0 0 8px;
    line-height: 1.5;
  }
  .stock {
    font-size: 0.78rem;
    color: var(--c-mist);
    margin: 0 0 12px;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .row.locked {
    opacity: 0.7;
  }
  .row.friend {
    background: color-mix(in srgb, var(--c-leaf3) 8%, transparent);
  }
  .emoji {
    font-size: 1.6rem;
    flex: none;
    width: 34px;
    text-align: center;
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .lvl {
    color: var(--c-red1);
    font-size: 0.78rem;
  }
  .desc {
    color: var(--c-mist);
    font-size: 0.74rem;
  }
  .befriend,
  .feed {
    flex: none;
  }
  .lockchip,
  .maxed {
    flex: none;
    font-size: 0.74rem;
    white-space: nowrap;
  }
  .lockchip {
    color: var(--c-mist);
  }
  .maxed {
    color: var(--c-gold2);
    font-weight: 700;
  }
</style>
