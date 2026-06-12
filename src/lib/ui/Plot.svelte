<script lang="ts">
  import { plantById } from '../data/plants'
  import { clearPlot, harvestPlot, sowPlot, waterPlot, type CritTier } from '../game/actions'
  import { gameStore } from '../game/state'
  import { cycleTime } from '../game/tick'
  import type { PlotState } from '../game/types'
  import { formatDuration } from '../util/format'
  import { playSound } from './fx/audio'
  import { celebrateLevelUps } from './fx/celebrate'
  import { coinBurst, leafBurst, legendaryBurst, perfectBurst, waterBurst } from './fx/particles'
  import { screenShake } from './fx/shake'
  import { spriteUrl } from './pixel/render'
  import { pushToast } from './toasts'

  let {
    plot,
    index,
    selectedId,
    money,
  }: { plot: PlotState; index: number; selectedId: string; money: number } = $props()

  const def = $derived(plot.plantId !== null ? plantById(plot.plantId) : undefined)
  const target = $derived(def ? cycleTime(plot, def) : 0)
  const grown = $derived(def !== undefined && plot.progress >= target)
  // ornamentals never become harvestable — they just stand and shine
  const mature = $derived(grown && def?.beautyBonus !== undefined)
  const ready = $derived(grown && def?.beautyBonus === undefined)
  const fraction = $derived(def ? Math.min(plot.progress / target, 1) : 0)
  const remaining = $derived(def ? Math.max(target - plot.progress, 0) : 0)

  // four visible growth stages: shared seedling, then per-plant sprites 1–3.
  // Regrowing berries/trees never shrink back below stage 1.
  const stageSprite = $derived(
    def === undefined
      ? null
      : grown
        ? `${def.id}-3`
        : fraction < 1 / 3
          ? plot.regrowing
            ? `${def.id}-1`
            : 'seedling'
          : fraction < 2 / 3
            ? `${def.id}-1`
            : `${def.id}-2`
  )

  const selectedDef = $derived(plantById(selectedId))
  const canSow = $derived(!def && selectedDef !== undefined && money >= selectedDef.seedCost)

  // soft pling when a crop turns harvestable (baseline run stays silent,
  // the audio layer throttles batches into a single pling)
  let wasReady: boolean | null = null
  $effect(() => {
    if (wasReady !== null && ready && !wasReady) playSound('ripe')
    wasReady = ready
  })

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

  function harvestFx(cx: number, cy: number, units: number, crit: CritTier, comboPitch: number) {
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
      playSound('harvest', comboPitch)
    }
  }

  function handleClick(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    if (def && e.shiftKey) {
      if (clearPlot(index)) {
        leafBurst(cx, cy, 8)
        playSound('close')
      }
      return
    }
    if (mature) return
    if (def && ready) {
      // read the chain BEFORE harvesting: every link nudges the pitch up
      const comboPitch = 1 + Math.min($gameStore.combo.count, 20) * 0.035
      const { units, crit, levelUps, tickets } = harvestPlot(index)
      if (units > 0) {
        harvestFx(cx, cy, units, crit, comboPitch)
        celebrateLevelUps(levelUps, cx, cy)
        if (tickets > 0) {
          pushToast('Ein Rubbellos lag in der Ernte — oben im HUD rubbeln!', '🎟️', 7000)
          playSound('ticket')
        }
      }
    } else if (def && !grown) {
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
    mature && def
      ? `${def.name} — verschönert den Garten: +${Math.round((def.beautyBonus ?? 0) * 100)} % Verkaufspreis · Shift-Klick: roden`
      : def && ready
        ? `${def.name} ernten${def.regrowTime ? ' — wächst danach von selbst nach' : ''}`
        : def
          ? `${def.name} — reif in ${formatDuration(remaining)}` +
            (plot.waterLeft > 0 ? ` · Klick = gießen (${plot.waterLeft}× übrig)` : '') +
            ' · Shift-Klick: roden'
          : canSow && selectedDef
            ? `${selectedDef.name} säen (${selectedDef.seedCost})`
            : 'Leeres Beet'
  )
</script>

<button
  class="plot"
  class:ready
  class:mature
  class:growing={def && !grown}
  class:can-water={def && !grown && plot.waterLeft > 0}
  class:empty={!def}
  class:can-sow={canSow}
  onclick={handleClick}
  {title}
  aria-label={title}
>
  {#if stageSprite}
    {#key stageSprite}
      <img
        class="px plant"
        class:ripe={ready}
        class:beauty={mature}
        src={spriteUrl(stageSprite)}
        alt=""
        draggable="false"
      />
    {/key}
    {#if mature && def}
      <span class="beauty-tag num">+{Math.round((def.beautyBonus ?? 0) * 100)} %</span>
    {:else if ready}
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

  .plant.beauty {
    filter: drop-shadow(0 0 8px rgba(223, 132, 165, 0.7));
  }

  .plot.mature {
    cursor: default;
  }

  .beauty-tag {
    position: absolute;
    bottom: 5px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.58rem;
    font-weight: 700;
    color: var(--c-night0);
    background: var(--c-plum3);
    padding: 1px 5px;
    box-shadow: 0 0 8px rgba(223, 132, 165, 0.6);
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
