<script lang="ts">
  import { CREATURES, attractLabel } from '../data/creatures'
  import { collectCreatureGift, tameCreature } from '../game/actions'
  import { befriendedCount, creatureLevel, giftRemainingMs, giftReward, isCreatureAttracted, isGiftReady } from '../game/creatures'
  import { gardenBeauty } from '../game/modifiers'
  import { gameStore } from '../game/state'
  import { formatDuration, formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { pushToast } from './toasts'
  import Overlay from './Overlay.svelte'

  let { onClose }: { onClose: () => void } = $props()

  // 1 Hz clock so gift countdowns tick live
  let now = $state(Date.now())
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(t)
  })

  const beauty = $derived(gardenBeauty($gameStore))

  function tame(id: string) {
    if (tameCreature(id)) playSound('unlock')
  }
  function collect(id: string) {
    const r = collectCreatureGift(id)
    if (!r) return
    playSound('ticket')
    const label = r.kind === 'tickets' ? `${r.amount}× Rubbellos` : `${r.amount}× Turbo-Dünger`
    pushToast(`Geschenk: ${label} 🎁`, '🎁', 5000, { key: 'creature-gift' })
  }

  const GIFT_LABEL = { tickets: 'Rubbellose', fertilizer: 'Turbo-Dünger' } as const
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
    Ein gepflegter Garten <b>lockt Tiere an</b>. Freunde sie an — dann <b>laufen und fliegen sie durch
    deinen Garten</b> und bringen regelmäßig ein <b>Geschenk</b>. Klick das Tier (hier oder direkt im
    Garten), um es einzusammeln: Belohnung <i>und</i> eine Freundschaftsstufe (= stärkerer dauerhafter
    Bonus). Boni überleben Prestige <b>und</b> Weltensaat.
  </p>
  <p class="stock num">🐾 Angefreundet: <b>{befriendedCount($gameStore)}/{CREATURES.length}</b></p>

  <ul class="list">
    {#each CREATURES as c (c.id)}
      {@const level = creatureLevel($gameStore, c.id)}
      {@const attracted = isCreatureAttracted($gameStore, c, beauty)}
      {@const ready = level > 0 && isGiftReady($gameStore, c.id, now)}
      {@const wait = giftRemainingMs($gameStore, c.id, now)}
      <li class="row" class:locked={!attracted && level === 0} class:friend={level > 0} class:gift={ready}>
        <span class="emoji" class:wiggle={ready}>{c.emoji}</span>
        <span class="body">
          <span class="head">
            <b>{c.name}</b>
            {#if level > 0}<span class="lvl num">♥ {level}/{c.maxLevel}</span>{/if}
          </span>
          {#if level > 0}
            <span class="desc num">{effectLabel(c, level)} · schenkt {GIFT_LABEL[c.gift]}</span>
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
        {:else if ready}
          {@const rew = giftReward(c, level)}
          <button class="pxbtn gold gift-btn num" onclick={() => collect(c.id)} title="Geschenk einsammeln">
            🎁 {formatNumber(rew.amount)}
          </button>
        {:else}
          <span class="wait num" title="Zeit bis zum nächsten Geschenk">⏳ {formatDuration(wait / 1000)}</span>
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
  .row.gift {
    background: color-mix(in srgb, var(--c-gold2) 14%, transparent);
  }
  .emoji {
    font-size: 1.6rem;
    flex: none;
    width: 34px;
    text-align: center;
  }
  .emoji.wiggle {
    animation: wiggle 0.7s ease-in-out infinite;
  }
  @keyframes wiggle {
    0%,
    100% {
      transform: rotate(-8deg);
    }
    50% {
      transform: rotate(8deg);
    }
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
  .gift-btn {
    flex: none;
  }
  .lockchip,
  .wait {
    flex: none;
    font-size: 0.74rem;
    white-space: nowrap;
    color: var(--c-mist);
  }
  @media (prefers-reduced-motion: reduce) {
    .emoji.wiggle {
      animation: none;
    }
  }
</style>
