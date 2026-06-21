<script lang="ts">
  import PixelIcon from './PixelIcon.svelte'
  import { DECORATIONS } from '../data/decorations'
  import { decorationCount } from '../game/decorations'
  import { gameStore } from '../game/state'
  import { spriteUrl } from './pixel/render'

  // PHASE 50: decorations are landscaped INTO the background — scattered across
  // the ground with depth (closer = lower + larger), so buying them genuinely
  // dresses the scene instead of stacking an ugly shelf above the field.
  const hash = (n: number) => {
    const x = Math.sin(n * 127.1 + 11.7) * 43758.5453
    return x - Math.floor(x) // 0..1, stable per index
  }
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

  type Placed = { key: string; sprite: string; left: number; top: number; size: number; z: number; dim: number }

  const placements = $derived.by<Placed[]>(() => {
    // round-robin over kinds so copies interleave across the width (organic mix)
    const counts = DECORATIONS.map((d) => decorationCount($gameStore, d.id))
    const items: typeof DECORATIONS = []
    const maxRound = Math.max(0, ...counts)
    for (let round = 0; round < maxRound; round++) {
      DECORATIONS.forEach((d, di) => {
        if (round < counts[di]) items.push(d)
      })
    }
    const n = items.length
    if (n === 0) return []
    return items.map((d, i) => {
      const h1 = hash(i * 2 + 1)
      const h2 = hash(i * 2 + 5)
      // even horizontal spread (so they never pile up) plus a little jitter
      const baseX = ((i + 0.5) / n) * 92 + 4
      const left = clamp(baseX + (h1 - 0.5) * 14, 1, 97)
      // ground depth band 70%..92% — deterministic per copy
      const top = 70 + h2 * 22
      const depth = (top - 70) / 22 // 0 (far) .. 1 (near)
      const size = Math.round((28 + depth * 40)) // 28px far → 68px near
      return { key: `${d.id}-${i}`, sprite: d.sprite, left, top, size, z: Math.round(top * 10), dim: 0.55 + depth * 0.45 }
    })
  })
</script>

<!-- Fixed night-garden backdrop: sky bands, stars, moon, parallax hedge
     silhouettes, ground, landscaped decorations and a soft vignette. -->
<div class="scene" aria-hidden="true">
  <div class="sky"></div>
  <div class="stars far"></div>
  <div class="stars near"></div>
  <span class="moon"><PixelIcon name="moon" scale={4} /></span>
  <div class="hedge far"></div>
  <div class="hedge near"></div>
  <div class="ground"></div>
  {#each placements as p (p.key)}
    <img
      class="px deco"
      src={spriteUrl(p.sprite)}
      style:left={`${p.left}%`}
      style:top={`${p.top}%`}
      style:width={`${p.size}px`}
      style:height={`${p.size}px`}
      style:z-index={p.z}
      style:opacity={p.dim}
      alt=""
    />
  {/each}
  <span class="fly" style="left: 18%; top: 58%; animation-duration: 3.2s"></span>
  <span class="fly" style="left: 41%; top: 66%; animation-duration: 4.4s"></span>
  <span class="fly" style="left: 67%; top: 61%; animation-duration: 3.8s"></span>
  <span class="fly" style="left: 86%; top: 70%; animation-duration: 5.1s"></span>
  <div class="vignette"></div>
</div>

<style>
  .scene {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .scene > * {
    position: absolute;
  }

  /* hard color bands instead of a smooth gradient — pixel sky */
  .sky {
    inset: 0;
    background: linear-gradient(
      180deg,
      var(--c-night0) 0%,
      var(--c-night0) 22%,
      var(--c-sky0) 22%,
      var(--c-sky0) 44%,
      var(--c-sky1) 44%,
      var(--c-sky1) 56%,
      var(--c-sky0) 56%,
      var(--c-sky0) 100%
    );
  }

  .stars {
    inset: 0 0 40% 0;
    background-image: var(--bg-stars);
    background-repeat: repeat;
    image-rendering: pixelated;
  }

  .stars.far {
    background-size: 192px 192px;
    opacity: 0.55;
  }

  .stars.near {
    background-size: 288px 288px;
    background-position: 70px 40px;
  }

  .moon {
    top: 6%;
    right: 9%;
    filter: drop-shadow(0 0 14px rgba(235, 237, 233, 0.3));
  }

  .hedge {
    left: 0;
    right: 0;
    image-rendering: pixelated;
    background-repeat: repeat-x, no-repeat;
    background-position: top, bottom;
  }

  .hedge.far {
    top: 54%;
    height: 8%;
    background-image: var(--sprite-hedge-far), linear-gradient(var(--c-night1), var(--c-night1));
    background-size:
      64px 32px,
      100% calc(100% - 32px);
  }

  .hedge.near {
    top: 58%;
    height: 12%;
    background-image: var(--sprite-hedge-near), linear-gradient(var(--c-leaf0), var(--c-leaf0));
    background-size:
      96px 48px,
      100% calc(100% - 48px);
  }

  .ground {
    top: 70%;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(180deg, var(--c-leaf0) 0%, #0d1610 35%, var(--c-night0) 100%);
  }

  /* PHASE 50: landscaped decorations — sit on the ground, anchored by their base,
     softly shadowed for depth. Positioned/scaled inline (see script). */
  .deco {
    image-rendering: pixelated;
    transform: translate(-50%, -100%);
    filter: drop-shadow(0 3px 3px rgba(5, 6, 12, 0.55));
  }

  /* firefly: a square pixel with a soft glow, gently pulsing */
  .fly {
    width: 4px;
    height: 4px;
    background: var(--c-leaf4);
    box-shadow: 0 0 8px 2px rgba(168, 202, 88, 0.55);
    animation: fly-pulse 4s ease-in-out infinite alternate;
    z-index: 950;
  }

  @keyframes fly-pulse {
    from {
      opacity: 0.15;
      transform: translateY(0);
    }
    to {
      opacity: 0.95;
      transform: translateY(-10px);
    }
  }

  .vignette {
    inset: 0;
    background: radial-gradient(120% 90% at 50% 38%, transparent 55%, rgba(5, 6, 12, 0.55) 100%);
    z-index: 1000;
  }
</style>
