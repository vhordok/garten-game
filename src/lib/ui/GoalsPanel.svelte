<script lang="ts">
  import { goalBoard, TIER_LABEL, type GoalTier } from '../game/goals'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import Overlay from './Overlay.svelte'

  let { onClose }: { onClose: () => void } = $props()

  const goals = $derived(goalBoard($gameStore))
  const TIERS: GoalTier[] = ['kurz', 'mittel', 'lang', 'endgame']
</script>

<Overlay title="Ziele — woran du als Nächstes arbeitest" {onClose}>
  <p class="hint">
    Immer mehrere sinnvolle nächste Schritte: von „nur noch dieses Upgrade" bis zum Endgame-Ziel.
    Belohnungen stehen direkt dabei.
  </p>

  {#each TIERS as tier (tier)}
    {@const list = goals.filter((g) => g.tier === tier)}
    {#if list.length > 0}
      <h3 class="tier">{TIER_LABEL[tier]}</h3>
      <ul class="goal-list">
        {#each list as g (g.id)}
          <li class="goal" class:ready={g.ready} class:chore={g.chore}>
            <span class="g-icon">{g.icon}</span>
            <span class="g-body">
              <span class="g-head">
                <b>{g.label}</b>
                {#if g.ready}<span class="g-ready">✓ bereit</span>{/if}
              </span>
              <span class="g-bar"><span class="g-fill" style:width={`${g.fraction * 100}%`}></span></span>
              <span class="g-meta num">
                {formatNumber(g.current)} / {formatNumber(g.target)} · {g.reward}
              </span>
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  {/each}

  {#if goals.length === 0}
    <p class="hint">Alles erreicht für den Moment — pflanze, ernte und prestige weiter!</p>
  {/if}
</Overlay>

<style>
  .hint {
    font-size: 0.78rem;
    color: var(--c-cloud);
    line-height: 1.4;
    margin: 2px 0 8px;
  }

  .tier {
    margin: 12px 0 6px;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-gold2);
  }

  .goal-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .goal {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 7px 9px;
    background: var(--c-night1);
    border: 1px solid var(--c-edge);
    border-left: 3px solid var(--c-steel);
  }

  .goal.ready {
    border-left-color: var(--c-leaf4);
  }

  /* PHASE 28: trivial "anytime" chores are visually quieter than real targets */
  .goal.chore {
    opacity: 0.7;
  }

  .g-icon {
    font-size: 1.2rem;
    line-height: 1.1;
    flex: none;
  }

  .g-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }

  .g-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    color: var(--c-white);
  }

  .g-ready {
    flex: none;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--c-leaf4);
  }

  .g-bar {
    height: 7px;
    background: var(--c-night0);
    border: 1px solid var(--c-edge);
    overflow: hidden;
  }

  .g-fill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--c-leaf2), var(--c-leaf4));
  }

  .goal.ready .g-fill {
    background: linear-gradient(90deg, var(--c-gold1), var(--c-gold2));
  }

  .g-meta {
    font-size: 0.7rem;
    color: var(--c-mist);
  }
</style>
