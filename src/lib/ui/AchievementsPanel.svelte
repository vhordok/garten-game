<script lang="ts">
  import { ACHIEVEMENTS, TIER_NAMES, type AchReward } from '../data/achievements'
  import { claimedTier, totalClaimedTiers } from '../game/achievements'
  import { gameStore } from '../game/state'
  import Overlay from './Overlay.svelte'

  let { onClose }: { onClose: () => void } = $props()

  const totalTiers = ACHIEVEMENTS.length * TIER_NAMES.length
  const claimed = $derived(totalClaimedTiers($gameStore))

  /** short, human reward summary for a tier */
  function rewardText(r: AchReward): string {
    const parts: string[] = []
    if (r.yield) parts.push(`+${Math.round(r.yield * 100)} % Ertrag`)
    if (r.growth) parts.push(`+${Math.round(r.growth * 100)} % Tempo`)
    if (r.questReward) parts.push(`+${Math.round(r.questReward * 100)} % Auftrag`)
    if (r.ticketLuck) parts.push(`+${(r.ticketLuck).toFixed(3)} Los-Glück`)
    if (r.compost) parts.push(`${r.compost} 🌱`)
    if (r.tickets) parts.push(`${r.tickets} 🎟️`)
    if (r.fertilizer) parts.push(`${r.fertilizer}× Dünger`)
    return parts.join(' · ')
}
</script>

<Overlay title="Erfolge — mehrstufige Ziele" {onClose}>
  <p class="hint">
    Jeder Erfolg hat sechs Stufen (Bronze → Legendär). <b>{claimed}/{totalTiers}</b> Stufen erreicht.
    Belohnungen werden automatisch gutgeschrieben — dauerhafte Boni + Einmal-Belohnungen.
  </p>

  <ul class="list">
    {#each ACHIEVEMENTS as a (a.id)}
      {@const cur = claimedTier($gameStore, a.id)}
      {@const value = a.metric($gameStore)}
      {@const next = cur < a.tiers.length ? a.tiers[cur] : null}
      {@const prevThresh = cur > 0 ? a.tiers[cur - 1].threshold : 0}
      {@const frac = next ? Math.max(0, Math.min(1, (value - prevThresh) / (next.threshold - prevThresh))) : 1}
      <li class="ach" class:maxed={!next}>
        <span class="a-icon">{a.icon}</span>
        <span class="a-body">
          <span class="a-head">
            <b>{a.name}</b>
            <span class="a-tier num" data-tier={cur}>{cur > 0 ? TIER_NAMES[cur - 1] : '—'} · {cur}/{a.tiers.length}</span>
          </span>
          {#if next}
            <span class="a-bar"><span class="a-fill" style:width={`${frac * 100}%`}></span></span>
            <span class="a-meta num">
              {a.format(value)} / {a.format(next.threshold)} → {TIER_NAMES[cur]}: {rewardText(next.rewards)}
            </span>
          {:else}
            <span class="a-meta num done">★ Legendär abgeschlossen — {a.format(value)}</span>
          {/if}
        </span>
      </li>
    {/each}
  </ul>
</Overlay>

<style>
  .hint {
    font-size: 0.78rem;
    color: var(--c-cloud);
    line-height: 1.4;
    margin: 2px 0 8px;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ach {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 7px 9px;
    background: var(--c-night1);
    border: 1px solid var(--c-edge);
    border-left: 3px solid var(--c-steel);
  }

  .ach.maxed {
    border-left-color: var(--c-gold1);
  }

  .a-icon {
    font-size: 1.25rem;
    line-height: 1.1;
    flex: none;
  }

  .a-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }

  .a-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.84rem;
    color: var(--c-white);
  }

  .a-tier {
    flex: none;
    font-size: 0.7rem;
    color: var(--c-gold2);
  }

  .a-bar {
    height: 6px;
    background: var(--c-night0);
    border: 1px solid var(--c-edge);
    overflow: hidden;
  }

  .a-fill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--c-gold0), var(--c-gold2));
  }

  .a-meta {
    font-size: 0.68rem;
    color: var(--c-mist);
    line-height: 1.3;
  }

  .a-meta.done {
    color: var(--c-gold2);
  }
</style>
