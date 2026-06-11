<script lang="ts">
  import { plantById } from '../data/plants'
  import { harvestPlot, sowPlot, waterPlot, type CritTier } from '../game/actions'
  import type { PlotState } from '../game/types'
  import { formatDuration } from '../util/format'
  import { playSound } from './fx/audio'
  import { celebrateLevelUps } from './fx/celebrate'
  import { coinBurst, leafBurst, legendaryBurst, perfectBurst, waterBurst } from './fx/particles'
  import { screenShake } from './fx/shake'
  import { spriteUrl } from './pixel/render'

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

  // four visible growth stages: shared seedling, then per-plant sprites 1–3
  const stageSprite = $derived(
    def === undefined
      ? null
      : ready
        ? `${def.id}-3`
        : fraction < 1 / 3
          ? 'seedling'
          : fraction < 2 / 3
            ? `${def.id}-1`
            : `${def.id}-2`
  )

  const selectedDef = $derived(plantById(selectedId))
  const canSow = $derived(!def && selectedDef !== undefined && money >= selectedDef.seedCost)

  interface Floater {
    id: number
    text: string
    kind: 'gain' | 'spend' | 'perfect' | 'legendary' | 'water'
  }

  let floaters = $state<Floater[]>([])
  let floaterId = 0

  function spawnFloater(text: string, kind: Floater['kind']) {
    const id = ++floaterId
    floaters = [...floaters, { id, text, kind }]
    setTimeout(() => {
      floaters = floaters.filter((f) => f.id !== id)
    }, 1100)
  }

  function harvestFx(cx: number, cy: number, units: number, crit: CritTier) {
    if (crit === 'legendary') {
      spawnFloater(`+${units} ✦LEGENDÄR✦`, 'legendary')
      legendaryBurst(cx, cy)
      playSound('legendary')
      screenShake(1.4)
    } else if (crit === 'perfect') {
      spawnFloater(`+${units} ✦`, 'perfect')
      perfectBurst(cx, cy)
      playSound('perfect')
    } else {
      spawnFloater(`+${units}`, 'gain')
      coinBurst(cx, cy, 10 + units * 2)
      playSound('harvest')
    }
  }

  function handleClick(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    if (def && ready) {
      const { units, crit, levelUps } = harvestPlot(index)
      if (units > 0) {
        harvestFx(cx, cy, units, crit)
        celebrateLevelUps(levelUps, cx, cy)
      }
    } else if (def && !ready) {
      if (waterPlot(index)) {
        spawnFloater('Wachstum!', 'water')
        waterBurst(cx, cy)
        playSound('water')
      }
    } else if (!def && selectedDef) {
      const cost = selectedDef.seedCost
      if (sowPlot(index)) {
        spawnFloater(`-${cost}`, 'spend')
        leafBurst(cx, cy)
        playSound('sow')
      } else {
        playSound('error')
      }
    }
  }

  const title = $derived(
    def && ready
      ? `${def.name} ernten`
      : def
        ? `${def.name} — reif in ${formatDuration(remaining)}` +
          (plot.waterLeft > 0 ? ` · Klick = gießen (${plot.waterLeft}× übrig)` : '')
        : canSow && selectedDef
          ? `${selectedDef.name} säen (${selectedDef.seedCost})`
          : 'Leeres Beet'
  )
</script>

<button
  class="plot"
  class:ready
  class:growing={def && !ready}
  class:can-water={def && !ready && plot.waterLeft > 0}
  class:empty={!def}
  class:can-sow={canSow}
  onclick={handleClick}
  {title}
  aria-label={title}
>
  {#if stageSprite}
    {#key stageSprite}
      <img class="px plant" class:ripe={ready} src={spriteUrl(stageSprite)} alt="" draggable="false" />
    {/key}
    {#if ready}
      <span class="ready-tag">Ernten!</span>
    {:else}
      <span class="timer chip num">{formatDuration(remaining)}</span>
      {#if plot.waterLeft > 0}
        <span class="drops" aria-hidden="true">
          {#each Array(plot.waterLeft) as _, i (i)}
            <i></i>
          {/each}
        </span>
      {/if}
      <div class="bar">
        <div class="bar-fill" style:width={`${Math.round(fraction * 100)}%`}></div>
      </div>
    {/if}
  {:else if selectedDef}
    <img class="px sow-ghost" src={spriteUrl(`${selectedDef.id}-3`)} alt="" draggable="false" />
  {/if}
  {#each floaters as floater (floater.id)}
    <span class="floater num {floater.kind}">{floater.text}</span>
  {/each}
</button>

<style>
  .plot {
    position: relative;
    width: var(--cell);
    height: var(--cell);
    border: none;
    padding: 0;
    background: var(--sprite-soil);
    background-size: 100% 100%;
    image-rendering: pixelated;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition:
      transform 0.1s ease,
      filter 0.1s ease;
  }

  .plot:hover {
    transform: translateY(-2px);
    filter: brightness(1.15);
  }

  .plot.growing {
    cursor: default;
  }

  .plot.can-water {
    cursor: pointer;
  }

  /* remaining watering charges */
  .drops {
    position: absolute;
    top: 5px;
    left: 5px;
    display: flex;
    gap: 3px;
  }

  .drops i {
    width: 5px;
    height: 5px;
    background: var(--c-blue2);
    box-shadow: 0 0 4px rgba(115, 190, 211, 0.7);
  }

  .plot.empty:not(.can-sow) {
    cursor: not-allowed;
  }

  .plant {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform-origin: 50% 82%;
    animation: pop 0.2s ease-out;
  }

  .plant.ripe {
    filter: drop-shadow(0 0 7px rgba(168, 202, 88, 0.75));
    animation:
      pop 0.2s ease-out,
      bob 1s steps(2) 0.2s infinite;
  }

  @keyframes pop {
    0% {
      transform: scale(0.55);
    }
    70% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes bob {
    50% {
      transform: translateY(-3px);
    }
  }

  .plot.ready {
    filter: brightness(1.08);
  }

  .timer {
    position: absolute;
    top: 4px;
    right: 4px;
    font-size: 0.62rem;
    color: var(--c-cloud);
    padding: 0 4px;
  }

  .bar {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 6px;
    height: 7px;
    background: var(--c-night0);
    border: 1px solid var(--c-edge);
  }

  .bar-fill {
    height: 100%;
    background: linear-gradient(180deg, var(--c-leaf4), var(--c-leaf3));
  }

  .ready-tag {
    position: absolute;
    bottom: 5px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.58rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--c-night0);
    background: var(--c-leaf4);
    padding: 1px 5px;
    box-shadow: 0 0 8px rgba(168, 202, 88, 0.6);
  }

  .sow-ghost {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0.16;
    transition: opacity 0.12s;
  }

  .plot.can-sow:hover .sow-ghost {
    opacity: 0.55;
  }

  .plot.empty:not(.can-sow):hover .sow-ghost {
    opacity: 0.25;
  }

  .floater {
    position: absolute;
    top: 2px;
    left: 50%;
    translate: -50% 0;
    pointer-events: none;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--c-gold2);
    text-shadow:
      1px 1px 0 var(--c-night0),
      0 0 8px rgba(222, 158, 65, 0.5);
    white-space: nowrap;
    animation: float-up 0.9s ease-out forwards;
  }

  .floater.spend {
    color: var(--c-red1);
    text-shadow:
      1px 1px 0 var(--c-night0),
      0 0 8px rgba(207, 87, 60, 0.45);
  }

  .floater.perfect {
    font-size: 1.05rem;
    color: var(--c-gold2);
    text-shadow:
      1px 1px 0 var(--c-night0),
      0 0 12px rgba(232, 193, 112, 0.9);
  }

  .floater.legendary {
    font-size: 1.15rem;
    color: var(--c-plum3);
    text-shadow:
      1px 1px 0 var(--c-night0),
      0 0 14px rgba(198, 81, 151, 0.95);
    animation-duration: 1.1s;
  }

  .floater.water {
    font-size: 0.78rem;
    color: var(--c-blue2);
    text-shadow:
      1px 1px 0 var(--c-night0),
      0 0 8px rgba(115, 190, 211, 0.6);
  }

  @keyframes float-up {
    to {
      opacity: 0;
      transform: translateY(-26px);
    }
  }
</style>
