<script lang="ts">
  import { plantById } from '../data/plants'
  import { harvestPlot, sowPlot } from '../game/actions'
  import type { PlotState } from '../game/types'
  import { formatDuration } from '../util/format'

  let {
    plot,
    index,
    selectedId,
    money,
  }: { plot: PlotState; index: number; selectedId: string; money: number } = $props()

  const def = $derived(plot.plantId !== null ? plantById(plot.plantId) : undefined)
  const ready = $derived(def !== undefined && plot.progress >= def.growTime)
  const fraction = $derived(def ? Math.min(plot.progress / def.growTime, 1) : 0)
  const remaining = $derived(def ? Math.max(def.growTime - plot.progress, 0) : 0)

  const selectedDef = $derived(plantById(selectedId))
  const canSow = $derived(!def && selectedDef !== undefined && money >= selectedDef.seedCost)

  interface Floater {
    id: number
    text: string
  }

  let floaters = $state<Floater[]>([])
  let floaterId = 0

  function spawnFloater(text: string) {
    const id = ++floaterId
    floaters = [...floaters, { id, text }]
    setTimeout(() => {
      floaters = floaters.filter((f) => f.id !== id)
    }, 900)
  }

  function handleClick() {
    if (def && ready) {
      const emoji = def.emoji
      const units = harvestPlot(index)
      if (units > 0) spawnFloater(`+${units} ${emoji}`)
    } else if (!def && selectedDef) {
      const cost = selectedDef.seedCost
      if (sowPlot(index)) spawnFloater(`-${cost} 🪙`)
    }
  }

  const title = $derived(
    def && ready
      ? `${def.name} ernten`
      : def
        ? `${def.name} — reif in ${formatDuration(remaining)}`
        : canSow && selectedDef
          ? `${selectedDef.name} säen (🪙 ${selectedDef.seedCost})`
          : 'Leeres Beet'
  )
</script>

<button
  class="plot"
  class:ready
  class:growing={def && !ready}
  class:empty={!def}
  class:can-sow={canSow}
  onclick={handleClick}
  {title}
  aria-label={title}
>
  {#if def}
    {#if ready}
      <span class="plant ready-bounce">{def.emoji}</span>
      <span class="harvest-hint">Ernten!</span>
    {:else}
      <span class="plant sprout" style:transform={`scale(${0.55 + fraction * 0.55})`}>🌱</span>
      <span class="timer">{formatDuration(remaining)}</span>
      <div class="bar">
        <div class="bar-fill" style:width={`${fraction * 100}%`}></div>
      </div>
    {/if}
  {:else}
    <span class="sow-ghost">{selectedDef?.emoji ?? '🌱'}</span>
  {/if}
  {#each floaters as floater (floater.id)}
    <span class="floater">{floater.text}</span>
  {/each}
</button>

<style>
  .plot {
    position: relative;
    aspect-ratio: 1;
    width: 100%;
    border: none;
    border-radius: 16px;
    background: radial-gradient(circle at 32% 28%, var(--soil-light) 0%, var(--soil) 55%, var(--soil-dark) 100%);
    box-shadow:
      inset 0 4px 10px rgba(0, 0, 0, 0.24),
      inset 0 -2px 4px rgba(255, 255, 255, 0.08),
      0 2px 4px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 2.1rem;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition:
      transform 0.12s ease,
      box-shadow 0.2s ease;
  }

  .plot:hover {
    transform: translateY(-2px);
  }

  .plot.growing {
    cursor: default;
  }

  .plot.empty:not(.can-sow) {
    cursor: not-allowed;
  }

  .plot.ready {
    box-shadow:
      inset 0 4px 10px rgba(0, 0, 0, 0.18),
      0 0 0 3px #7ec96f,
      0 0 18px rgba(126, 201, 111, 0.55);
    animation: glow 1.6s ease-in-out infinite;
  }

  @keyframes glow {
    50% {
      box-shadow:
        inset 0 4px 10px rgba(0, 0, 0, 0.18),
        0 0 0 3px #98dd8a,
        0 0 26px rgba(143, 214, 128, 0.8);
    }
  }

  .plant {
    line-height: 1;
    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.2));
  }

  .sprout {
    font-size: 1.9rem;
    transition: transform 0.4s linear;
  }

  .ready-bounce {
    font-size: 2.2rem;
    animation: bounce 1.1s ease-in-out infinite;
  }

  @keyframes bounce {
    50% {
      transform: translateY(-5px) scale(1.07);
    }
  }

  .timer {
    position: absolute;
    top: 7px;
    right: 7px;
    font-size: 0.6rem;
    font-weight: 700;
    background: rgba(0, 0, 0, 0.32);
    color: #fff;
    padding: 2px 6px;
    border-radius: 8px;
    letter-spacing: 0.3px;
  }

  .bar {
    position: absolute;
    left: 10%;
    right: 10%;
    bottom: 7px;
    height: 6px;
    background: rgba(0, 0, 0, 0.28);
    border-radius: 4px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #b8e986, #5cb85c);
    border-radius: 4px;
  }

  .harvest-hint {
    position: absolute;
    bottom: 7px;
    font-size: 0.6rem;
    font-weight: 800;
    color: #f0ffe5;
    background: rgba(31, 82, 38, 0.78);
    padding: 2px 8px;
    border-radius: 8px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }

  .sow-ghost {
    opacity: 0.18;
    font-size: 1.7rem;
    transition: opacity 0.15s;
    filter: grayscale(0.4);
  }

  .plot.empty:hover .sow-ghost {
    opacity: 0.6;
  }

  .plot.empty:not(.can-sow):hover .sow-ghost {
    opacity: 0.28;
  }

  .floater {
    position: absolute;
    top: 4px;
    left: 50%;
    translate: -50% 0;
    pointer-events: none;
    font-size: 0.85rem;
    font-weight: 800;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.65);
    white-space: nowrap;
    animation: float-up 0.9s ease-out forwards;
  }

  @keyframes float-up {
    to {
      opacity: 0;
      transform: translateY(-30px);
    }
  }
</style>
