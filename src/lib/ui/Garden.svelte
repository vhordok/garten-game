<script lang="ts">
  import { CONFIG } from '../data/config'
  import { buyPlot, harvestAllReady, nextPlotCost } from '../game/actions'
  import { gameStore } from '../game/state'
  import { plotReady } from '../game/tick'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { coinBurst, leafBurst, legendaryBurst, perfectBurst } from './fx/particles'
  import { screenShake } from './fx/shake'
  import PixelIcon from './PixelIcon.svelte'
  import Plot from './Plot.svelte'

  const readyCount = $derived($gameStore.plots.filter(plotReady).length)
  const plotCost = $derived(nextPlotCost($gameStore))
  const canBuyMore = $derived($gameStore.plots.length < CONFIG.maxPlots)

  function eventCenter(e: MouseEvent): [number, number] {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    return [rect.left + rect.width / 2, rect.top + rect.height / 2]
  }

  function handleHarvestAll(e: MouseEvent) {
    const { units, crit } = harvestAllReady()
    if (units > 0) {
      const [cx, cy] = eventCenter(e)
      if (crit === 'legendary') {
        legendaryBurst(cx, cy)
        playSound('legendary')
        screenShake(1.4)
      } else if (crit === 'perfect') {
        perfectBurst(cx, cy)
        playSound('perfect')
        screenShake(0.6)
      } else {
        coinBurst(cx, cy, Math.min(10 + units * 2, 40))
        playSound('harvest')
        screenShake(0.5)
      }
    }
  }

  function handleBuyPlot(e: MouseEvent) {
    const [cx, cy] = eventCenter(e)
    if (buyPlot()) {
      leafBurst(cx, cy, 16)
      playSound('buy')
      screenShake(0.8)
    }
  }
</script>

<section class="garden" aria-label="Dein Garten">
  <div class="garden-head">
    <span class="chip num">Beete {$gameStore.plots.length}/{CONFIG.maxPlots}</span>
    <button
      class="pxbtn primary"
      class:attention={readyCount > 0}
      disabled={readyCount === 0}
      onclick={handleHarvestAll}
    >
      <PixelIcon name="basket" scale={2} />
      Alle ernten{readyCount > 0 ? ` (${readyCount})` : ''}
    </button>
  </div>

  <div class="grid">
    {#each $gameStore.plots as plot, index (index)}
      <Plot {plot} {index} selectedId={$gameStore.selectedPlantId} money={$gameStore.money} />
    {/each}
    {#if canBuyMore}
      <button
        class="ghost num"
        disabled={$gameStore.money < plotCost}
        onclick={handleBuyPlot}
        title="Neues Beet anlegen"
      >
        <PixelIcon name="plus" scale={2} />
        <span class="ghost-cost">
          <PixelIcon name="coin" scale={1} />
          {formatNumber(plotCost)}
        </span>
      </button>
    {/if}
  </div>

  {#if !canBuyMore}
    <p class="hint full-note">Alle {CONFIG.maxPlots} Beete angelegt — mehr Platz gibt es später mit neuen Parzellen.</p>
  {/if}
</section>

<style>
  .garden {
    width: calc(4 * var(--cell) + 3 * 14px);
    max-width: 100%;
  }

  .garden-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
  }

  .garden-head .chip {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--c-mist);
    padding: 2px 8px;
  }

  .attention {
    animation: attention 1.5s ease-in-out infinite;
  }

  @keyframes attention {
    50% {
      box-shadow: 0 0 14px rgba(117, 167, 67, 0.65);
    }
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, var(--cell));
    gap: 14px;
    justify-content: center;
  }

  .ghost {
    width: var(--cell);
    height: var(--cell);
    background-image: var(--sprite-ghost-plot);
    background-size: 100% 100%;
    image-rendering: pixelated;
    background-color: rgba(16, 20, 31, 0.45);
    border: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    padding: 0;
    transition: filter 0.1s;
  }

  .ghost:hover:not(:disabled) {
    filter: brightness(1.4);
  }

  .ghost:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ghost-cost {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--c-gold2);
  }

  .full-note {
    text-align: center;
  }
</style>
