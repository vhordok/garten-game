<script lang="ts">
  import { buyPlot, clearAllPlots, harvestAllReady, maxPlots, nextPlotCost, restorePlots, setAutoSowPlant, sowAllEmpty, waterAllGrowing } from '../game/actions'
  import { autoSowRate } from '../game/modifiers'
  import { plantById } from '../data/plants'
  import { gameStore } from '../game/state'
  import { plotReady } from '../game/tick'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { celebrateLevelUps } from './fx/celebrate'
  import { coinBurst, leafBurst, legendaryBurst, perfectBurst, waterBurst } from './fx/particles'
  import { screenShake } from './fx/shake'
  import PixelIcon from './PixelIcon.svelte'
  import Plot from './Plot.svelte'
  import { pushToast } from './toasts'

  // PHASE 1: tap-to-clear mode — the touch-friendly way to free plots
  let clearMode = $state(false)

  // PHASE 11: bulk-clear with a short undo instead of per-plot confirms
  let undo = $state<ReturnType<typeof clearAllPlots> | null>(null)
  let undoTimer: ReturnType<typeof setTimeout> | undefined

  const plantedCount = $derived($gameStore.plots.filter((p) => p.plantId !== null).length)
  const readyCount = $derived($gameStore.plots.filter(plotReady).length)
  const emptyCount = $derived($gameStore.plots.filter((p) => p.plantId === null).length)
  const waterableCount = $derived(
    $gameStore.plots.filter((p) => p.plantId !== null && p.waterLeft > 0 && !plotReady(p)).length
  )
  const plotCost = $derived(nextPlotCost($gameStore))
  const canBuyMore = $derived($gameStore.plots.length < maxPlots($gameStore))

  // PHASE 3: the Sä-Gnom can sow a pinned plant instead of the hand selection,
  // so manual picking never hijacks the automation. Control only shows once
  // the gnome exists.
  const gnomeOwned = $derived(autoSowRate($gameStore) > 0)
  const autoSowPinned = $derived($gameStore.autoSowPlantId)
  const autoSowLabel = $derived(
    autoSowPinned ? (plantById(autoSowPinned)?.name ?? 'Auswahl') : 'Auswahl'
  )
  // roughly square field, 4–7 columns depending on plot count
  const tileCount = $derived($gameStore.plots.length + (canBuyMore ? 1 : 0))
  const cols = $derived(Math.min(Math.max(4, Math.ceil(Math.sqrt(tileCount))), 7))

  function eventCenter(e: MouseEvent): [number, number] {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    return [rect.left + rect.width / 2, rect.top + rect.height / 2]
  }

  function handleHarvestAll(e: MouseEvent) {
    const comboPitch = 1 + Math.min($gameStore.combo.count, 20) * 0.035
    const { units, crit, levelUps, tickets } = harvestAllReady()
    if (units > 0) {
      const [cx, cy] = eventCenter(e)
      celebrateLevelUps(levelUps, cx, cy)
      if (tickets > 0) {
        pushToast(
          tickets === 1
            ? 'Ein Rubbellos lag in der Ernte — oben im HUD rubbeln!'
            : `${tickets} Rubbellose lagen in der Ernte!`,
          '🎟️',
          7000
        )
        playSound('ticket')
      }
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
        playSound('harvest', comboPitch)
        screenShake(0.5)
      }
    }
  }

  function handleSowAll(e: MouseEvent) {
    const count = sowAllEmpty()
    if (count > 0) {
      const [cx, cy] = eventCenter(e)
      leafBurst(cx, cy, Math.min(8 + count * 2, 24))
      playSound('sow')
    } else {
      playSound('error')
    }
  }

  function handleWaterAll(e: MouseEvent) {
    const count = waterAllGrowing()
    if (count > 0) {
      const [cx, cy] = eventCenter(e)
      waterBurst(cx, cy)
      playSound('water')
    } else {
      playSound('error')
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

  function handleClearAll(e: MouseEvent) {
    const res = clearAllPlots()
    if (res.count > 0) {
      const [cx, cy] = eventCenter(e)
      leafBurst(cx, cy, Math.min(8 + res.count * 2, 30))
      playSound('close')
      undo = res
      clearTimeout(undoTimer)
      undoTimer = setTimeout(() => (undo = null), 8000)
    } else {
      playSound('error')
    }
  }

  function handleUndo() {
    if (undo && restorePlots(undo.cleared, undo.refund)) playSound('sow')
    undo = null
    clearTimeout(undoTimer)
  }
</script>

<section class="garden" aria-label="Dein Garten">
  <div class="garden-head">
    <span class="chip num">Beete {$gameStore.plots.length}/{maxPlots($gameStore)}</span>
    <button class="pxbtn small" disabled={emptyCount === 0} onclick={handleSowAll} title="Gewählte Sorte auf alle leeren Beete säen">
      Alle säen{emptyCount > 0 ? ` (${emptyCount})` : ''}
    </button>
    <button class="pxbtn small" disabled={waterableCount === 0} onclick={handleWaterAll} title="Eine Gieß-Ladung auf jedes wachsende Beet">
      Alle gießen{waterableCount > 0 ? ` (${waterableCount})` : ''}
    </button>
    <button
      class="pxbtn small"
      class:danger={clearMode}
      onclick={() => {
        clearMode = !clearMode
        playSound('click')
      }}
      title="Roden-Modus: Beet antippen, um die Pflanze zu entfernen — 50 % Saatpreis zurück"
    >
      Roden{clearMode ? ': AN' : ''}
    </button>
    <button
      class="pxbtn small"
      disabled={plantedCount === 0}
      onclick={handleClearAll}
      title="Alle bepflanzten Beete auf einmal roden — 50 % Saatpreis zurück, kurz rückgängig machbar"
    >
      Alles roden{plantedCount > 0 ? ` (${plantedCount})` : ''}
    </button>
    {#if gnomeOwned}
      <button
        class="pxbtn small"
        class:gold={autoSowPinned}
        onclick={() => {
          setAutoSowPlant(autoSowPinned ? null : $gameStore.selectedPlantId)
          playSound('click')
        }}
        title={autoSowPinned
          ? `Sä-Gnom sät fest „${autoSowLabel}“ — antippen, um wieder deiner Auswahl zu folgen`
          : 'Sä-Gnom folgt deiner Auswahl — antippen, um die aktuelle Sorte fest zu pinnen'}
      >
        Auto-Saat: {autoSowLabel}{autoSowPinned ? ' 🔒' : ''}
      </button>
    {/if}
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

  {#if undo}
    <div class="undo-bar" role="status">
      <span class="num">{undo.count} {undo.count === 1 ? 'Pflanze' : 'Pflanzen'} gerodet · +{formatNumber(undo.refund)} Gold</span>
      <button class="pxbtn small gold" onclick={handleUndo}>Rückgängig</button>
    </div>
  {/if}

  <div class="grid" style:grid-template-columns={`repeat(${cols}, var(--cell))`}>
    {#each $gameStore.plots as plot, index (index)}
      <Plot {plot} {index} selectedId={$gameStore.selectedPlantId} money={$gameStore.money} {clearMode} />
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
    <p class="hint full-note">Alle {maxPlots($gameStore)} Beete dieser Parzelle angelegt.</p>
  {/if}
</section>

<style>
  .garden {
    width: fit-content;
    max-width: 100%;
  }

  .garden-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 14px;
  }

  .garden-head .chip {
    font-size: 0.8rem;
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

  .undo-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    margin: -4px 0 12px;
    padding: 6px 12px;
    background: rgba(16, 20, 31, 0.7);
    border: 2px solid var(--c-gold0);
    font-size: 0.82rem;
    color: var(--c-gold2);
  }
</style>
