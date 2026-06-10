<script lang="ts">
  import { CONFIG } from '../data/config'
  import { buyPlot, harvestAllReady, nextPlotCost } from '../game/actions'
  import { gameStore } from '../game/state'
  import { plotReady } from '../game/tick'
  import { formatNumber } from '../util/format'
  import Plot from './Plot.svelte'

  const readyCount = $derived($gameStore.plots.filter(plotReady).length)
  const plotCost = $derived(nextPlotCost($gameStore))
  const canBuyMore = $derived($gameStore.plots.length < CONFIG.maxPlots)
</script>

<div class="garden card">
  <div class="garden-head">
    <h2>🏡 Dein Garten</h2>
    <button class="btn small" disabled={readyCount === 0} onclick={() => harvestAllReady()}>
      🧺 Alle ernten{readyCount > 0 ? ` (${readyCount})` : ''}
    </button>
  </div>

  <div class="grid">
    {#each $gameStore.plots as plot, index (index)}
      <Plot {plot} {index} selectedId={$gameStore.selectedPlantId} money={$gameStore.money} />
    {/each}
    {#if canBuyMore}
      <button
        class="ghost"
        disabled={$gameStore.money < plotCost}
        onclick={() => buyPlot()}
        title="Neues Beet anlegen"
      >
        <span class="ghost-plus">＋</span>
        <span class="ghost-label">Beet kaufen</span>
        <span class="ghost-cost">🪙 {formatNumber(plotCost)}</span>
      </button>
    {/if}
  </div>

  {#if !canBuyMore}
    <p class="hint">Alle {CONFIG.maxPlots} Beete angelegt — mehr Platz gibt es später mit neuen Parzellen.</p>
  {/if}
</div>

<style>
  .garden-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 14px;
    margin-top: 14px;
  }

  .ghost {
    aspect-ratio: 1;
    border-radius: 16px;
    border: 2px dashed #a89868;
    background: rgba(243, 236, 212, 0.25);
    color: #7d7350;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s,
      color 0.15s;
  }

  .ghost:hover:not(:disabled) {
    background: #f7f0d9;
    border-color: var(--green-600);
    color: var(--green-800);
  }

  .ghost:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .ghost-plus {
    font-size: 1.4rem;
    line-height: 1;
  }

  .ghost-label {
    font-size: 0.72rem;
    font-weight: 700;
  }

  .ghost-cost {
    font-size: 0.78rem;
    font-weight: 700;
  }
</style>
