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

  type Placed = { key: string; sprite: string; left: number; top: number; size: number; z: number; dim: number; glow: string; delay: number }

  // PHASE 52: a few decoration kinds glow at night — lanterns warm, water cool —
  // so the background reads as a living garden, not a flat picture.
  const glowOf = (sprite: string): string => {
    if (sprite === 'deco-laterne') return 'warm'
    if (sprite === 'deco-teich' || sprite === 'deco-vogelbad' || sprite === 'deco-springbrunnen') return 'cool'
    return ''
  }

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
      return {
        key: `${d.id}-${i}`,
        sprite: d.sprite,
        left,
        top,
        size,
        z: Math.round(top * 10),
        dim: 0.55 + depth * 0.45,
        glow: glowOf(d.sprite),
        delay: -(h1 * 4), // desync the idle bob
      }
    })
  })

  // PHASE 55: fireflies are drawn to the player's lanterns — owning Gartenlaternen
  // visibly attracts a little swarm, so the decoration feels functional. Two flies
  // hover around each lantern, at stable hashed offsets and desynced drift.
  type Fly = { key: string; left: number; top: number; dur: number; delay: number }
  const lanternFlies = $derived.by<Fly[]>(() => {
    const out: Fly[] = []
    placements
      .filter((p) => p.glow === 'warm')
      .forEach((p, li) => {
        for (let k = 0; k < 2; k++) {
          const h = hash(li * 7 + k * 3 + 2)
          out.push({
            key: `lf-${li}-${k}`,
            left: clamp(p.left + (h - 0.5) * 7, 0, 99),
            top: clamp(p.top - 3 - h * 5, 50, 95),
            dur: 3 + h * 3,
            delay: -h * 4,
          })
        }
      })
    return out
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
    <span class="deco-anchor" style:left={`${p.left}%`} style:top={`${p.top}%`} style:z-index={p.z} style:opacity={p.dim}>
      <img
        class="px deco"
        class:glow-warm={p.glow === 'warm'}
        class:glow-cool={p.glow === 'cool'}
        src={spriteUrl(p.sprite)}
        style:width={`${p.size}px`}
        style:height={`${p.size}px`}
        style:animation-delay={`${p.delay}s`}
        alt=""
      />
    </span>
  {/each}
  <span class="fly" style="left: 18%; top: 58%; animation-duration: 3.2s"></span>
  <span class="fly" style="left: 41%; top: 66%; animation-duration: 4.4s"></span>
  <span class="fly" style="left: 67%; top: 61%; animation-duration: 3.8s"></span>
  <span class="fly" style="left: 86%; top: 70%; animation-duration: 5.1s"></span>
  {#each lanternFlies as f (f.key)}
    <span
      class="fly lantern-fly"
      style:left={`${f.left}%`}
      style:top={`${f.top}%`}
      style:animation-duration={`${f.dur}s`}
      style:animation-delay={`${f.delay}s`}
    ></span>
  {/each}
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
     softly shadowed for depth. The anchor handles position/depth; the inner
     sprite handles the PHASE 52 idle bob + glow without fighting the anchor. */
  .deco-anchor {
    position: absolute;
    transform: translate(-50%, -100%);
    line-height: 0;
  }

  .deco {
    image-rendering: pixelated;
    filter: drop-shadow(0 3px 3px rgba(5, 6, 12, 0.55));
    animation: deco-bob 5.5s ease-in-out infinite alternate;
    will-change: transform;
  }

  /* warm lantern light + cool water shimmer — a gentle pulse so the night
     garden feels alive (PHASE 52) */
  .deco.glow-warm {
    animation: deco-bob 5.5s ease-in-out infinite alternate, glow-warm 3.4s ease-in-out infinite alternate;
  }

  .deco.glow-cool {
    animation: deco-bob 5.5s ease-in-out infinite alternate, glow-cool 4.6s ease-in-out infinite alternate;
  }

  @keyframes deco-bob {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(-2px);
    }
  }

  @keyframes glow-warm {
    from {
      filter: drop-shadow(0 3px 3px rgba(5, 6, 12, 0.55)) drop-shadow(0 0 3px rgba(232, 193, 112, 0.35));
    }
    to {
      filter: drop-shadow(0 3px 3px rgba(5, 6, 12, 0.55)) drop-shadow(0 0 9px rgba(232, 193, 112, 0.8));
    }
  }

  @keyframes glow-cool {
    from {
      filter: drop-shadow(0 3px 3px rgba(5, 6, 12, 0.55)) drop-shadow(0 0 2px rgba(115, 190, 211, 0.25));
    }
    to {
      filter: drop-shadow(0 3px 3px rgba(5, 6, 12, 0.55)) drop-shadow(0 0 7px rgba(115, 190, 211, 0.6));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .deco,
    .deco.glow-warm,
    .deco.glow-cool,
    .fly,
    .lantern-fly,
    .stars.far,
    .stars.near {
      animation: none;
    }
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
      transform: translate(0, 0);
    }
    to {
      opacity: 0.95;
      transform: translate(3px, -10px);
    }
  }

  /* PHASE 55: lantern fireflies — warm-toned, orbiting their lantern in a gentle
     loop so owning Gartenlaternen visibly draws a little swarm */
  .lantern-fly {
    background: var(--c-gold2);
    box-shadow: 0 0 9px 2px rgba(232, 193, 112, 0.7);
    animation: fly-orbit 5s ease-in-out infinite;
  }

  @keyframes fly-orbit {
    0% {
      opacity: 0.2;
      transform: translate(0, 0);
    }
    25% {
      opacity: 0.9;
      transform: translate(6px, -5px);
    }
    50% {
      opacity: 0.5;
      transform: translate(2px, -10px);
    }
    75% {
      opacity: 0.9;
      transform: translate(-5px, -5px);
    }
    100% {
      opacity: 0.2;
      transform: translate(0, 0);
    }
  }

  /* PHASE 55: a slow, subtle star twinkle over the two parallax layers */
  .stars.far {
    animation: twinkle-far 7s ease-in-out infinite alternate;
  }

  .stars.near {
    animation: twinkle-near 9s ease-in-out infinite alternate;
  }

  @keyframes twinkle-far {
    from {
      opacity: 0.4;
    }
    to {
      opacity: 0.65;
    }
  }

  @keyframes twinkle-near {
    from {
      opacity: 0.7;
    }
    to {
      opacity: 1;
    }
  }

  .vignette {
    inset: 0;
    background: radial-gradient(120% 90% at 50% 38%, transparent 55%, rgba(5, 6, 12, 0.55) 100%);
    z-index: 1000;
  }
</style>
